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
				let s_savesearch_ID = scriptObj.getParameter('custscript_8q_mr_linn_pending_ss');
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
					if (parseData1.item === parseData2.item && parseData1.quantity === parseData2.quantity) {
						return true; // Duplicate found
					}
				}
			}
			return false; // No duplicates found
		}

		function map(context) {
			let functionName = 'map';
			try {
				let data = JSON.parse(context.value);
				let reference = data.values['custrecord_mhi_reference'];
				let dataLine = {};
				dataLine.internalId = data.values['internalid'].value;
				dataLine.item = data.values['custrecord_mhi_part_item'].value;
				dataLine.quantity = data.values['custrecord_mhi_qty'];
				dataLine.orderType = data.values['custrecord_mhi_order_type'];
				dataLine.toReference = data.values['custrecord_mhi_to_reference'];
				dataLine.addressName = data.values['custrecord_mhi_shipping_address_name'];
				dataLine.company = data.values['custrecord_mhi_company'];
				dataLine.address = data.values['custrecord_mhi_address'];
				dataLine.city = data.values['custrecord_mhi_city'];
				dataLine.state = data.values['custrecord_mhi_state'];
				dataLine.zip = data.values['custrecord_mhi_zip_code'];
				dataLine.shipToCode = data.values['custrecord_mhi_ship_to_code'];
				dataLine.fadCode = data.values['custrecord_mhi_fad_code'];
				dataLine.reference = reference;
				context.write({
					key: reference,
					value: dataLine
				});
			} catch (ex) {
				log.error(functionName + ': #' + soId, 'exception->' + ex);
			}
		}

		function reduce(context) {
			var functionName = 'reduce';
			let returnData = {};
			returnData.internalIds = [];
			try {
				let data = context.values;
				let customer = 1244;
				let salesLocation = '';
				let fulfilLocation = '';
				let orderType = '';
				let otherRefNum = '';
				let toReference = '';
				let fadCode = '';
				let shipToCode = '';
				let onlineOrderType = '';
				let addressText = '';
				let externalId = 'linnworks' + context.key.replace('FAE:', '');
				let isDuplicate = false;
				let duplicateOrder = '';
				let parseData = JSON.parse(data[0]);
				let linnworksRef = parseData.reference.replace('FAE:', '');
				fadCode = parseData.fadCode;
				let salesorderSearchObj = search.create({
					type: "salesorder",
					filters: [
						["mainline", "is", "T"],
						"AND",
						["type", "anyof", "SalesOrd"],
						"AND",
						[
							["otherrefnum", "equalto", linnworksRef], "OR", ["custbody8", "is", linnworksRef]
						],
						//"AND",
						//["custbody_8q_fadcode", "is", fadCode]
					],
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
					fieldId: 'custbody_8q_linnworks_order',
					value: true
				});
				let cseg1 = objRecord.getValue('cseg1');
				if (_logValidation(parseData.fadCode)) {
					let customrecord_8q_sales_location_matrixSearchObj = search.create({
						type: "customrecord_8q_sales_location_matrix",
						filters: [
							["custrecord_8q_slm_code", "is", parseData.fadCode]
						],
						columns: [
							search.createColumn({
								name: "custrecord_8q_slm_saleslocation",
								label: "Sales Location"
							}),
							search.createColumn({
								name: "custrecord_8q_slm_fulfillocation",
								label: "Fulfilment Location"
							})
						]
					});
					customrecord_8q_sales_location_matrixSearchObj.run().each(function(result) {
						salesLocation = result.getValue('custrecord_8q_slm_saleslocation');
						fulfilLocation = result.getValue('custrecord_8q_slm_fulfillocation');
						return true;
					});
					if (!_logValidation(salesLocation)) {
						returnData.success = false;
						returnData.errorMessage = 'Location not found for the code:' + parseData.fadCode;
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
				}
				if (hasDuplicates(data)) {
					returnData.success = false;
					returnData.errorMessage = 'duplicate item.';
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
				objRecord.setValue({
					fieldId: 'location',
					value: salesLocation
				});
				objRecord.setValue({
					fieldId: 'custbody_8q_fulfillment_f',
					value: fulfilLocation
				});
				for (let i = 0; i < data.length; i++) {
					let parseData = JSON.parse(data[i]);
					returnData.internalIds.push(parseData.internalId);
					fadCode = parseData.fadCode;
					if (i == 0) {
						orderType = parseData.orderType;
						toReference = parseData.toReference;
						shipToCode = parseData.shipToCode;
						if (_logValidation(parseData.addressName)) {
							addressText = parseData.addressName;
							addressText += '\n';
						}
						//addressText += parseData.company;
						//addressText += '\n';
						addressText += parseData.address;
						addressText += '\n';
						addressText += parseData.city;
						addressText += '\n';
						addressText += parseData.state;
						addressText += '\n';
						addressText += parseData.zip;
					}
					if (_logValidation(parseData.fadCode)) {
						let customrecord_8q_sales_location_matrixSearchObj = search.create({
							type: "customrecord_8q_sales_location_matrix",
							filters: [
								["custrecord_8q_slm_code", "is", parseData.fadCode]
							],
							columns: [
								search.createColumn({
									name: "custrecord_8q_slm_saleslocation",
									label: "Sales Location"
								}),
								search.createColumn({
									name: "custrecord_8q_slm_fulfillocation",
									label: "Fulfilment Location"
								})
							]
						});
						customrecord_8q_sales_location_matrixSearchObj.run().each(function(result) {
							salesLocation = result.getValue('custrecord_8q_slm_saleslocation');
							fulfilLocation = result.getValue('custrecord_8q_slm_fulfillocation');
							return true;
						});
						if (!_logValidation(salesLocation)) {
							returnData.success = false;
							returnData.errorMessage = 'Location not found for the code:' + parseData.fadCode;
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
					}
					objRecord.selectLine({
						sublistId: 'item',
						line: i
					});
					objRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'item',
						value: parseData.item
					});
					objRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'quantity',
						value: parseData.quantity
					});
					objRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'inventorylocation',
						value: fulfilLocation
					});
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
				}
				if (_logValidation(toReference)) {
					otherRefNum = toReference.replace('TRA', '');
				} else {
					otherRefNum = linnworksRef;
				}
				if (orderType == 'PICK') {
					onlineOrderType = 14;
				} else {
					onlineOrderType = 13;
				}
				objRecord.setValue({
					fieldId: 'otherrefnum',
					value: otherRefNum
				});
				objRecord.setValue({
					fieldId: 'custbody_nsps_online_ord_type',
					value: onlineOrderType
				});
				objRecord.setValue({
					fieldId: 'custbody8',
					value: linnworksRef
				});
				let memoText = '';
				memoText += 'Generated through Automation. OrderType: ' + orderType;
				objRecord.setValue({
					fieldId: 'memo',
					value: memoText
				});
				if (_logValidation(shipToCode)) {
					shipToCode = parseInt(shipToCode);
					let address = '';
					let shipToCustomer = '';
					let swagRoute = '';
					let customerSearchObj = search.create({
						type: "customer",
						filters: [
							["entityid", "is", shipToCode],
							//"AND",
							//["isdefaultbilling", "is", "T"]
						],
						columns: [
							search.createColumn({
								name: "address",
								label: "Address"
							}),
							search.createColumn({
								name: "isdefaultshipping",
								label: "Default Shipping Address"
							}),
							search.createColumn({
								name: "internalid",
								label: "Internal ID"
							}),
							search.createColumn('custentity_swag_routes')
						]
					});
					customerSearchObj.run().each(function(result) {
						let defaultShipping = result.getValue('isdefaultshipping');
						shipToCustomer = result.getValue('internalid');
						swagRoute = result.getValue('custentity_swag_routes');
						if (defaultShipping) {
							address = result.getValue('address');
						}
						return true;
					});
					if (_logValidation(address)) {
						addressText = address;
					}
					if (_logValidation(shipToCustomer)) {
						objRecord.setValue({
							fieldId: 'custbody_nsts_send_to_customer',
							value: shipToCustomer
						});
					}
					if (_logValidation(swagRoute)) {
						objRecord.setValue({
							fieldId: 'custbody_nsps_lpo_route',
							value: swagRoute
						});
					}
				}
				objRecord.setValue({
					fieldId: 'shipaddress',
					value: addressText
				});
				objRecord.setValue({
					fieldId: 'externalid',
					value: externalId
				});
				let id = objRecord.save();
				returnData.soId = id;
				returnData.success = true;
				returnData.errorMessage = 'Successful';
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
					updateObj.custrecord_mhi_error_message = errorMessage;
					updateObj.custrecord_mhi_status = status;
					if (_logValidation(data.soId)) {
						updateObj.custrecord_mhi_ns_order = data.soId;
					}
					record.submitFields({
						type: 'customrecord_mhi_linnworks_staging_order',
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