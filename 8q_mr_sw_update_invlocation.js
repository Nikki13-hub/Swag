/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
	Auther : Radhakrishnan
	Created Date : 01 Aug 2023
	Purpose : To update missing inventory location
*/
define(['N/record', 'N/runtime', 'N/search'],
	function(record, runtime, search) {
		function getInputData() {
			// get item fulfilment data from saved search. saved search id passed as a script parameter
			var functionName = 'getInputData';
			try {
				var scriptObj = runtime.getCurrentScript();
				var s_savesearch_ID = scriptObj.getParameter('custscript_pending_so_ss');
				return search.load({
					id: s_savesearch_ID
				});
			} catch (e) {
				log.error(functionName, 'error->' + e.message);
			}
		}

		function map(context) {
throw 'error';
          var functionName = 'map';
			try {
				var returnData = {};
				var data = JSON.parse(context.value);
				if (data) {
					let soId = data.values['GROUP(internalid)'].value;
					var objSalesOrder = record.load({
						type: record.Type.SALES_ORDER,
						id: soId,
						isDynamic: false
					});
					let location = objSalesOrder.getValue('location');
					let inventoryLocation = '';
					if (location == 45 | location == 47) {
						inventoryLocation = 50
					} else if (location == 41 | location == 43) {
						inventoryLocation = 49
					}
					let fulfilLocation = objSalesOrder.getValue('custbody_8q_fulfillment_f');
					if (!_logValidation(fulfilLocation)) {
						objSalesOrder.setValue('custbody_8q_fulfillment_f', inventoryLocation);
					}
					let lineCount = objSalesOrder.getLineCount({
						sublistId: 'item'
					});
					var tobeUpdated = false;
					for (let i = 0; i < lineCount; i++) {
						let invLoc = objSalesOrder.getSublistValue({
							sublistId: 'item',
							fieldId: 'inventorylocation',
							line: i
						});
						if (!_logValidation(invLoc) & _logValidation(inventoryLocation)) {
							tobeUpdated = true;
							objSalesOrder.setSublistValue({
								sublistId: 'item',
								fieldId: 'inventorylocation',
								line: i,
								value: inventoryLocation
							});
						}
					}
					if (tobeUpdated) {
                        objSalesOrder.save();
						objSalesOrder = record.load({
							type: record.Type.SALES_ORDER,
							id: soId,
							isDynamic: false
						});
						for (let i = 0; i < lineCount; i++) {
							let invLoc = objSalesOrder.getSublistValue({
								sublistId: 'item',
								fieldId: 'inventorylocation',
								line: i
							});
							if (invLoc == 45 | invLoc == 47) {
								objSalesOrder.setSublistValue({
									sublistId: 'item',
									fieldId: 'inventorylocation',
									line: i,
									value: 50
								});
							} else if (invLoc == 41 | invLoc == 43) {
								objSalesOrder.setSublistValue({
									sublistId: 'item',
									fieldId: 'inventorylocation',
									line: i,
									value: 49
								});
							}
						}
						objSalesOrder.save();
					}
					log.audit('soId :' + soId, inventoryLocation);
				}
			} catch (ex) {
				log.error(functionName, 'exception->' + JSON.stringify(ex));
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