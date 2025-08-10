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
				let s_savesearch_ID = scriptObj.getParameter('custscript_8q_mr_item_pendingsub_ss');
				return search.load({
					id: s_savesearch_ID
				});
			} catch (e) {
				log.error(functionName, 'error->' + e.message);
			}
		}

		function map(context) {
			let functionName = 'map';
			let itemId = context.key;
			try {
                let objItem = record.load({
					type: record.Type.INVENTORY_ITEM,
					id: itemId
				});
                let subsidiary=objItem.getValue('subsidiary');
                if(subsidiary.indexOf('5')==-1){
                    subsidiary.push('5');
                    objItem.setValue('subsidiary',subsidiary);
                    log.audit(itemId,'subsidiary updated');
                }
                objItem.setValue('custitem_8q_subsidiary_updated',true);
                objItem.save();
			} catch (ex) {
				log.error(functionName + ': #' + itemId, 'exception->' + ex);
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