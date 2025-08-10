/**
 * Copyright (c) 1998-2019 Oracle NetSuite GBU, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Oracle NetSuite GBU, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Oracle NetSuite GBU.
 *
 * Module Description
 * Copy Order File, download files from SFTP Server, read files then create CSV files to import through CSV
 *
 * Version    Date          Author      Remarks
 * 1.00       Sep 15 2021   JCH         Initial version
 * 1.10       Nov 1 2021    P Ries      CSETD-11751 - updates, corrections
 * 1.20       Apr 15 2022   C LEE       CSETD-11424 - updates for SWADI
 *
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
 define(['N/file', 'N/runtime', 'N/search', 'N/record', 'N/task', 'N/email', '../_nscs/Libraries/NSUtilvSS2'],
 function (file, runtime, search, record, task, email, NSUtil, sftpUtil) {
     function getInputData() {

						 var arrFiles = [{"fileId":3285056,"path":"MFTP50274"},{"fileId":3285066,"path":"MFTP50279"}];
             
             log.debug('arrFiles', arrFiles);
             if (arrFiles) {
                 log.debug("Num results to process", arrFiles.length);
             } else {
                 log.debug("Num results to process", 0);
                 arrFiles = [];
             }

             return arrFiles;

/*
Not re-done
[{"fileId":3285047,"path":"MFTP50274"},{"fileId":3285048,"path":"MFTP50274"},{"fileId":3285049,"path":"MFTP50274"},{"fileId":3285050,"path":"MFTP50274"},{"fileId":3285051,"path":"MFTP50274"},{"fileId":3285052,"path":"MFTP50274"},{"fileId":3285053,"path":"MFTP50274"},{"fileId":3285054,"path":"MFTP50274"},{"fileId":3285055,"path":"MFTP50274"},{"fileId":3285057,"path":"MFTP50279"},{"fileId":3285058,"path":"MFTP50279"},{"fileId":3285059,"path":"MFTP50279"},{"fileId":3285060,"path":"MFTP50279"},{"fileId":3285061,"path":"MFTP50279"},{"fileId":3285062,"path":"MFTP50279"},{"fileId":3285063,"path":"MFTP50279"},{"fileId":3285064,"path":"MFTP50279"},{"fileId":3285065,"path":"MFTP50279"}]
*/
		 }

     function map(context) {
         let val = JSON.parse(context.value);
         log.debug('map', val);
         //create custom record per file pulled in, expected to pull in 4
         try {
             var fileId = val.fileId;
             var stageRecId = createStageRec(fileId);
             var valueObj = {
                 externalId: stageRecId,
                 path: val.path,
                 fileId: fileId
             };
             context.write(fileId, valueObj);

         } catch (error) {
             log.error("Error in map stage", error);
         }
     }

     function reduce(context) {
         //create csv file that will run through importer
         //TODO: Confirm max file size through this, check file size and save/import in parts
         try {

             let objPreferences = NSUtil.getPreferences([
                 'custrecord_nscs_copy_order_dl_folder',
                 'custrecord_cp_rimorder_vendor',
                 'custrecord_nscs_copy_order_csv_folder'
             ]);
             let folderId = parseInt(objPreferences['custrecord_nscs_copy_order_dl_folder'].value);
             let csvFolderId = parseInt(objPreferences['custrecord_nscs_copy_order_csv_folder'].value);
             
             var fileId = context.key;
             var valueObj = JSON.parse(context.values[0]);

             var dataObj = processFile(fileId);
             var itemObj = dataObj.itemObj;

             var stageRec = record.load({
                 type: "customrecord_nscs_copy_order_file_stage",
                 id: valueObj.externalId
             });

             var invoiceNumber = stageRec.getValue("custrecord_nscs_invoice_number");
             var location = stageRec.getValue("custrecord_nscs_location");
             let vendor = objPreferences['custrecord_cp_rimorder_vendor'].value;
             var originalFile = stageRec.getText("custrecord_nscs_order_file");
             var subsidiary = stageRec.getValue('custrecord_nscs_copy_order_adi');

             var headerObj = {
                 externalId: valueObj.externalId,
                 vendor: vendor,
                 invoiceNumber: invoiceNumber,
                 location: location,
                 poNumber: invoiceNumber,
                 subsidiary: subsidiary                // v1.10 added
             };

             var NSItemObj = getNSItems(itemObj);

             log.debug('NSItemObj', NSItemObj);
             log.debug('itemObj', itemObj);

             var csvFileId = createCSVFile(headerObj, itemObj, NSItemObj, csvFolderId);
             var tempObj = {};

             if (isEmpty(location)) {
                 tempObj["externalId"] = valueObj.externalId;
                 tempObj["status"] = 3;
                 tempObj["message"] = "Invalid Location Code";
                 tempObj["originalFile"] = originalFile;
                 tempObj["remotePath"] = valueObj.path;
                 tempObj["fileId"] = valueObj.fileId;
                 tempObj["fileName"] = valueObj.fileName;
             } else {
                 tempObj["externalId"] = valueObj.externalId;
                 tempObj["status"] = 1;
                 tempObj["message"] = "";
                 tempObj["originalFile"] = originalFile;
                 tempObj["fileId"] = valueObj.fileId;
                 tempObj["remotePath"] = valueObj.path;
                 tempObj["fileName"] = valueObj.fileName;
             }
             context.write(csvFileId, tempObj);
         } catch (error) {
             log.error("Error in reduce", error);
         }

     }

     //submit file into the csv importer
     function summarize(summary) {
         log.audit("Usage", summary.usage);
         let haserrors = errorWrapper(summary);
         try {
             //Remove all files that have been processed
             var arrFilesToRemove = [];
             summary.output.iterator().each(function (key, value) {


                 var valueObj = JSON.parse(value);
                 var originalFile = valueObj.originalFile;
                 if (!isEmpty(originalFile)) {
                     //arrFilesToRemove.push(originalFile); //does not delete error files
                     arrFilesToRemove.push({
                         'fileId': valueObj.fileId,
                         'path': valueObj.remotePath
                     });
                 }
                 //log.debug("arrFilesToRemove", arrFilesToRemove);

                 record.submitFields({
                     type: "customrecord_nscs_copy_order_file_stage",
                     id: valueObj.externalId,
                     values: {
                         custrecord_nscs_copy_order_status: valueObj.status, //Processed
                         custrecord_nscs_copy_order_error: valueObj.message,
                         custrecord_nscs_copy_order_csv_import: key //File Id for CSV File
                     }
                 });

                 return true;
             });

            // log.debug("arrFilesToRemove", arrFilesToRemove);

             let objPreferences = NSUtil.getPreferences([
                 'custrecord_cp_remote_directory_dfw',
                 'custrecord_cp_remote_directory_houston',
                 'custrecord_cp_remote_directory_phx',
                 'custrecord_cp_remote_directory_ran',
                 'custrecord_rs_recipient_emails',
                 'custrecord_rs_sender_emails',
                 'custrecord_nscs_copy_order_csv_folder'
             ]);
             /*
             if (arrFilesToRemove && arrFilesToRemove.length > 0) {
                 let remoteDirectories = [];
                 //This code was originaly written to just pull from 1 remote folder
                 if (objPreferences['custrecord_cp_remote_directory_aa'].value) {
                     remoteDirectories.push(objPreferences['custrecord_cp_remote_directory_aa'].value);
                 }
                 if (objPreferences['custrecord_cp_remote_directory_maa'].value) {
                     remoteDirectories.push(objPreferences['custrecord_cp_remote_directory_maa'].value);
                 }
                 if (objPreferences['custrecord_cp_remote_directory_caad'].value) {
                     remoteDirectories.push(objPreferences['custrecord_cp_remote_directory_caad'].value);
                 }
                 if (objPreferences['custrecord_cp_remote_directory_sva'].value) {
                     remoteDirectories.push(objPreferences['custrecord_cp_remote_directory_sva'].value);
                 }
                 //sftpUtil.downloadFiles("", "remove", arrFilesToRemove, remoteDirectories);
             }*/
             let processedFolder = objPreferences['custrecord_nscs_copy_order_csv_folder'].value
             log.debug('processedFolder', processedFolder);

             for (let i = 0; i < arrFilesToRemove.length; i++) {
                 //arrFilesToRemove[i].fileObj.folder = processedFolder;
                 log.debug('fileID', arrFilesToRemove[i].fileId);
                 var fileObj = file.load({ id: arrFilesToRemove[i].fileId });
                 arrFilesToRemove[i].fileName = fileObj.name;
                 log.debug('fileObj.name = ', fileObj.name);
                 //.folder = processedFolder;
                 var fileId = fileObj.save();
                 //log.debug('File Moved', fileId);
             }
             log.debug('arrFilesToRemove', arrFilesToRemove);

             // sftpUtil.deleteFiles(arrFilesToRemove, null); 
             log.debug('remove dir cleanup', 'completed');

             //Trigger next script if we got any files
             if (arrFilesToRemove.length > 0) {
                 var objMRTask = task.create({
                     taskType: task.TaskType.SCHEDULED_SCRIPT
                 });
                 objMRTask.scriptId = 'customscript_nscs_ss_processcopyordersta';

                 var scriptTaskId = objMRTask.submit();
                 var taskStatus = task.checkStatus(scriptTaskId);
                 log.debug('scriptTaskId: ' + scriptTaskId, taskStatus);
             }

             let emailMessageBody = 'RIM Order Copy Completed.  # of files Processed: ' + arrFilesToRemove.length;

             let emailSubject = 'RIM Order Copy Process Completed'

             let emailSender = objPreferences['custrecord_rs_sender_emails'].value
             let emailReceiver = objPreferences['custrecord_rs_recipient_emails'].value;

             email.send({
                 author: emailSender,
                 recipients: emailReceiver,
                 subject: emailSubject,
                 body: emailMessageBody
             });

         } catch (error) {
             log.error('Error in Summarize', error.toString());
             sendErrorEmail(error, 'Summary')
         }

         log.audit('Status', 'End Process ');
     }

     function sendErrorEmail(e, stage) {
         log.error('sendErrorEmail Stage: ' + stage + ' failed ', e);

         let objPreferences = NSUtil.getPreferences([
             'custrecord_rs_recipient_emails',
             'custrecord_rs_sender_emails'
         ]);
         let emailSender = objPreferences['custrecord_rs_sender_emails'].value
         let emailReceiver = objPreferences['custrecord_rs_recipient_emails'].value;
         //What if pulling the prefs is an issue too..?????
         //var emailSender = -5;
         var subject = 'RIM Order Copy Inbound Error';
         var body = 'An error occurred with the following information:\n' +
             'Error code: ' + e.name + '\n' +
             'Error msg: ' + e.message;

         log.debug('body', body);
         email.send({
             author: emailSender,
             recipients: emailReceiver,
             subject: subject,
             body: body
         });
     }

     function errorWrapper(summary) {
         log.debug('errorWrapper', '');
         let inputSummary = summary.inputSummary;
         let mapSummary = summary.mapSummary;
         let reduceSummary = summary.reduceSummary;

         if (inputSummary.error) {
             var e = error.create({
                 name: 'INPUT_STAGE_FAILED',
                 message: inputSummary.error
             });
             sendErrorEmail(e, 'getInputData');
         }

         let maperrors = handleErrorInStage('map', mapSummary);
         let reducerrors = handleErrorInStage('reduce', reduceSummary);

         log.debug('maperrors', maperrors);
         log.debug('reducerrors', reducerrors);
     }

     function handleErrorInStage(stage, summary) {
         var errorMsg = [];
         summary.errors.iterator().each(function (key, value) {
             var msg = JSON.parse(value).message + '\n';
             errorMsg.push(msg);
             return true;
         });
         if (errorMsg.length > 0) {
             var e = error.create({
                 name: 'RIM Order Copy Error',
                 message: JSON.stringify(errorMsg)
             });
             handleErrorAndSendNotification(e, stage);
         }
         return errorMsg;
     }

     //Create stage record to hold original file, csv import file, status, errors
     function createStageRec(fileId) {
         var stageRec = record.create({
             type: "customrecord_nscs_copy_order_file_stage"
         });

         stageRec.setValue({
             fieldId: 'custrecord_nscs_order_file',
             value: fileId
         });

         var counter = 0;
         var location;
         var invoiceNumber;
         var locationId = '';
         let objPreferences = NSUtil.getPreferences([
             'custrecord_cp_rimorder_dealer_dfw',
             'custrecord_cp_rimorder_dealer_houston',
             'custrecord_cp_rimorder_dealer_phx',
             'custrecord_cp_rimorder_dealer_ran',
             'custrecord_cp_rimorder_loc_dfw',
             'custrecord_cp_rimorder_loc_houston',
             'custrecord_cp_rimorder_loc_phx',
             'custrecord_cp_rimorder_loc_ran',
             'custrecord_cp_rimorder_dfw_adi',
             'custrecord_cp_rimorder_houston_adi',
             'custrecord_cp_rimorder_phx_adi',
             'custrecord_cp_rimorder_ran_adi',

         ]);

         let dfwLocationCode = objPreferences['custrecord_cp_rimorder_dealer_dfw'].value;
         let houstonLocationCode = objPreferences['custrecord_cp_rimorder_dealer_houston'].value;
         let phxLocationCode = objPreferences['custrecord_cp_rimorder_dealer_phx'].value;
         let ranLocationCode = objPreferences['custrecord_cp_rimorder_dealer_ran'].value;

				 let dfwLocationId = objPreferences['custrecord_cp_rimorder_loc_dfw'].value;
         let houstonLocationId = objPreferences['custrecord_cp_rimorder_loc_houston'].value;
         let phxLocationId = objPreferences['custrecord_cp_rimorder_loc_phx'].value;
         let ranLocationId = objPreferences['custrecord_cp_rimorder_loc_ran'].value;

         var poFile = file.load(fileId);
         var iterator = poFile.lines.iterator();
         iterator.each(function (line) {
             // log.debug("Line.value", line.value);
             var arrLineDetails = line.value.split(",");

             if (arrLineDetails[0].indexOf("PI.IDENT") !== -1 || arrLineDetails[0].indexOf("PV.IDENT") !== -1) {
							 		// PI.IDENT:GM,RIM,2.4,20230801,023014,234206,,,XX,,,USA
									// PV.IDENT:GM,RIM,2.3,20230822,001941,234070,,,XX,,,USA
								 location = arrLineDetails[5];
                 log.debug("location", location);

                 if (location == dfwLocationCode) {
                     locationId = dfwLocationId;
                 } else if (location == houstonLocationCode) {
                     locationId = houstonLocationId;
                 } else if (location == phxLocationCode) {
                     locationId = phxLocationId;
                 } else if (location == ranLocationCode) {
                     locationId = ranLocationId;
                 }

             } else if (arrLineDetails[0].indexOf("PI.HEADER") !== -1 || arrLineDetails[0].indexOf("PV.HEADER") !== -1) {
                 var tempLine = arrLineDetails[0].split(":");
                 invoiceNumber = tempLine[1];
             }
             counter++;

             if (counter < 2) {
                 return true;
             } else {
                 return false;
             }
         });

         // v1.10 added
         let dfwADI = objPreferences['custrecord_cp_rimorder_dfw_adi'].value;
         let houstonADI = objPreferences['custrecord_cp_rimorder_houston_adi'].value;
         let phxADI = objPreferences['custrecord_cp_rimorder_phx_adi'].value;
         let ranADI = objPreferences['custrecord_cp_rimorder_ran_adi'].value;

         let adiToUse = 0;
         switch (locationId) {
             case dfwLocationId:
                 adiToUse = dfwADI;
                 break;
             case houstonLocationId:
                 adiToUse = houstonADI;
                 break;
             case phxLocationId:
                 adiToUse = phxADI;
                 break;
             case ranLocationId:
                 adiToUse = ranADI;
                 break;
         }
         stageRec.setValue('custrecord_nscs_copy_order_adi', adiToUse);
         // v1.10 end

         stageRec.setValue("custrecord_nscs_location", locationId);
         stageRec.setValue("custrecord_nscs_invoice_number", invoiceNumber);

         var stageRecId = stageRec.save();
         log.audit("Stage record created", "customrecord_nscs_copy_order_file_stage:" + stageRecId);
         return stageRecId;
     }

     function processFile(fileId) {
         var poFile = file.load(fileId);
         var iterator = poFile.lines.iterator();
         var itemObj = {};
         var expectedLines = 0;
         var counter = 1;
         iterator.each(function (line) {
             // log.debug("Line.value", line.value);
             var arrLineDetails = line.value.split(",");

             if (arrLineDetails[0].indexOf("PI.LINEITEM") !== -1 || arrLineDetails[0].indexOf("PV.LINEITEM") !== -1) {
                 var partNumber = arrLineDetails[1];
                 var quantity = arrLineDetails[4];

                 partNumber = (partNumber * 1).toString()

                 if (partNumber in itemObj) {
                     itemObj[partNumber] += parseFloat(quantity);
                 } else {
                     itemObj[partNumber] = parseFloat(quantity);
                 }
                 counter++;

             } else if (arrLineDetails[0].indexOf("PI.TRAILER") !== -1 || arrLineDetails[0].indexOf("PV.TRAILER") !== -1) {
                 var tempLine = arrLineDetails[0].split(":");
                 expectedLines = tempLine[1];
             }

             return true;
         });
         log.audit("Expected Lines", expectedLines);
         log.audit("Counter", counter);

         return {
             itemObj: itemObj
         }
     }

     function getNSItems(itemObj) {
         var arrItems = Object.keys(itemObj);
         var NSItemObj = {};

         if (arrItems.length) {
             var filter = [];

             for (var i = 0; i < arrItems.length; i++) {
                 var expressionAll = [];
                 var expression1 = [];
                 expression1.push("itemid");
                 expression1.push("is");
                 expression1.push(arrItems[i]);
                 // expressionAll.push(expression1);
                 filter.push(expression1);
                 filter.push("OR");
                 // log.debug("Filter", filter);
             }
             filter.pop();
             var itemFilter = [];
             itemFilter.push(filter);
             var inventoryitemSearchObj = search.create({
                 type: "inventoryitem",
                 filters: itemFilter,
                 columns: [
                     "internalid",
                     search.createColumn({
                         name: "itemid",
                         sort: search.Sort.ASC
                     })
                 ]
             });
             var searchResultCount = inventoryitemSearchObj.runPaged().count;
             log.debug("inventoryitemSearchObj result count", searchResultCount);
             inventoryitemSearchObj.run().each(function (result) {
                 var partNumber = (result.getValue("itemid") * 1).toString();
                 //var partNumber = result.getValue("itemid");
                 if (partNumber in NSItemObj) {

                 } else {
                     NSItemObj[partNumber] = result.id;
                 }
                 return true;
             });
         }
         return NSItemObj;
     }

     function createCSVFile(headerObj, itemObj, NSItemObj, folderId) {
         var headerStr = "ExternalId,RefNo,Vendor,Date,Location,Subsidiary,StageRecord,Item,Quantity,Description";
         var fileName = headerObj.externalId;
         var fileStr = "";
         fileStr += headerStr + '\n';

         for (var item in itemObj) {
             fileStr += headerObj.externalId + ",";
             fileStr += headerObj.poNumber + ",";
             fileStr += headerObj.vendor + ",";
             var date = new Date();

             var minutes = date.getMinutes();
             var hour = date.getHours();

             var year = date.getFullYear();

             var month = date.getMonth() + 1;
             if (month < 10) {
                 month = "0" + month;
             }
             var day = date.getDate();
             if (day < 10) {
                 day = "0" + day;
             }
             todaysDate = month.toString() + "/" + day.toString() + "/" + year.toString();
             fileStr += todaysDate + ",";
             fileStr += headerObj.location + ",";
             fileStr += headerObj.subsidiary + ",";           // v1.10 added
             fileStr += headerObj.externalId + ",";

             if (item in NSItemObj) {
                 fileStr += NSItemObj[item] + ",";
             }
             fileStr += itemObj[item] + ","; // this is the quantity

             if (item in NSItemObj) {
                 fileStr += ",";
             } else {
                 fileStr += item + ",";      // this is the description
             }
             fileStr += "\n";
         }

         var fileObj = file.create({
             name: fileName + ".csv",
             fileType: file.Type.PLAINTEXT,
             contents: fileStr
         });

         fileObj.folder = folderId;
         var fileId = fileObj.save();

         return fileId;
     }

     function isEmpty(value) {
         if (value == null) {
             return true;
         }
         if (value == undefined) {
             return true;
         }
         if (value == 'undefined') {
             return true;
         }
         if (value == '') {
             return true;
         }
         return false;
     }

     function getCredentialsByADI(adi) {
         let obj = null;
         try { 
             log.debug('getCredentialsByADI', adi);
             var objPreferences;
             switch (adi) {
                 case 'DFW':
                     objPreferences = NSUtil.getPreferences([
                         'custrecord_cp_rim_server_hostkey',
                         'custrecord_cp_rim_server_url',
                         'custrecord_cp_rim_server_port',
                         'custrecord_cp_rim_server_hostkeytype',
                         'custrecord_rim_oc_dfw_username',
                         'custrecord_cp_remote_directory_dfw',
                         'custrecord_rim_oc_dfw_key',
                         'custrecord_rim_oc_dfw_password'
                     ]);
                     obj = {
                         hostKey: objPreferences['custrecord_cp_rim_server_hostkey'].value,
                         hostKeyType: objPreferences['custrecord_cp_rim_server_hostkeytype'].text,
                         port: parseInt(objPreferences['custrecord_cp_rim_server_port'].value),
                         directory: objPreferences['custrecord_cp_remote_directory_dfw'].value,
                         url: objPreferences['custrecord_cp_rim_server_url'].value,
                         username: objPreferences['custrecord_rim_oc_dfw_username'].value,
                         keyId: objPreferences['custrecord_rim_oc_dfw_key'].value,
                         passwordGuid: objPreferences['custrecord_rim_oc_dfw_password'].value
                     };
                     break;
                 case 'Houston':
                     objPreferences = NSUtil.getPreferences([
                         'custrecord_cp_rim_server_hostkey',
                         'custrecord_cp_rim_server_url',
                         'custrecord_cp_rim_server_port',
                         'custrecord_cp_rim_server_hostkeytype',
                         'custrecord_rim_oc_houston_username',
                         'custrecord_cp_remote_directory_houston',
                         'custrecord_rim_oc_houston_key',
                         'custrecord_rim_oc_houston_password'
                     ]);
                     obj = {
                         hostKey: objPreferences['custrecord_cp_rim_server_hostkey'].value,
                         hostKeyType: objPreferences['custrecord_cp_rim_server_hostkeytype'].text,
                         port: parseInt(objPreferences['custrecord_cp_rim_server_port'].value),
                         directory: objPreferences['custrecord_cp_remote_directory_houston'].value,
                         url: objPreferences['custrecord_cp_rim_server_url'].value,
                         username: objPreferences['custrecord_rim_oc_houston_username'].value,
                         keyId: objPreferences['custrecord_rim_oc_houston_key'].value,
                         passwordGuid: objPreferences['custrecord_rim_oc_houston_password'].value
                     };
                     break;
                 case 'PHX':
                     objPreferences = NSUtil.getPreferences([
                         'custrecord_cp_rim_server_hostkey',
                         'custrecord_cp_rim_server_url',
                         'custrecord_cp_rim_server_port',
                         'custrecord_cp_rim_server_hostkeytype',
                         'custrecord_rim_oc_phx_username',
                         'custrecord_cp_remote_directory_phx',
                         'custrecord_rim_oc_phx_key',
                         'custrecord_rim_oc_phx_password'
                     ]);
                     obj = {
                         hostKey: objPreferences['custrecord_cp_rim_server_hostkey'].value,
                         hostKeyType: objPreferences['custrecord_cp_rim_server_hostkeytype'].text,
                         port: parseInt(objPreferences['custrecord_cp_rim_server_port'].value),
                         directory: objPreferences['custrecord_cp_remote_directory_phx'].value,
                         url: objPreferences['custrecord_cp_rim_server_url'].value,
                         username: objPreferences['custrecord_rim_oc_phx_username'].value,
                         keyId: objPreferences['custrecord_rim_oc_phx_key'].value,
                         passwordGuid: objPreferences['custrecord_rim_oc_phx_password'].value
                     };
                     break;
                 case 'RAN':
                     objPreferences = NSUtil.getPreferences([
                         'custrecord_cp_rim_server_hostkey',
                         'custrecord_cp_rim_server_url',
                         'custrecord_cp_rim_server_port',
                         'custrecord_cp_rim_server_hostkeytype',
                         'custrecord_rim_oc_ran_username',
                         'custrecord_cp_remote_directory_ran',
                         'custrecord_rim_oc_ran_key',
                         'custrecord_rim_oc_ran_password'
                     ]);
                     obj = {
                         hostKey: objPreferences['custrecord_cp_rim_server_hostkey'].value,
                         hostKeyType: objPreferences['custrecord_cp_rim_server_hostkeytype'].text,
                         port: parseInt(objPreferences['custrecord_cp_rim_server_port'].value),
                         directory: objPreferences['custrecord_cp_remote_directory_ran'].value,
                         url: objPreferences['custrecord_cp_rim_server_url'].value,
                         username: objPreferences['custrecord_rim_oc_ran_username'].value,
                         keyId: objPreferences['custrecord_rim_oc_ran_key'].value,
                         passwordGuid: objPreferences['custrecord_rim_oc_ran_password'].value
                     };
                     break;
             }
             //log.debug('obj', obj);
         } catch(error) {
             log.error('getCredentialsByADI', 'Error: ' + error);
         }
         //log.debug('getCredentialsByADI', 'done');
         return obj;
     }

     function getADIPreferences(objPreferences) {
         //Would like to put this in a lib...
         log.debug('getADIPreferences', '');
         let adiPreferences = [];

         if (objPreferences['custrecord_cp_remote_directory_dfw']) {
             adiPreferences.push({
                 credentials: getCredentialsByADI('DFW'),
                 remoteDirectory: objPreferences['custrecord_cp_remote_directory_dfw'].value
             });
         }
         if (objPreferences['custrecord_cp_remote_directory_houston']) {
             adiPreferences.push({
                 credentials: getCredentialsByADI('Houston'),
                 remoteDirectory: objPreferences['custrecord_cp_remote_directory_houston'].value
             });
         }
         if (objPreferences['custrecord_cp_remote_directory_phx']) {
             adiPreferences.push({
                 credentials: getCredentialsByADI('PHX'),
                 remoteDirectory: objPreferences['custrecord_cp_remote_directory_phx'].value
             });
         }
         if (objPreferences['custrecord_cp_remote_directory_ran']) {
             adiPreferences.push({
                 credentials: getCredentialsByADI('RAN'),
                 remoteDirectory: objPreferences['custrecord_cp_remote_directory_ran'].value
             });
         }

         return adiPreferences;
     }

     return {
         getInputData: getInputData,
         map: map,
         reduce: reduce,
         summarize: summarize
     }
 });