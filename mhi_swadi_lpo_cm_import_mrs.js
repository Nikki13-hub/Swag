/**
*@NApiVersion 2.1
*@NScriptType MapReduceScript
*/

define(['N/record', 'N/query', 'N/format', 'N/runtime', 'N/file', 'N/email', 'N/https', 'N/task'],
function(record, query, format, runtime, file, email, https, task) {

	function selectAllRows(sql) {
			try {
				var rows = new Array();	
				var resultSql = 'SELECT MAX(ROWNUM) FROM (' + sql + ' )';
				var totalResult = query.runSuiteQL(resultSql);
				var totalResults = totalResult.results;
				var resultLength = totalResults[0].values;
				var pageBlocks = Math.ceil(parseFloat(resultLength)/5000);
				var paginatedRowBegin = 1;
				var paginatedRowEnd = 5000;						
				for (let i = 0; i < pageBlocks; i++) {
					var paginatedSQL = 'SELECT * FROM ( SELECT ROWNUM AS ROWNUMBER, * FROM (' + sql + ' ) ) WHERE ( ROWNUMBER BETWEEN ' + paginatedRowBegin + ' AND ' + paginatedRowEnd + ')';
					var queryResults = query.runSuiteQL({query: paginatedSQL}).asMappedResults(); 	
					rows = rows.concat( queryResults );	
					paginatedRowBegin = paginatedRowBegin + 5000;
					paginatedRowEnd = paginatedRowEnd + 5000;
				}
			} catch(e) {		
				log.error('SuiteQL - error', e.message);
			}	
			return rows;
	}

	function getInputData() {
		var scriptRec = runtime.getCurrentScript();
      	var fileId = Number(scriptRec.getParameter({name: 'custscript_lpo_file'}))||'';
		var lpoType = scriptRec.getParameter({name: 'custscript_lpo_type'})||'';
		if (fileId && lpoType) {
		var jsonFile = file.load({id: fileId});
		var fileJSON = JSON.parse(jsonFile.getContents());
		if (lpoType === 'GM') {
			var lpoValue = '(1776,2131)';
		}
		if (lpoType === 'FORD') {
			var lpoValue = '(1227,1228,1229,7102)';
		}
		if (lpoType === 'EFORD') {
			var lpoValue = '(1246,7101,7103,1244,1245)';
		}
		var cmLines = 0;
		var rJSON = [];
		log.debug('input',fileJSON);
			for (var l = 0; l < fileJSON.length; l++) {
				if (lpoType === 'GM' || lpoType === 'EFORD') {
					var lpoInvoice = Number(fileJSON[l].invoice);
				}
				if (lpoType === 'FORD') {
					var lpoInvoice = fileJSON[l].invoice;
				}
				var lpoAmount = parseFloat(fileJSON[l].amount)||0;
				var rLINE = {};
				rLINE.type = lpoType;
				rLINE.invoice = lpoInvoice;
				rLINE.amount = lpoAmount;
				rJSON.push(rLINE);
			}
				/*
				var pRec = record.create({
					type: record.Type.JOURNAL_ENTRY,
					isDynamic: true,
				});
				pRec.setValue({
					fieldId: "type",
					value: "Journal",
				});
				pRec.setText({
					fieldId: "type",
					text: "Journal",
				  });
				if (lpoType === 'GM') {
					pRec.setValue({
						fieldId: 'subsidiary',
						value: 2
					});
				}
				if (lpoType === 'FORD' || lpoType === 'EFORD') {
					pRec.setValue({
						fieldId: 'subsidiary',
						value: 3
					});
				}
				pRec.setValue({
					fieldId: 'memo',
					value: lpoType + ' LPO/DIO Payment Posting'
				});
				var jeCMTotal = 0;
				var jePMTotal = 0;
				var jeDRTotal = 0;
				var pmtApply = [];
			fileJSON.forEach(function(j) {
				var invPayment = {};
				var payments = {};
				var lineVar = Number(j.variance);
				if (lineVar < 0 && j.invid) {
					pRec.selectNewLine({
						sublistId: 'line'
					});
					if (lpoType === 'EFORD') {
						pRec.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: '1634'
						});
					}
					if (lpoType === 'FORD') {
						pRec.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: '1638'
						});
					}
					if (lpoType === 'GM') {
						pRec.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: '282'
						});
					}
					pRec.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'memo',
						value: '{"invoice":' + j.invdoc + ',"PO":' + j.invoice + ',"id":' +j.invid + '}'
					});
					pRec.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'credit',
						value: Math.abs(lineVar.toFixed(2))
					});
					jeCMTotal += Math.abs(lineVar.toFixed(2));
					pRec.commitLine({
						sublistId: 'line'
					});
					payments.credit = Math.abs(lineVar.toFixed(2));
				}
				if (lineVar > 0) {
					pRec.selectNewLine({
						sublistId: 'line'
					});
					if (lpoType === 'EFORD') {
						pRec.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: '119'
						});
					}
					else {
						pRec.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: '233'
						});
					}					
					pRec.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'memo',
						value: 'Overpayment on invoice: ' + j.invdoc + ' PO: ' + j.invoice
					});
					pRec.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'debit',
						value: Math.abs(lineVar.toFixed(2))
					});
					jeDRTotal += Math.abs(lineVar.toFixed(2));
					pRec.commitLine({
						sublistId: 'line'
					});
				}
					pRec.selectNewLine({
						sublistId: 'line'
					});
					if (lpoType === 'EFORD') {
						pRec.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: '119'
						});
					}
					else {
						pRec.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: '233'
						});
					}	
					var invLocation = Number(j.location)||0;
					
					if (j.entity && Number(j.entity) != 0) {
					pRec.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'entity',
						value: Number(j.entity)
					});
					}
					else if (invLocation != 0) {
						if (invLocation === 8 && lpoType === 'GM') {
							pRec.setCurrentSublistValue({
								sublistId: 'line',
								fieldId: 'entity',
								value: 2131
							});
						}
						if (invLocation === 13 && lpoType === 'GM') {
							pRec.setCurrentSublistValue({
								sublistId: 'line',
								fieldId: 'entity',
								value: 1776
							});
						}
						if (invLocation === 5 && lpoType === 'FORD') {
							pRec.setCurrentSublistValue({
								sublistId: 'line',
								fieldId: 'entity',
								value: 1227
							});
						}
						if (invLocation === 6 && lpoType === 'FORD') {
							pRec.setCurrentSublistValue({
								sublistId: 'line',
								fieldId: 'entity',
								value: 1228
							});
						}
						if (invLocation === 7 && lpoType === 'FORD') {
							pRec.setCurrentSublistValue({
								sublistId: 'line',
								fieldId: 'entity',
								value: 1229
							});
						}
						if (invLocation === 15 && lpoType === 'FORD') {
							pRec.setCurrentSublistValue({
								sublistId: 'line',
								fieldId: 'entity',
								value: 7102
							});
						}
						if (invLocation === 5 && lpoType === 'EFORD') {
							pRec.setCurrentSublistValue({
								sublistId: 'line',
								fieldId: 'entity',
								value: 1244
							});
						}
						if (invLocation === 6 && lpoType === 'EFORD') {
							pRec.setCurrentSublistValue({
								sublistId: 'line',
								fieldId: 'entity',
								value: 1245
							});
						}
						if (invLocation === 7 && lpoType === 'EFORD') {
							pRec.setCurrentSublistValue({
								sublistId: 'line',
								fieldId: 'entity',
								value: 1246
							});
						}
						if (invLocation === 15 && lpoType === 'EFORD') {
							pRec.setCurrentSublistValue({
								sublistId: 'line',
								fieldId: 'entity',
								value: 7103
							});
						}
					}
					pRec.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'memo',
						value: '{"invoice":"' + j.invdoc + '","PO":' + j.invoice + ',"id":' + j.invid + ',"location":'+ invLocation +'}'
					});
					var lnAmount = Number(j.amount);
					var lnAmount = Math.abs(lnAmount.toFixed(2));
					pRec.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'credit',
						value: lnAmount
					});
					jePMTotal += lnAmount;
					pRec.commitLine({
						sublistId: 'line'
					});
					payments.debit = lnAmount;
					payments.invid = j.invid;
					payments.invdoc = j.invdoc;
					payments.location = j.location;
					payments.entity = j.entity;
					pmtApply.push(payments);
				return true;
			});
				pRec.selectNewLine({
					sublistId: 'line'
				});
				pRec.setCurrentSublistValue({
					sublistId: 'line',
					fieldId: 'account',
					value: '255'
				});
				pRec.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'memo',
						value: 'LPO/DIO File Import Payments'
				});
				pRec.setCurrentSublistValue({
					sublistId: 'line',
					fieldId: 'debit',
					value: Number(jePMTotal.toFixed(2)) + Number(jeCMTotal.toFixed(2)) - Number(jeDRTotal.toFixed(2))
				});
				pRec.commitLine({
					sublistId: 'line'
				});
				var pRecId = pRec.save();
				log.debug('JE Created', pRecId);
		var savedJE = [];
		savedJE.push(pRecId);
		//if (lpoData.length < 10000) {
		//	return pmtApply;
		//}
		//else {
		return savedJE;
		//}
		//return pmtApply;
		}
		else {
			return false;
		}
		*/
		log.debug('return',rJSON);
		return rJSON;
	}
}
	
	function reduce(context) {
		log.debug('reduce ' + context.key,context.values);
		try {
		var scriptRec = runtime.getCurrentScript();
		var csvValues = context.values;
		
		var userId = Number(scriptRec.getParameter({name: 'custscript_lpo_user_id'}))||'';
		var userEmail = scriptRec.getParameter({name: 'custscript_lpo_user_email'})||'';
		var emailBody = JSON.stringify(csvValues);
		log.debug('Email', userId + ' ' + userEmail);
		if (userId && userEmail) {
			email.send({
				author : userId, 
				recipients : userEmail, 
				replyTo: userEmail,
				subject : 'LPO Import Complete', 
				body : emailBody
			});
			log.debug('Sent to ' + userId, userEmail);
		}
		var csvLines = 'creditmemo,apply,amt';
		csvValues.map(function (x) {
	
			var cmid = x.message;
			csvLines += '\n'+cmid+','+x.invid+','+x.cmamt;
	
		});
		log.debug('contents',csvLines);
		var fileObj = file.create({
			name: 'gmlpocm.csv',
			fileType: file.Type.CSV,
			contents: csvLines,
			encoding: file.Encoding.UTF8,
			folder: 34331,
			isOnline: true
		});
		var fileID = fileObj.save();
		log.debug('file',fileID);
		if (fileID) {
			var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
			scriptTask.scriptId = 'customscript_mhi_swadi_lpo_cm_ss';
			scriptTask.deploymentId = 'customdeploy_mhi_swadi_lpo_cm_ss';
			scriptTask.params = {'custscript_mhi_lpo_cm_file': fileID};
			var csvImportTaskId = scriptTask.submit();
			log.debug('csv',csvImportTaskId);
		}
		}
		catch(e) {log.debug('error', e.message);}
	}
		
	function map(context) {
			var data = JSON.parse(context.value);
			var results = {};
			var po = data.invoice;
			var poString = po.toString();
			var amt = parseFloat(data.amount);
			var isql = `select t.id, t.tranid, t.otherrefnum, t.foreignamountunpaid	amt, t.entity from transaction t where t.type = 'CustInvc' and  t.otherrefnum = '`+po+`'`;
      		var queryResults = query.runSuiteQL({query: isql}).asMappedResults(); 	
			if (queryResults && queryResults.length > 0) {
				var entity = queryResults[0].entity;
				var invRemaining = parseFloat(queryResults[0].amt);
				results.entity = entity;
				results.po =  po;
				results.invid = queryResults[0].id;
				results.cmamt = invRemaining;
				results.fileamt = amt;
				var invVariance = Math.abs(amt - invRemaining);
				results.jeamt = invVariance;
				if (invVariance < 1) {
					/*
					var postURL = 'https://6827316.app.netsuite.com/app/site/hosting/scriptlet.nl?script=2165&deploy=1&poref='+po+'&amt='+invRemaining;
					log.debug('url',postURL);
					var cmID = https.get({
						url: postURL
					});
					log.debug('post',cmID.body);
					results.message = cmID.body||cmID;
					*/
					var cmRecObj = record.transform({
						fromType: record.Type.INVOICE,
						fromId: queryResults[0].id,
						toType: record.Type.CREDIT_MEMO,
						isDynamic: true
					});
					var cmRecID = cmRecObj.save();
					results.message = cmRecID||'error saving';
				}
				else {
					results.message = 'CM not created, our of scope';
				}
			}
			else {
				results.entity = 'Not found';
				results.po = po;
				results.cmamt = 'Not Found';
				results.fileamt = amt;
				results.jeamt = 'Not Found';
				results.message = 'Transaction not found';
			}
			context.write({key: data.type, value: JSON.stringify(results)});
	}
		
	return {
		config:{
        retryCount: 3,
        exitOnError: true
		},
		getInputData: getInputData,
		map: map,
		reduce:reduce
	};
});
