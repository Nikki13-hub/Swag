/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
	Auther : Radhakrishnan
	Created Date : 29 Aug 2023
	Purpose : To create LPO orders
*/
define(['N/record', 'N/runtime', 'N/search'],
	function(record, runtime, search) {
		function getInputData() {
			// get data from saved search. saved search id passed as a script parameter
			let functionName = 'getInputData';
			try {
				let scriptObj = runtime.getCurrentScript();
				let s_savesearch_ID = scriptObj.getParameter('custscript_8q_mr_temppos_ss');
				return search.load({
					id: s_savesearch_ID
				});
			} catch (e) {
				log.error(functionName, 'error->' + e.message);
			}
		}

		function map(context) {
			let functionName = 'map';
			try {
				if (!_logValidation(context.key)) {
					log.audit('NO_RECORDS_FOUND', 'No data to process');
					return;
				}
				var data = JSON.parse(context.value);
				var poId = data.values['GROUP(internalid)'].value;
				let recType=record.Type.JOURNAL_ENTRY;
				let objOriginalPO = record.load({
					type: recType,
					id: poId
				});
                let lineCountO = objOriginalPO.getLineCount({
					sublistId: 'line'
				});
                for(let i=0;i<lineCountO;i++){
					let type = objOriginalPO.getSublistValue({
						sublistId: 'line',
						fieldId: 'accounttype',
						line: i
					});
					if(type == 'AcctPay'){
						log.debug(i,type);
						objOriginalPO.setSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: 6154,
							line: i
						});
					}
                }
				log.debug(poId,poId);
				objOriginalPO.save();

			} catch (ex) {
				log.error(functionName, 'exception->' + ex);
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