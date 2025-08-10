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
				let s_savesearch_ID = scriptObj.getParameter('custscript_8q_mr_lpo_pendingSOs_ss');
				return search.load({
					id: s_savesearch_ID
				});
			} catch (e) {
				log.error(functionName, 'error->' + e.message);
			}
		}

		function map(context) {
			let functionName = 'map';
			let soId = context.key;
			try {
				if (!_logValidation(context.key)) {
					log.audit('NO_RECORDS_FOUND', 'No data to process');
					return;
				}
				let committed = true;
				let objSalesOrder = record.load({
					type: record.Type.SALES_ORDER,
					id: soId,
					isDynamic: true
				});
				let lineCount = objSalesOrder.getLineCount({
					sublistId: 'item'
				});
				// tire order to be created only for those sales orders which are fully committed
				for (let i = 0; i < lineCount; i++) {
					let itemType = objSalesOrder.getSublistValue({
						sublistId: 'item',
						fieldId: 'itemtype',
						line: i
					});
					if (itemType == 'InvtPart') {
						let qty = objSalesOrder.getSublistValue({
							sublistId: 'item',
							fieldId: 'quantity',
							line: i
						});
						let qtyCommitted = objSalesOrder.getSublistValue({
							sublistId: 'item',
							fieldId: 'quantitycommitted',
							line: i
						});
						if (qty != qtyCommitted) {
							committed = false;
							break;
						}
					}
				}
				// committed true means no lines that are not fully committed. proceed to create tire order
				if (committed) {
					let customer = objSalesOrder.getValue('custbody_nsts_send_to_customer');
					if (!_logValidation(customer)) {
						log.audit('MISSING_DATA', 'SO Id:' + soId + ', field:send to customer');
						return;
					}
					let objRec = record.copy({
						type: record.Type.SALES_ORDER,
						id: soId,
						isDynamic: true
					});
					objRec.setValue('entity', customer);
					objRec.setValue('custbody_nsts_send_to_customer', '');
					objRec.setValue('custbody_8q_origin_sales_order', soId);
					objRec.setValue('custbody_mhi_transit_invoice', true);
					objRec.setValue('custbody_nsps_contains_mb', false);
					objRec.setValue('custbody_nsps_online_ord_type', 15);
					let lineCount = objRec.getLineCount({
						sublistId: 'item'
					});
					let packageNumber = '';
					let location = ''
					let cseg1 = '';
					// get package number from first line and remove all the lines
					objRec.selectLine({
						sublistId: 'item',
						line: 0
					});
					packageNumber = objRec.getCurrentSublistValue({
						sublistId: 'item',
						fieldId: "custcol_nsts_lpo_package_num"
					});
					location = objRec.getCurrentSublistValue({
						sublistId: 'item',
						fieldId: "inventorylocation"
					});
					cseg1 = objRec.getCurrentSublistValue({
						sublistId: 'item',
						fieldId: "cseg1"
					});
					for(let i=0;i<lineCount;i++){
						objRec.selectLine({
							sublistId: 'item',
							line: i
						});
						let desc = objRec.getCurrentSublistValue({
							sublistId: 'item',
							fieldId: "description"
						});
						let lineToWave = objRec.getCurrentSublistValue({
							sublistId: 'item',
							fieldId: "custcol_wheel_line_to_wave"
						});
						if(lineToWave){
							packageNumber = objRec.getCurrentSublistValue({
								sublistId: 'item',
								fieldId: "custcol_nsts_lpo_package_num"
							});
							location = objRec.getCurrentSublistValue({
								sublistId: 'item',
								fieldId: "inventorylocation"
							});
							cseg1 = objRec.getCurrentSublistValue({
								sublistId: 'item',
								fieldId: "cseg1"
							});
							break;
						}
					}
					for (let i = lineCount - 1; i >= 0; i--) {
						objRec.removeLine({
							sublistId: 'item',
							line: i
						});
					}
					// search for item with alias as package number
					let failureReason='';
					if (_logValidation(packageNumber)) {
						let item = '';
						let customrecord_wmsse_sku_aliasSearchObj = search.create({
							type: "customrecord_wmsse_sku_alias",
							filters: [
								["name", "is", packageNumber.toString()]
							],
							columns: [
								search.createColumn({
									name: "custrecord_wmsse_alias_item",
									label: "Item"
								})
							]
						});
						customrecord_wmsse_sku_aliasSearchObj.run().each(function(result) {
							item = result.getValue('custrecord_wmsse_alias_item');
							return true;
						});
						// add item to the sublist
						if (_logValidation(item)) {
							objRec.selectNewLine({
								sublistId: 'item'
							});
							objRec.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'item',
								value: item
							});
							if (_logValidation(location)) {
								objRec.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'inventorylocation',
									value: location
								});
							}
							if (_logValidation(cseg1)) {
								objRec.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'cseg1',
									value: cseg1
								});
							}
							objRec.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'quantity',
								value: 4
							});
							objRec.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'price',
								value: 8
							});
							objRec.commitLine({
								sublistId: 'item'
							});
							let newSOId = objRec.save();
							if (_logValidation(newSOId)) {
								objSalesOrder.setValue('custbody_8q_linked_sales_order', newSOId);
								objSalesOrder.setValue('custbody_8q_lpo_order_created', true);
								objSalesOrder.setValue('custbody_8q_tireord_failure_reason', '');
								objSalesOrder.save();

								// Re-set Price Level to 8, Transit Price, if needed. Added by Fred McIntyre 7/18/2024
								objRec = record.load({type: 'salesorder', id: newSOId, isDynamic: false});
								lineCount = objRec.getLineCount({sublistId: 'item'});
								let save = false;
								for (let i = 0; i < lineCount; i++) {
									let priceLevel = objRec.getSublistText({sublistId: 'item', fieldId: 'price', line: i});
									if (priceLevel !== 'Transit Price') {
										objRec.setSublistValue({
											sublistId: 'item',
											fieldId: 'price',
											value: 8,
											line: i
										});
										save = true;
										log.audit('CHANGED','Line '+i+', Price Level from '+priceLevel+' to Transit Price');
									}
								}
								if (save) {
									objRec.save();
								}
								// end Fred add
							}
							log.audit('CREATED', 'LPO Order #' + newSOId + ' has been created for #' + soId);
						}
						else{
							failureReason='Missing Alias. Package #'+packageNumber;
						}
					}
					else{
						log.audit('MISSING_DATA', 'SO Id:' + soId + ', field: package number');
						failureReason='Missing Package Number';
					}
					if(_logValidation(failureReason)){
						record.submitFields({
							type: record.Type.SALES_ORDER,
							id: soId,
							values: {
								custbody_8q_tireord_failure_reason: failureReason
							},
							options: {
								enableSourcing: false,
								ignoreMandatoryFields: true
							}
						});
					}
				}
			} catch (ex) {
				log.error(functionName + ': #' + soId, 'exception->' + ex);
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