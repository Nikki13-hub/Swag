/**
* Copyright (c) 1998-2018 Oracle NetSuite GBU, Inc.
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
*
* Version    Date            Author           Remarks
* 1.00
* 1.1       9/09/21           Sukhjeet Kaur    Script to create a file and upload to the SFTP server
* ...
* 1.7      04/28/22           S Saxena         Update to generic custom field Id's
* 1.8      05/20/22           S Saxena         Enhancement for customer specific dealer code 
* 1.9      07/21/22           P Ries           Update to file name, per GM
* 2.0      08/15/22           P Ries           Script will create one file for both ADIs 
*
* @NApiVersion 2.1
* @NScriptType ScheduledScript
* @NModuleScope SameAccount
*/
define(['N/runtime', 'N/file', 'N/record', 'N/search','N/format', 'N/email', 'N/error', 'N/sftp', '/SuiteScripts/_nscs/Libraries/NSUtilvSS2'],

    /**
     * @param{file} file
     * @param{record} record
     * @param{search} search
     */
    (runtime, file, record, search,format, email, error, sftp, NSUtil) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            log.debug('execute scriptContext', JSON.stringify(scriptContext));

            var objPreferences = NSUtil.getPreferences([
                'custrecord_cp_lpoack_so_search',
                'custrecord_cp_lpoack_emailaddress',
                'custrecord_cp_lpoack_folder_id',
                'custrecord_cp_lpoack_server_url',
                'custrecord_cp_lpoack_server_port',
                'custrecord_cp_lpoack_username',
                'custrecord_cp_lpoack_api_secret',
                'custrecord_cp_lpoack_hostkey',
                'custrecord_cp_lpoack_hostkeytype',
                'custrecord_cp_lpoack_remote_dir',
                'custrecord_cp_lpoack_email_sender',
                'custrecord_cp_lpoack_fail_email_sub',
                'custrecord_cp_lpoack_succ_sub',
                'custrecord_cp_lpoack_succ_body',
                'custrecord_cp_lpoack_fail_body',
                'custrecord_cp_lpoack_dfw_ship_to_code',
                'custrecord_cp_lpoack_customer_dfw_lpo',
                'custrecord_cp_lpoack_houston_ship_to_cod',
                'custrecord_cp_lpoack_customer_houston',
                'custrecord_8q_cp_max_retry',
                'custrecord_8q_cp_delay_sec'
            ]);
            const searchId = objPreferences['custrecord_cp_lpoack_so_search'].value;
            //  log.debug('searchId', searchId);
            const emailRecipient = objPreferences['custrecord_cp_lpoack_emailaddress'].value;
            //  log.debug('emailRecipient', emailRecipient);
            const folderId = 121862;//objPreferences['custrecord_cp_lpoack_folder_id'].value;
            // log.debug('folderId', folderId);
            const sftpURL = objPreferences['custrecord_cp_lpoack_server_url'].value;
            //log.debug('sftpURL', sftpURL);
            const sftpPort = objPreferences['custrecord_cp_lpoack_server_port'].value;
            // log.debug('sftpPort', sftpPort);
            const userName = objPreferences['custrecord_cp_lpoack_username'].value;
            // log.debug('userName', userName);
            const apiSecret = objPreferences['custrecord_cp_lpoack_api_secret'].value;
            //  log.debug('apiSecret', apiSecret);
            const hostKey = objPreferences['custrecord_cp_lpoack_hostkey'].value;
            // log.debug('hostKey', hostKey);
            const hostKeyType = objPreferences['custrecord_cp_lpoack_hostkeytype'].text;
            // log.debug('hostKeyType', hostKeyType);
            const destDir = objPreferences['custrecord_cp_lpoack_remote_dir'].value;
            //  log.debug('destDir', destDir);
            const maxRetry = objPreferences['custrecord_8q_cp_max_retry'].value;
            log.debug('maxRetry', maxRetry);
            const delaySeconds = objPreferences['custrecord_8q_cp_delay_sec'].value;
            log.debug('delaySeconds', delaySeconds);
            const emailAuthor = objPreferences['custrecord_cp_lpoack_email_sender'].value;
            //log.debug('emailAuthor', emailAuthor);
            const failSubject = objPreferences['custrecord_cp_lpoack_fail_email_sub'].value;
            //log.debug('failSubject', failSubject);
            const failBody = objPreferences['custrecord_cp_lpoack_fail_body'].value;
            //log.debug('failBody', failBody);
            const successSubject = '8Q GM Daily Sales for Export - DFW-HOU';
            //log.debug('successSubject', successSubject);
            const successBody = '8Q GM Daily Sales for Export - DFW-HOU';//objPreferences['custrecord_cp_lpoack_succ_body'].value;
            //log.debug('successBody', successBody);

            //v1.8 start
            const custrecord_cp_lpoack_dfw_ship_to_code = objPreferences['custrecord_cp_lpoack_dfw_ship_to_code'].value || '';
            const custrecord_cp_lpoack_customer_dfw_lpo = objPreferences['custrecord_cp_lpoack_customer_dfw_lpo'].value || '';
            const custrecord_cp_lpoack_houston_ship_to_cod = objPreferences['custrecord_cp_lpoack_houston_ship_to_cod'].value || '';
            const custrecord_cp_lpoack_customer_houston = objPreferences['custrecord_cp_lpoack_customer_houston'].value || '';
            //v1.8 end

            if (!searchId || !emailRecipient || !folderId) {
                let errorObj = error.create({
                    name: 'MISSING_SEARCH_PARAM',
                    message: 'Missing one of the script execution parameter values.'
                });
                throw errorObj;
            }

            try {
                const fileHeader = 'part_num,acknowledged_date,completed_date,invoice_num \n';
                const executionDate = new Date();
                log.debug('executionDate', executionDate);

                let allInvoiceIds = [];
                let uniqueInvoiceIds = [];
                let fileContent = '';
                let rowCount = 0;
                // v2.0 - removed:  let currentDealer = '';
                let fileIDs = [];
                let fileIDsForEmail = '';

                // v1.5 updated
                const ackInvoiceList = NSUtil.searchPaged({ id: searchId });
                log.debug('execute | Ack. Invoice search result count', JSON.stringify(ackInvoiceList));
                // search.load({id: searchId}).run();
                
                ackInvoiceList.forEach((result) => {
                    log.debug({
                        title: 'ackInvoiceList each',
                        details: `result: ${JSON.stringify(result)}`
                    });
                    // if (rowCount == 0) {
                    //     fileContent = fileHeader;
                    // };
                    let columns = result.columns;
                    //log.debug('columns', columns);
                    let trandate = result.getValue(columns[0]) || '';
                    let dealercode = result.getValue(columns[1]) || '';
                    let businessassociatecode = result.getValue(columns[2]) || '';
                    let itemname = result.getText(columns[3]) || '';
                    let quantity = result.getValue(columns[4]) || '';

                    let lineContent = `${trandate},${dealercode},${businessassociatecode},${itemname},${quantity}\n`;

                    fileContent += lineContent;
                    allInvoiceIds.push(result.id)
                    ++rowCount;

                    return true;
                });

                // v1.2 save the last file
                let fileid = saveAnLPOFile(fileContent, folderId);
                fileIDs.push(fileid);

                //uniqueInvoiceIds = updateInvoices(allInvoiceIds, record);

                var valuesObj = {
                    url: sftpURL,
                    username: userName,
                    hostKey: hostKey,
                    hostKeyType: hostKeyType,
                    secret: apiSecret,
                    directory: destDir
                };
                log.debug("SFTP values object", valuesObj);
                let attempts = 0;
                let fileUploadSuccess = false;
                do {
                    attempts += 1;
                    try{
                        var sftpConnection = sftp.createConnection(valuesObj);
                        log.debug('SFTP connection created', sftpConnection);

                        // send the 4 files into the same remote directory
                        const fileCount = fileIDs.length;
                        log.debug('fileCount: ', fileCount);
                        fileIDs.forEach((theFileID, index) => {
                            log.debug('theFileID: ', theFileID);
                            if (index !== fileCount-1) {
                                fileIDsForEmail += theFileID + ',';
                            } else {
                                fileIDsForEmail += theFileID + '';
                            }
                            let uploadFile = file.load({
                                id: theFileID
                            });
                            log.debug('uploadFile', JSON.stringify(uploadFile));
                            const thefilename = uploadFile.name;
                            const uploadConnection = sftpConnection.upload({
                                file: uploadFile,
                                replaceExisting: true
                            });
                        });
                        fileUploadSuccess = true;
                        log.audit('UPLOAD_SUCCESS','SFTP Upload Success with attempts: #' + attempts + ' | ' + new Date());
                    } catch(error) {
                        if (error.name == 'FTP_CONNECT_TIMEOUT_EXCEEDED') {
                            if (attempts < maxRetry) {
                                log.audit(error.name,'SFTP Upload, SFTP Connection Timed Out. Will try again in '+delaySeconds+' seconds');
                                sleep(delaySeconds);
                            } else {
                                log.error(error.name,'SFTP Upload, SFTP Connection Timed Out. Done trying.');
                            }
                        } else {
                            log.error(error.name,'SFTP Upload error ' + error);
                            sleep(delaySeconds);
                        }
                    }
                    
                } while ((attempts < maxRetry) && !fileUploadSuccess);
                /// Create sftp Connection
                
                if(fileUploadSuccess){
                    sendAnEmail(emailAuthor, emailRecipient, successSubject, successBody, fileIDsForEmail, '');
                    log.debug('Finished', '--------------');
                } else {
                    sendAnEmail(emailAuthor, emailRecipient, failSubject, failBody, null, 'Failed to upload file into SFTP. Maximum Retries:' + attempts);
                }

            } catch (e) {
                log.error({
                    title: 'execute Error',
                    details: e
                });
                if (e) {
                    sendAnEmail(emailAuthor, emailRecipient, failSubject, failBody, null, e);
                }
            }
        }



        function getDateTimeValues() {
            var dt = new Date();
            var year = dt.getFullYear();
            var month = dt.getMonth() + 1;
            if (month < 10) {
                month = '0' + month;
            }
            var day = dt.getDate();
            if (day < 10) {
                day = '0' + day;
            }
            var hour = dt.getHours();
            if (hour < 10) {
                hour = '0' + hour;
            }
            var minute = dt.getMinutes();
            if (minute < 10) {
                minute = '0' + minute;
            }
            var seconds = dt.getSeconds();
            if (seconds < 10) {
                seconds = '0' + seconds;
            }
            return { year, month, day, hour, minute, seconds };
        }

        function saveAnLPOFile(fileContent, folderId) {
            const logtitle = 'saveAnLPOFile';
            let returnFileId = '';
            try {
                log.debug(logtitle, 'fileContents: ' + fileContent);
                let { year, month, day, hour, minute, seconds } = getDateTimeValues();
                // v1.4 updated
                const updateDate = '' + year + month + day + hour + minute + seconds;
                // v1.9 updated
                let fileAck = file.create({
                    name: `234041.csv`,
                    fileType: file.Type.CSV,
                    contents: fileContent,
                    folder: folderId,
                    isOnline: true
                });
                returnFileId = fileAck.save();
                log.debug(logtitle, 'saved file id: ' + returnFileId);
            } catch (error) {
                log.error(logtitle, 'Error: ' + error);
            }
            return returnFileId;
        }

        function sendAnEmail(emailAuthor, emailRecipient, subject, body, fileIDsForEmail, errorObject) {
            let fileIDsWithLinks = null;
            let attachments = [];
            if (fileIDsForEmail) {
                fileIDsWithLinks = getFileLinks(fileIDsForEmail);
                let fileObj = file.load({
                    id: parseInt(fileIDsForEmail.split(',')[0])
                });
                attachments.push(fileObj);
            }
            //log.debug('_attachments',JSON.stringify(attachments))
            email.send({
                author: emailAuthor,
                recipients: emailRecipient,
                attachments: attachments,
                subject: subject,
                body: body + '<br>\Script ID:' + runtime.getCurrentScript().id
                    + '<br>Files created: <br>' + fileIDsWithLinks
                    + '<br>Error (if any):' + JSON.stringify(errorObject)
            });
            log.debug('Email sent to', emailRecipient);
        }

        function getFileLinks(fileIDs) {
            const logtitle = 'getFileLinks';
            let returnValue = '';
            try {
                let linkToFileBase = 'https://{{ACCT}}.app.netsuite.com{{ID}}'
                linkToFileBase = linkToFileBase.replace('{{ACCT}}',runtime.accountId.replace('_', '-'));
                let arrFileIDs = fileIDs.split(',');
                log.debug(logtitle, 'arrFileIDs: ' + JSON.stringify(arrFileIDs));
                arrFileIDs.forEach(fileID => {
                    const fileObj = file.load({ id: fileID });         // 10 units per file = 40 max
                    log.debug(logtitle, 'url: ' + fileObj.url);
                    let thisLink = linkToFileBase;
                    thisLink = thisLink.replace('{{ID}}', fileObj.url);
                    returnValue += '<a href="' + thisLink + '">' + fileID + '</a>,<br>';
                    log.debug(logtitle, 'returnValue is now: ' + returnValue);
                });
            } catch(e) {
                log.error(logtitle, 'Error: ' + e);
            }
            return returnValue;
        }

        function updateInvoices(allInvoiceIds) {
            const logtitle = 'updateInvoices';
            log.debug(logtitle, 'allInvoiceIDs: ' + JSON.stringify(allInvoiceIds));
            let updateInvoiceIds = [];
            try {
                let uniqueInvoiceIds = Array.from(new Set(allInvoiceIds));
                log.debug(logtitle, 'uniqueInvoiceIds: ' + JSON.stringify(uniqueInvoiceIds));

                uniqueInvoiceIds.forEach(invoiceId => {
                    let updateDate = new Date();
                    updateDate = (updateDate.getMonth() + 1) + '/' + updateDate.getDate() + '/' + updateDate.getFullYear();
                    log.debug(logtitle, 'invoiceId: ' + JSON.stringify(invoiceId));
                    log.debug(logtitle, 'updateDate: ' + updateDate);

                    //updateDate = format.format({type: format.Type.DATE, value: new Date()});

                    let id = record.submitFields({
                        type: record.Type.INVOICE,
                        id: invoiceId,
                        values: {
                            custbody_nsps_ack_file_created: true,
                            custbody_nsps_ack_file_created_date: updateDate
                        }
                    });
                    
                    log.debug(logtitle, 'id: ' + id);
                    updateInvoiceIds.push(id);
                });
            } catch (error) {
                log.error(logtitle, 'Error: ' + error);
            }
            log.debug(logtitle, 'Updated Invoices: ' + JSON.stringify(updateInvoiceIds));
            return updateInvoiceIds;
        }

        function sleep(seconds) {
            log.debug({
                title: 'Sleeping',
                details: seconds + ' seconds'
            });
            var inMS = seconds * 1000;
            var obDate = new Date();
            var obNewDate = obDate.getTime() + inMS;
            while (obNewDate > new Date()) { }
        }

        return { execute }

    });
