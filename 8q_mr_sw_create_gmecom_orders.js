/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
	Author : Radhakrishnan
	Created Date : 13 Dec 2023
	Purpose : To create GM ECommerce Orders
    Updated: 16 Jan 2025 ERP PRO
    Additions: conditions for Fedex ecom to customer on SO Creation
*/
define(['N/record', 'N/runtime', 'N/search'],
	function(record, runtime, search) {
		function getInputData() {
			// get data from saved search. saved search id passed as a script parameter
			let functionName = 'getInputData';
			try {
				let scriptObj = runtime.getCurrentScript();
				let s_savesearch_ID = scriptObj.getParameter('custscript_8q_mr_gmecom_pending_ss');
				return search.load({
					id: s_savesearch_ID
				});
			} catch (e) {
				log.error(functionName, 'error->' + e.message);
			}
		}

		function hasDuplicates(data) {
			for (let i = 0; i < data.length; i++) {
				for (let j = i + 1; j < data.length; j++) {
					let parseData1 = JSON.parse(data[i]);
					let parseData2 = JSON.parse(data[j]);
					if (parseData1.item === parseData2.item && parseData1.quantity === parseData2.quantity && parseData1.reference===parseData2.reference) {
						return true; // Duplicate found
					}
				}
			}
			return false; // No duplicates found
		}

		function checCustomerAndDealer(data) {
			var isCustomer = false, isDealer = false;
			for (let i = 0; i < data.length; i++) {
				let parseData = JSON.parse(data[i]);
				if ( parseData.deliveryMethod == 'PickupInStore' || parseData.deliveryMethod == 'DealerInstallation' )
					isDealer = true;
				else
				if ( parseData.deliveryMethod == 'GROUND_HOME_DELIVERY' || parseData.deliveryMethod == 'FEDEX_2_DAY' )
					isCustomer = true;
			}
			if( isCustomer && isDealer )
				return true;
			else
				return false;
		}

		function map(context) {
			let functionName = 'map';
			try {
				let data = JSON.parse(context.value);
				let reference = data.values['custrecord_gmecom_orderno'];
				let dataLine = {};
				dataLine.internalId = data.values['internalid'].value;
				dataLine.item = data.values['custrecord_gmecom_item'].value;
				dataLine.quantity = data.values['custrecord_gmecom_qty'];
				dataLine.fulfilNo = data.values['custrecord_gmecom_fulfilno'];
				dataLine.orderDate = data.values['custrecord_gmecom_orderdate'];
				dataLine.dealerBAC = data.values['custrecord_gmecom_dealerbac'];
				dataLine.dealerName = data.values['custrecord_gmecom_dealername'];
				dataLine.createdBy = data.values['custrecord_gmecom_createdby'];
				dataLine.poNumber = data.values['custrecord_gmecom_dealerpono'];
				dataLine.deliveryMethod = data.values['custrecord_gmecom_deliverymethod'];
				dataLine.productLine = data.values['custrecord_gmecom_productline'];
				dataLine.reference = reference;
				context.write({
					key: reference+dataLine.fulfilNo,
					value: dataLine
				});
			} catch (ex) {
				log.error(functionName, 'exception->' + ex);
			}
		}

		function reduce(context) {
			var functionName = 'reduce';
			let returnData = {};
			returnData.internalIds = [];
			try {
				let data = context.values;
				var isCustomerDealer = checCustomerAndDealer(data);

				let customer = '';
				let salesLocation = '';
				let fulfilLocation = '';
				let entityFulfilLocation = '';
				let orderType = '';
				let otherRefNum = '';
				let toReference = '';
				let onlineOrderType = 2;
				let addressText = '';
				let externalId = 'gmecom' + context.key;
				let isDuplicate = false;
				let duplicateOrder = '';
				let parseData = JSON.parse(data[0]);
				let gmEcomRef = parseData.reference;
				let fulfilNo = parseData.fulfilNo;
				let filterData = [];
            	filterData.push(['mainline', 'is', 'T']);
				filterData.push('AND');
				filterData.push(['type', 'anyof', 'SalesOrd']);
				filterData.push('AND');
				if(_logValidation(fulfilNo)){
					filterData.push(['custbody_8q_gm_fulfiller_no', 'is', fulfilNo]);
				}
				else{
					filterData.push(['custbody_8q_gm_orderno', 'is', gmEcomRef]);
				}
				let salesorderSearchObj = search.create({
					type: "salesorder",
					filters: filterData,
					columns: [
						search.createColumn({
							name: "internalid",
							label: "Internal ID"
						}),
						search.createColumn({
							name: "tranid",
							label: "Document Number"
						})
					]
				});
				salesorderSearchObj.run().each(function(result) {
					isDuplicate = true;
					duplicateOrder = result.getValue('tranid');
					return true;
				});
				log.debug('Check Order', 'SO = '+duplicateOrder);

				let swagRoute = '';
				if (_logValidation(parseData.dealerBAC)) {
					var customerSearchObj = search.create({
						type: "customer",
						filters: [
							["stage", "anyof", "CUSTOMER"],
							"AND",
							["custentity_nsts_bac", "is", parseData.dealerBAC],
							"AND",
							["isinactive", "is", "F"]
						],
						columns: [
							search.createColumn({
								name: "custentity_nsps_customer_default_loc",
								label: "Customer Default Location"
							}),
							search.createColumn({
								name: "custentity_8q_fulfillment_f",
								label: "Fulfillment Location"
							}),
							search.createColumn('custentity_swag_routes')
						]
					});
					customerSearchObj.run().each(function(result) {
						customer = result.id;
						salesLocation = result.getValue('custentity_nsps_customer_default_loc');
						fulfilLocation = result.getValue('custentity_8q_fulfillment_f');
						entityFulfilLocation = result.getValue('custentity_8q_fulfillment_f');
						swagRoute = result.getValue('custentity_swag_routes');
						return true;
					});
				}
				log.debug('Check Customer', 'Customer = '+customer);

				if (!_logValidation(customer)) {
					returnData.success = false;
					returnData.errorMessage = 'customer not found for dealer BAC#' + parseData.dealerBAC;
					for (let i = 0; i < data.length; i++) {
						let parseData2 = JSON.parse(data[i]);
						returnData.internalIds.push(parseData2.internalId);
					}
					context.write({
						key: context.key,
						value: returnData
					});
					return;
				}

				log.debug('Check salesLocation', 'salesLocation = '+salesLocation);
				if (!_logValidation(salesLocation)) {
					returnData.success = false;
					returnData.errorMessage = 'Customer record does not contain a valid default location.';
					for (let i = 0; i < data.length; i++) {
						let parseData2 = JSON.parse(data[i]);
						returnData.internalIds.push(parseData2.internalId);
					}
					context.write({
						key: context.key,
						value: returnData
					});
					return;
				}
				if (isDuplicate) {
					returnData.success = false;
					returnData.errorMessage = 'Duplicate order. Order #' + duplicateOrder;
					for (let i = 0; i < data.length; i++) {
						let parseData2 = JSON.parse(data[i]);
						returnData.internalIds.push(parseData2.internalId);
					}
					context.write({
						key: context.key,
						value: returnData
					});
					return;
				}
				//Set fulfillment location = DFW if delivery method = fedex
				/*if (parseData.deliveryMethod == 'FEDEX_2_DAY' || parseData.deliveryMethod == 'GROUND_HOME_DELIVERY' || parseData.deliveryMethod == 'STANDARD_OVERNIGHT')		fulfilLocation = 102;*/
				var objRecord = record.create({
					type: record.Type.SALES_ORDER,
					isDynamic: true
				});
				objRecord.setValue({
					fieldId: 'generatetranidonsave',
					value: true
				});
				objRecord.setValue({
					fieldId: 'entity',
					value: customer
				});
				objRecord.setValue({
					fieldId: 'custbody_8q_gm_fulfiller_no',
					value: parseData.fulfilNo
				});
				objRecord.setValue({
					fieldId: 'location',
					value: salesLocation
				});
				objRecord.setValue({
					fieldId: 'custbody_8q_fulfillment_f',
					value: fulfilLocation
				});
				if (_logValidation(parseData.createdBy)) {
					let shipAddress = objRecord.getValue('shipaddress');
					let addressText = parseData.createdBy;
					addressText += '\n';
					addressText += shipAddress;
					objRecord.setValue({
						fieldId: 'shipaddress',
						value: addressText
					});
				}
				if (parseData.deliveryMethod == 'GROUND_HOME_DELIVERY')
					objRecord.setValue({
						fieldId: 'shipmethod',
						value: 66473
					});	
				else
				if (parseData.deliveryMethod == 'FEDEX_2_DAY')
					objRecord.setValue({
						fieldId: 'shipmethod',
						value: 66482
					});
				else
				if (parseData.deliveryMethod == 'STANDARD_OVERNIGHT')
					objRecord.setValue({
						fieldId: 'shipmethod',
						value: 66476
					});

				objRecord.setValue({
					fieldId: 'custbody_8q_gmecom_order',
					value: true
				});
				let cseg1 = objRecord.getValue('cseg1');
				// if (hasDuplicates(data)) {
				// 	returnData.success = false;
				// 	returnData.errorMessage = 'duplicate item.';
				// 	for (let i = 0; i < data.length; i++) {
				// 		let parseData2 = JSON.parse(data[i]);
				// 		returnData.internalIds.push(parseData2.internalId);
				// 	}
				// 	context.write({
				// 		key: context.key,
				// 		value: returnData
				// 	});
				// 	return;
				// }
				var lineCnt = 0;
				for (let i = 0; i < data.length; i++) {
					let parseData1 = JSON.parse(data[i]);
					if( isCustomerDealer && (parseData1.deliveryMethod == 'PickupInStore' || parseData1.deliveryMethod == 'DealerInstallation'))		continue;
					let parseData = JSON.parse(data[i]);
					returnData.internalIds.push(parseData.internalId);
					if (lineCnt == 0) {
						orderType = parseData.orderType;
						toReference = parseData.toReference;
						shipToCode = parseData.shipToCode;
						if (parseData.deliveryMethod == 'PickupInStore' || parseData.deliveryMethod == 'DealerInstallation') {
							onlineOrderType = 1;
						} else
						if (parseData.deliveryMethod == 'FEDEX_2_DAY' || parseData.deliveryMethod == 'GROUND_HOME_DELIVERY' || parseData.deliveryMethod == 'STANDARD_OVERNIGHT') {
							onlineOrderType = 2;
						}
					}
					objRecord.selectLine({
						sublistId: 'item',
						line: lineCnt
					});
					objRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'item',
						value: parseData.item
					});
					let lookupData = search.lookupFields({
						type: record.Type.INVENTORY_ITEM,
						id: parseData.item,
						columns: ['custitem_nsps_red_list']
					});
					if (lookupData.custitem_nsps_red_list) {
						objRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'commitinventory',
							value: 3
						});
					}
					objRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'quantity',
						value: parseData.quantity
					});
					if (_logValidation(fulfilLocation)) {
						objRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'inventorylocation',
							value: fulfilLocation
						});
					}
					if (_logValidation(cseg1)) {
						objRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'cseg1',
							value: cseg1
						});
					}
					objRecord.commitLine({
						sublistId: 'item'
					});
					lineCnt ++;
				}

				if (_logValidation(parseData.poNumber)) {
					objRecord.setValue({
						fieldId: 'otherrefnum',
						value: parseData.poNumber
					});
					let poNo = parseData.poNumber.substring(0, 2);
					if (poNo == 'EC') {
						objRecord.setValue({
							fieldId: 'shipcomplete',
							value: true
						});
					}
				}
				objRecord.setValue({
					fieldId: 'custbody_nsps_online_ord_type',
					value: onlineOrderType
				});
				objRecord.setValue({
					fieldId: 'custbody_8q_gm_orderno',
					value: gmEcomRef
				});
				let memoText = '';
				memoText += 'Generated through Automation. OrderType: ' + orderType;
				objRecord.setValue({
					fieldId: 'memo',
					value: memoText
				});
				objRecord.setValue({
					fieldId: 'externalid',
					value: externalId
				});
				if (_logValidation(swagRoute)) {
					objRecord.setValue({
						fieldId: 'custbody_nsps_lpo_route',
						value: swagRoute
					});
				}
				let id = objRecord.save();
				log.debug('Created SO', 'Id = '+id);
				returnData.soId = id;
				returnData.success = true;
				returnData.errorMessage = 'Successful';

				if( isCustomerDealer ) {
					var objRecord = record.create({
						type: record.Type.SALES_ORDER,
						isDynamic: true
					});
					objRecord.setValue({
						fieldId: 'generatetranidonsave',
						value: true
					});
					objRecord.setValue({
						fieldId: 'entity',
						value: customer
					});
					objRecord.setValue({
						fieldId: 'custbody_8q_gm_fulfiller_no',
						value: parseData.fulfilNo
					});
					objRecord.setValue({
						fieldId: 'location',
						value: salesLocation
					});
					objRecord.setValue({
						fieldId: 'custbody_8q_fulfillment_f',
						value: entityFulfilLocation
					});
					if (_logValidation(parseData.createdBy)) {
						let shipAddress = objRecord.getValue('shipaddress');
						let addressText = parseData.createdBy;
						addressText += '\n';
						addressText += shipAddress;
						objRecord.setValue({
							fieldId: 'shipaddress',
							value: addressText
						});
					}

					if (parseData.deliveryMethod == 'GROUND_HOME_DELIVERY')
						objRecord.setValue({
							fieldId: 'shipmethod',
							value: 66473
						});	
					else
					if (parseData.deliveryMethod == 'FEDEX_2_DAY')
						objRecord.setValue({
							fieldId: 'shipmethod',
							value: 66482
						});
					else
					if (parseData.deliveryMethod == 'STANDARD_OVERNIGHT')
						objRecord.setValue({
							fieldId: 'shipmethod',
							value: 66476
						});
					objRecord.setValue({
						fieldId: 'custbody_8q_gmecom_order',
						value: true
					});
					let cseg1 = objRecord.getValue('cseg1');
					var lineCnt = 0;
					for (let i = 0; i < data.length; i++) {
						let parseData1 = JSON.parse(data[i]);
						if( parseData1.deliveryMethod != 'PickupInStore' && parseData1.deliveryMethod != 'DealerInstallation' )		continue;
						let parseData = JSON.parse(data[i]);
						returnData.internalIds.push(parseData.internalId);
						if (lineCnt == 0) {
							orderType = parseData.orderType;
							toReference = parseData.toReference;
							shipToCode = parseData.shipToCode;
						}
						objRecord.selectLine({
							sublistId: 'item',
							line: lineCnt
						});
						objRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'item',
							value: parseData.item
						});
						let lookupData = search.lookupFields({
							type: record.Type.INVENTORY_ITEM,
							id: parseData.item,
							columns: ['custitem_nsps_red_list']
						});
						if (lookupData.custitem_nsps_red_list) {
							objRecord.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'commitinventory',
								value: 3
							});
						}
						objRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'quantity',
							value: parseData.quantity
						});
						if (_logValidation(entityFulfilLocation)) {
							objRecord.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'inventorylocation',
								value: entityFulfilLocation
							});
						}
						if (_logValidation(cseg1)) {
							objRecord.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'cseg1',
								value: cseg1
							});
						}
						objRecord.commitLine({
							sublistId: 'item'
						});
						lineCnt ++;
					}
					
					if (_logValidation(parseData.poNumber)) {
						objRecord.setValue({
							fieldId: 'otherrefnum',
							value: parseData.poNumber
						});
						let poNo = parseData.poNumber.substring(0, 2);
						if (poNo == 'EC') {
							objRecord.setValue({
								fieldId: 'shipcomplete',
								value: true
							});
						}
					}
					objRecord.setValue({
						fieldId: 'custbody_nsps_online_ord_type',
						value: 1
					});
					objRecord.setValue({
						fieldId: 'custbody_8q_gm_orderno',
						value: gmEcomRef
					});
					let memoText = '';
					memoText += 'Generated through Automation. OrderType: ' + orderType;
					objRecord.setValue({
						fieldId: 'memo',
						value: memoText
					});
					objRecord.setValue({
						fieldId: 'externalid',
						value: externalId+'1'
					});
					if (_logValidation(swagRoute)) {
						objRecord.setValue({
							fieldId: 'custbody_nsps_lpo_route',
							value: swagRoute
						});
					}
					let id = objRecord.save();
					log.debug('Created SO of PickupInStore', 'Id = '+id);
				}
			} catch (e) {
				log.audit('error on' + functionName, e);
				returnData.success = false;
				if (e.toString().indexOf('DUP_RCRD') !== -1) {
					returnData.errorMessage = 'Duplicate order.'
				} else {
					returnData.errorMessage = e;
				}
			}
			context.write({
				key: context.key,
				value: returnData
			});
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
			summary.output.iterator().each(function(key, value) {
				let data = JSON.parse(value);
				let internalIds = data.internalIds;
				let status = 3;
				let errorMessage = data.errorMessage;
				if (!data.success) {
					status = 4;
				}
				for (let i = 0; i < internalIds.length; i++) {
					let internalId = internalIds[i];
					let updateObj = {};
					updateObj.custrecord_gmecom_error_message = errorMessage;
					updateObj.custrecord_gmecom_status = status;
					if (_logValidation(data.soId)) {
						updateObj.custrecord_gmecom_ns_order = data.soId;
					}
					record.submitFields({
						type: 'customrecord_8q_gm_ecom_staging_order',
						id: internalId,
						values: updateObj
					});
				}
				return true;
			});
		}
		return {
			getInputData: getInputData,
			map: map,
			reduce: reduce,
			summarize: summarize
		};
	});