/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
	Auther : Rad
	Created Date : 07 Jan 2025
	Purpose : To copy lpo transaction id from sales order line to invoice line
*/
define(['N/record', 'N/runtime', 'N/search'],
	function(record, runtime, search) {
		function getInputData() {
			// get data from saved search. saved search id passed as a script parameter
			let functionName = 'getInputData';
			try {
				let scriptObj = runtime.getCurrentScript();
				let s_savesearch_ID = scriptObj.getParameter('custscript_8q_mr_tempinvs_ss');
				return search.load({
					id: s_savesearch_ID
				});
			} catch (e) {
				log.error(functionName, 'error->' + e.message);
			}
		}

		function map(context) {
			let functionName = 'map';
			let tempId = context.key;
			try {
				let data = JSON.parse(context.value);
				let invId = data.values['GROUP(internalid)'].value;
				let objRecord = record.load({
					type: 'invoice',
					id: invId,
					isdynamic: true
				});
				let createdFrom = objRecord.getValue('createdfrom');
				let objSO = record.load({
					type: 'salesorder',
					id: createdFrom,
					isdynamic: true
				});
				let lineCount = objRecord.getLineCount({
					sublistId: 'item'
				});
				let soCount = objSO.getLineCount({
					sublistId: 'item'
				});
				for (let i = 0; i < lineCount; i++) {
					let lpoId = objRecord.getSublistValue({
						sublistId: 'item',
						fieldId: 'custcol_8q_lpo_txn_id',
						line: i
					});
					let item = objRecord.getSublistValue({
						sublistId: 'item',
						fieldId: 'item',
						line: i
					});
					if (!_logValidation(lpoId)) {
						let txnId = '';
						for (let x = 0; x < soCount; x++) {
							let itemS = objSO.getSublistValue({
								sublistId: 'item',
								fieldId: 'item',
								line: x
							});
							if (item == itemS) {
								txnId = objSO.getSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_8q_lpo_txn_id',
									line: x
								});
								if (_logValidation(txnId)) {
									objRecord.setSublistValue({
										sublistId: 'item',
										fieldId: 'custcol_8q_lpo_txn_id',
										value: txnId,
										line: i
									});
									break;
								}
							}
						}
					}
				}
				objRecord.save();
                log.audit(invId,'done');
			} catch (ex) {
				log.error(functionName + ': #' + tempId, 'exception->' + ex);
			}
		}

		function _logValidation(value) {
			if (value != 'null' && value != '' && value != undefined && value != 'NaN') {
				return true;
			} else {
				return false;
			}
		}

		function summarize(summary) {
			//Grab Map errors
			summary.mapSummary.errors.iterator().each(function(key, value) {
				log.error(key, 'ERROR String: ' + value);
				return true;
			});
			summary.reduceSummary.errors.iterator().each(function(key, value) {
				log.error(key, 'ERROR String: ' + value);
				return true;
			});
		}
		return {
			getInputData: getInputData,
			map: map,
			summarize: summarize
		};
	});