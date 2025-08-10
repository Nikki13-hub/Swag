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
			let tempId = context.key;
			try {
                let data = JSON.parse(context.value);
                let POId = data.values['custrecord_8q_polt_po'];
                if(_logValidation(POId)){
                   let objRecord = record.load({
                        type: 'salesorder',
                        id: POId,
						isdynamic : true
                    });
					let cseg1=objRecord.getValue('cseg1'); 
					let lineCount = objRecord.getLineCount({
						sublistId: 'item'
					});
					for (let i = 0; i < lineCount; i++) {
						if(_logValidation(cseg1)){
							let currentCSEG1=objRecord.getSublistValue({
								sublistId: 'item',
								fieldId: 'cseg1',
								line: i
							});
							if(!_logValidation(currentCSEG1)){
								objRecord.setSublistValue({
									sublistId: 'item',
									fieldId: 'cseg1',
									value: cseg1,
									line: i
								});
							}
						}
					}
                    objRecord.save();
					record.delete({
						type : 'customrecord_8q_polist_temp',
						id: tempId
					});
					log.debug('POId',POId);
                }
				
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