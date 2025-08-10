/**
 * Copyright (c) 1998-2021 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved
 *
 * This software is the confidential and proprietary information of NetSuite, Inc.  ('Confidential Information').
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license
 * you entered into with NetSuite
 */
/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @author: Shalabh Saxena
 * @NScriptType MapReduceScript
 *
 * Version	 Date		Author		Remarks
 * 1.0		 04/04/2022  Shalabh Saxena  Initial Version
 * 1.1		 07/07/2022  P Ries		Fix for TI 1
 * 1.2		 08/09/2022  P Ries		Fix for TI 6
 * 1.3		 08/10/2022  P Ries		CSETD-16624 - add Support for ATL location
 * 1.4		 09/22/2022  P Ries		Change discountAmount to a negative number
 * 1.5		 10/26/2022  P Ries		TI 24 - add MEO GM location
 * 1.6		 11/04/2022  P Ries		TI 35 - set APR from Ship To customer
 * 1.7		 07/12/2023  Fred McIntyre, 8Quanta		Use LPO Price Level for all LPO items. Do not add discountAmount. 
 * 1.8		 07/12/2023  Fred McIntyre, 8Quanta		Add four locations. Use Ford Customer or GM Customer for all locations.
 * 1.9		 07/30/2023  Fred McIntyre, 8Quanta		Add Fulfillment Location from Customer to item Inventory Location. Set iscrosssubtransaction: true
 */

define(['N/error', 'N/record', 'N/runtime', 'N/search', 'N/email', 'N/cache', 'N/format', 'SuiteScripts/_nscs/Libraries/NSUtilvSS2'],
	function(error, record, runtime, search, email, cache, format, NSUtil) {

		function getLpoRedListCommitIds() {
			// This is the internal ids for: 1256 GENERAL MOTORS CORP-LPO, 1565 GENERAL MOTORS CORP-HOUSTON LPO
			// If customer is not one of these and Red List is checked, set commit to Do Not Commit
			return [1776, 2131]
		}

		function getCustomizationPrefrences() {

			var objnsUtilPrefrences = NSUtil.getPreferences([
				'custrecord_lpo_staging_order_ss',
				'custrecord_lpo_kitpack_item_ss',
				'custrecord_lpo_inv_item_ss',
				'custrecord_lpo_dealer_ss',
				'custrecord_lpo_staging_reimbursements_ss',
				'custrecord_lpo_price_level',
				//			'custrecord_lpo_gm_customer_dfw_lpo',
				//			'custrecord_lpo_ford_customer_atlanta_dio',
				//			'custrecord_lpo_ford_customer_dfw_dio',
				//			'custrecord_lpo_ford_customer_houston_dio',
				//			'custrecord_lpo_ford_customer_memphis_dio',
				//			'custrecord_lpo_gm_customer_houston_lpo',
				//			'custrecord_lpo_gm_customer_meo_lpo',
				'custrecord_lpo_ford_location_atl_dio',
				'custrecord_lpo_ford_location_dfw_ford',
				'custrecord_lpo_ford_location_hou_dio',
				'custrecord_lpo_ford_location_mem_dio',
				'custrecord_lpo_ford_location_phx_dio',
				'custrecord_lpo_ford_location_ran_dio',
				'custrecord_lpo_gm_location_meo_gm',
				'custrecord_lpo_gm_location_dfw_gm',
				'custrecord_lpo_gm_location_houston_gm',
				'custrecord_lpo_gm_location_phx_gm',
				'custrecord_lpo_gm_location_ran_gm',
				'custrecord_lpo_gm_dfw_ship_to_code',
				'custrecord_lpo_gm_houston_ship_to_code',
				'custrecord_lpo_gm_meo_ship_to_code',
				'custrecord_lpo_gm_ran_ship_to_code',
				'custrecord_lpo_gm_phx_ship_to_code',
				'custrecord_lpo_other_charge_item',
				'custrecord_lpo_discount_item',
				'custrecord_lpo_ford_customer_so_dio',
				'custrecord_lpo_gm_customer_so_lpo'
			]);

			var nsUtilPrefrencesObj = {
				custrecord_lpo_staging_order_ss: objnsUtilPrefrences['custrecord_lpo_staging_order_ss'].value || 0,
				custrecord_lpo_kitpack_item_ss: objnsUtilPrefrences['custrecord_lpo_kitpack_item_ss'].value || 0,
				custrecord_lpo_inv_item_ss: objnsUtilPrefrences['custrecord_lpo_inv_item_ss'].value || 0,
				custrecord_lpo_dealer_ss: objnsUtilPrefrences['custrecord_lpo_dealer_ss'].value || 0,
				custrecord_lpo_staging_reimbursements_ss: objnsUtilPrefrences['custrecord_lpo_staging_reimbursements_ss'].value || 0,
				custrecord_lpo_price_level: objnsUtilPrefrences['custrecord_lpo_price_level'].value || 0,
				//				custrecord_lpo_gm_customer_dfw_lpo : objnsUtilPrefrences['custrecord_lpo_gm_customer_dfw_lpo'].value || 0,
				//				custrecord_lpo_ford_customer_atlanta_dio : objnsUtilPrefrences['custrecord_lpo_ford_customer_atlanta_dio'].value || 0,
				//				custrecord_lpo_ford_customer_dfw_dio : objnsUtilPrefrences['custrecord_lpo_ford_customer_dfw_dio'].value || 0,
				//				custrecord_lpo_ford_customer_houston_dio : objnsUtilPrefrences['custrecord_lpo_ford_customer_houston_dio'].value || 0,
				//				custrecord_lpo_ford_customer_memphis_dio : objnsUtilPrefrences['custrecord_lpo_ford_customer_memphis_dio'].value || 0,
				//				custrecord_lpo_gm_customer_houston_lpo : objnsUtilPrefrences['custrecord_lpo_gm_customer_houston_lpo'].value || 0,
				//				custrecord_lpo_gm_customer_meo_lpo : objnsUtilPrefrences['custrecord_lpo_gm_customer_meo_lpo'].value || 0,			 // v1.5 added
				custrecord_lpo_ford_location_atl_dio: objnsUtilPrefrences['custrecord_lpo_ford_location_atl_dio'].value || 0,
				custrecord_lpo_ford_location_dfw_ford: objnsUtilPrefrences['custrecord_lpo_ford_location_dfw_ford'].value || 0,
				custrecord_lpo_ford_location_hou_dio: objnsUtilPrefrences['custrecord_lpo_ford_location_hou_dio'].value || 0,
				custrecord_lpo_ford_location_mem_dio: objnsUtilPrefrences['custrecord_lpo_ford_location_mem_dio'].value || 0,
				custrecord_lpo_ford_location_phx_dio: objnsUtilPrefrences['custrecord_lpo_ford_location_phx_dio'].value || 0, // v1.8 added
				custrecord_lpo_ford_location_ran_dio: objnsUtilPrefrences['custrecord_lpo_ford_location_ran_dio'].value || 0, // v1.8 added
				custrecord_lpo_gm_location_dfw_gm: objnsUtilPrefrences['custrecord_lpo_gm_location_dfw_gm'].value || 0,
				custrecord_lpo_gm_location_phx_gm: objnsUtilPrefrences['custrecord_lpo_gm_location_phx_gm'].value || 0, // v1.8 added
				custrecord_lpo_gm_location_ran_gm: objnsUtilPrefrences['custrecord_lpo_gm_location_ran_gm'].value || 0, // v1.8 added
				custrecord_lpo_gm_dfw_ship_to_code: objnsUtilPrefrences['custrecord_lpo_gm_dfw_ship_to_code'].value || '',
				custrecord_lpo_gm_location_houston_gm: objnsUtilPrefrences['custrecord_lpo_gm_location_houston_gm'].value || 0,
				custrecord_lpo_gm_location_meo_gm: objnsUtilPrefrences['custrecord_lpo_gm_location_meo_gm'].value || 0, // v1.5 added
				custrecord_lpo_gm_houston_ship_to_code: objnsUtilPrefrences['custrecord_lpo_gm_houston_ship_to_code'].value || '',
				custrecord_lpo_gm_meo_ship_to_code: objnsUtilPrefrences['custrecord_lpo_gm_meo_ship_to_code'].value || '', // v1.5 added
				custrecord_lpo_gm_ran_ship_to_code: objnsUtilPrefrences['custrecord_lpo_gm_ran_ship_to_code'].value || '', // v1.8 added
				custrecord_lpo_gm_phx_ship_to_code: objnsUtilPrefrences['custrecord_lpo_gm_phx_ship_to_code'].value || '', // v1.8 added
				custrecord_lpo_other_charge_item: objnsUtilPrefrences['custrecord_lpo_other_charge_item'].value || 0,
				custrecord_lpo_discount_item: objnsUtilPrefrences['custrecord_lpo_discount_item'].value || 0,
				custrecord_lpo_ford_customer_so_dio: objnsUtilPrefrences['custrecord_lpo_ford_customer_so_dio'].value || 0, // v1.8 added
				custrecord_lpo_gm_customer_so_lpo: objnsUtilPrefrences['custrecord_lpo_gm_customer_so_lpo'].value || 0 // v1.8 added
			};

			return nsUtilPrefrencesObj;
		}

		function getUniqueItem(context, itemType) {
			var itemSet = new Set();

			for (var i in context.values) {
				log.debug('for each value  : ', context.values[i] + '\n');
				var value = JSON.parse(context.values[i]);
				if (itemType == 'Kit') {
					if (!isEmpty(value.lpo_package_num)) {
						itemSet.add(value.lpo_package_num)
					}
				} else {
					itemSet.add(value.lpo_part_num)
				}
			}
			var itemArray = [];

			if (itemSet.size > 0) {
				itemArray = Array.from(itemSet);
			}

			return itemArray;
		}

		function getItemMap(itemType, itemArray, stItemSearch) {
			var packageArrayMap = [];
			var nonKitItemArray = [];
			var itemObjArray = [];

			for (var i = 0; i < itemArray.length; i++) {
				log.debug('itemArray[i]  : ', itemArray[i] + '\n');
				let itemExternalId = itemArray[i];
				if (itemExternalId.charAt(0) == '0') {
					itemExternalId = itemExternalId.slice(1);
				}

				var arSearchCriteria = {
					SearchId: stItemSearch,
					Filter: [{
						FieldName: 'externalid',
						FieldValue: itemExternalId, //itemArray[i],
						FieldOperator: search.Operator.IS
					}]
				};

				var objPagedSearch = executeSearch(arSearchCriteria);

				var intPageRangesLength = objPagedSearch.getRange({
					start: 0,
					end: 50
				}).length;

				log.debug('item found intPageRangesLength: ', intPageRangesLength + '\n');

				if (intPageRangesLength > 1) {
					var objError = error.create({
						name: 'TOO_MANY_RECORDS_FOUND',
						message: 'Multiple records found for Item: ' + itemArray[i]
					});
					throw objError;
				} else if (intPageRangesLength == 1) {
					var objItem = objPagedSearch.getRange({
						start: 0,
						end: 50
					});

					itemObjArray.push({
						item: itemArray[i],
						id: parseInt(objItem[0].id)
					});

					if (itemType == 'Kit') {
						packageArrayMap.push(itemArray[0])
					}
				} else if (itemType == 'Kit') { //Kit Item not found; needed for check if it is an item logic
					nonKitItemArray.push(itemArray[i]); //Add non Kit item to nonKitItemArray
				} else {
					log.debug('Error  : ', 'Item not found for external id: ' + itemArray[i] + '\n');

					var objError = error.create({
						name: 'RECORD_NOT_FOUND',
						message: `Item not found for external id: ${itemArray[i]}.`
					});
					throw objError;
				}
			}

			var getItemMapObj = {
				itemObjArray: itemObjArray,
				nonKitItemArray: nonKitItemArray,
				packageArrayMap: packageArrayMap
			};

			log.debug('JSON.stringify(getItemMapObj): ', JSON.stringify(getItemMapObj) + '\n');

			return getItemMapObj;
		}

		function executeSearch(arSearchCriteria) {
			log.debug('executeItemSearch arSearchCriteria  : ', JSON.stringify(arSearchCriteria) + '\n');

			var itemSearchObj = search.load({
				id: arSearchCriteria.SearchId
			});

			var arrSearchFilters = arSearchCriteria.Filter;
			var arrCreateFilters = arrSearchFilters.reduce(function(functionFilters, functionFilter) {

				log.debug('functionFilter.FieldValue: ', functionFilter.FieldValue + '\n');
				var objFunctionItemFilter = search.createFilter({
					name: functionFilter.FieldName,
					operator: functionFilter.FieldOperator,
					values: functionFilter.FieldValue
				});

				log.debug('executeItemSearch objFunctionItemFilter: ', JSON.stringify(objFunctionItemFilter) + '\n');
				log.debug('typeof objFunctionItemFilter: ', typeof objFunctionItemFilter + '\n');

				functionFilters.push(objFunctionItemFilter);

				return functionFilters;

			}, []);

			log.debug('JSON.stringify(arrCreateFilters): ', JSON.stringify(arrCreateFilters) + '\n');
			log.debug('arrCreateFilters.length: ', arrCreateFilters.length + '\n');

			for (var i = 0; i < arrCreateFilters.length; i++) {
				log.debug('push to filters JSON.stringify(arrCreateFilters[i]): ', JSON.stringify(arrCreateFilters[i]) + '\n');
				itemSearchObj.filters.push(arrCreateFilters[i]);
			}

			log.debug('JSON.stringify(itemSearchObj): ', JSON.stringify(itemSearchObj) + '\n');

			var objSearch = itemSearchObj.run();

			log.debug('Run JSON.stringify(objSearch)  : ', JSON.stringify(objSearch) + '\n');

			return objSearch;
		}

		function getDealerOrCustomer(stDealerCustomerId, nsUtilPrefrencesObj) {
			var arSearchCriteria = {
				SearchId: nsUtilPrefrencesObj.custrecord_lpo_dealer_ss,
				Filter: [{
					FieldName: 'custentity_nsts_bac',
					FieldValue: stDealerCustomerId,
					FieldOperator: search.Operator.IS
				}]
			};

			var objPagedSearch = executeSearch(arSearchCriteria);

			var intPageRangesLength = objPagedSearch.getRange({
				start: 0,
				end: 50
			}).length;

			log.debug('get Dealer intPageRangesLength  : ', intPageRangesLength + '\n');

			if (intPageRangesLength > 1) {
				var objError = error.create({
					name: 'TOO_MANY_RECORDS_FOUND',
					message: 'Multiple Dealer or Customer records found for BAC: ' + stDealerCustomerId
				});
				throw objError;
			} else if (intPageRangesLength == 1) {
				var objDealer = objPagedSearch.getRange({
					start: 0,
					end: 50
				});

				log.debug('objDealerorCustomer: ', JSON.stringify(objDealer) + '\n');

				return {
					dealerOrCustomerInternalId: parseInt(objDealer[0].id),
					dealerOrCustomerDefaultLocation: objDealer[0].getValue('custentity_nsps_customer_default_loc') || 0,
					dealerOrCustomerRoute: objDealer[0].getValue('custentity_swag_routes') || '', // v1.2 added
					dealerOrCustomerFulfillmentLocation: objDealer[0].getValue('custentity_8q_fulfillment_f') || '' // v1.9 added
				};
			} else {
				log.debug('Error  : ', 'Dealer or Customer not found for BAC: ' + stDealerCustomerId + '\n');

				var objError = error.create({
					name: 'RECORD_NOT_FOUND',
					message: 'Dealer or Customer not found for BAC: ' + stDealerCustomerId
				});
				throw objError;
			}
		}

		function getDealerShipAddress(dealerId, transactionType) {

			var recCustomer = record.load({
				type: record.Type.CUSTOMER,
				id: dealerId,
				isDynamic: false
			});

			log.debug('JSON.stringify(recCustomer)  : ', JSON.stringify(recCustomer) + '\n');

			var intAddressbookCount = recCustomer.getLineCount('addressbook');

			log.debug('intAddressbookCount: ', intAddressbookCount + '\n');

			var stAddressLabel, blDefaultShip, obShipAddress, obLPOAddress, blDefaultShip, stAddressLabel, blLPOAddrFlag;

			for (var i = 0; i < intAddressbookCount; i++) {
				log.debug('JSON.stringify(recCustomer.getSublistValue)  : ', JSON.stringify(recCustomer.getSublistValue) + '\n');

				//var blDefaultBill = recCustomer.getSublistValue('addressbook', 'defaultbilling', i);
				blDefaultShip = recCustomer.getSublistValue('addressbook', 'defaultshipping', i);
				stAddressLabel = recCustomer.getSublistValue('addressbook', 'label', i);

				log.debug('stAddressLabel: ', stAddressLabel + ' ' + blDefaultShip + '\n');

				if (blDefaultShip) {
					obShipAddress = recCustomer.getSublistSubrecord('addressbook', 'addressbookaddress', i);
					log.debug('JSON.stringify(obShipAddress)  : ', JSON.stringify(obShipAddress) + '\n');
				}

				//transactionType == 'LPO' is removed by Rad, 8Quanta, on 18 Apr 2024 
				if (stAddressLabel == 'LPO/DIO Address') {
					obLPOAddress = recCustomer.getSublistSubrecord('addressbook', 'addressbookaddress', i);
					log.debug('JSON.stringify(obLPOAddress)  : ', JSON.stringify(obLPOAddress) + '\n');
					blLPOAddrFlag = true;
				}
			}

			// v1.6 added
			const areaofPriResp = recCustomer.getValue('cseg1') || '';

			var shippToInformation = new Object;

			if (blLPOAddrFlag) {
				shippToInformation = {
					shippToAddress: obLPOAddress,
					areaofPriResp: areaofPriResp,
					shippingInfo: {
						shipMethod: recCustomer.getValue('custentity_nsps_rc_pref_ship_method') || '',
						truckNo: recCustomer.getValue('custentity_nsps_truck_number') || ''
					}
				};
			} else {
				shippToInformation = {
					shippToAddress: obShipAddress,
					areaofPriResp: areaofPriResp,
					shippingInfo: {
						shipMethod: recCustomer.getValue('custentity_nsps_rc_pref_ship_method') || '',
						truckNo: recCustomer.getValue('custentity_nsps_truck_number') || ''
					}
				};
			}

			return shippToInformation;
		}

		function addReimbursementLines(recSalesOrder, reimbObjArray, nsUtilPrefrencesObj) {
			log.debug('addReimbursementLines recSalesOrder: ', JSON.stringify(recSalesOrder) + '\n');
			log.debug('addReimbursementLines reimbObjArray: ', JSON.stringify(reimbObjArray) + '\n');

			// Start Execute Item Supersession
			//let scriptId = runtime.getCurrentScript().id;
			//nsLibCommon.itemSupersession(scriptId,'' ,recSalesOrder);
			// End Execute Item Supersession

			objSalesOrderRecord = record.load({
				type: record.Type.SALES_ORDER,
				id: recSalesOrder,
				isDynamic: true,
			});

			var orderType = objSalesOrderRecord.getValue({
				fieldId: 'custbody_nsps_load_order_type'
			});

			var itemLineCount = objSalesOrderRecord.getLineCount({
				"sublistId": "item"
			});

			log.debug('addReimbursementLines itemLineCount: ', JSON.stringify(itemLineCount) + '\n');

			var packageObjItems = [];

			for (i = 0; i < itemLineCount; i++) {
				var lineItemPackageNum = objSalesOrderRecord.getSublistValue({
					sublistId: 'item',
					fieldId: 'custcol_nsts_lpo_package_num',
					line: i
				});

				log.debug('lineItemPackageNum  ', lineItemPackageNum + '\n');
				var lineItemAmount = objSalesOrderRecord.getSublistValue({
					sublistId: 'item',
					fieldId: 'amount',
					line: i
				});
				log.debug('lineItemPackageNum  ', lineItemPackageNum + '\n');
				log.debug('lineItemAmount  ', lineItemAmount + '\n');

				var lineItemQunatity = objSalesOrderRecord.getSublistValue({
					sublistId: 'item',
					fieldId: 'quantity',
					line: i
				});
				log.debug('lineItemQunatity  ', lineItemQunatity + '\n');


				//if (lineItemQunatity > 1) {
				packageObjItems.push({
					package: lineItemPackageNum,
					itemAmount: lineItemAmount,
					itemQuantity: lineItemQunatity
				});
				//}

			}

			log.debug('addReimbursementLines packageObjItems: ', JSON.stringify(packageObjItems) + '\n');
			log.debug('addReimbursementLines reimbObjArray: ', JSON.stringify(reimbObjArray) + '\n');
			// Added by Rad , 8quanta on 10 Oct 2024.
			let reimbObjArraySingle = [getReimbursementSingle(reimbObjArray)];
			log.debug('addReimbursementLines reimbObjArraySingle: ', JSON.stringify(reimbObjArraySingle) + '\n');

			var mapReimbObjArray = reimbObjArraySingle.map(function(reimbObj) {

				log.debug('addReimbursementLines nsUtilPrefrencesObj.custrecord_lpo_other_charge_item: ', nsUtilPrefrencesObj.custrecord_lpo_other_charge_item + '\n');
				log.debug('addReimbursementLines nsUtilPrefrencesObj.custrecord_lpo_discount_item: ', nsUtilPrefrencesObj.custrecord_lpo_discount_item + '\n');
				log.debug('addReimbursementLines reimbObj.addPayment: ', reimbObj.addPayment + '\n');

				if (Number(reimbObj.addPayment) > 0) {
					var lineNum = objSalesOrderRecord.selectNewLine({
						sublistId: 'item'
					});

					log.debug('addReimbursementLines rlineNum: ', lineNum + '\n');

					// Add Other charge amount
					objSalesOrderRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'item',
						value: nsUtilPrefrencesObj.custrecord_lpo_other_charge_item
					});

					log.debug('addReimbursementLines nsUtilPrefrencesObj.custrecord_lpo_other_charge_item: ', nsUtilPrefrencesObj.custrecord_lpo_other_charge_item + '\n');

					objSalesOrderRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'quantity',
						value: 1
					});

					objSalesOrderRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'price',
						value: '-1'
					});

					objSalesOrderRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'rate',
						value: reimbObj.addPayment
					});

					objSalesOrderRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'custcol_nsts_lpo_package_num',
						value: reimbObj.package
					});

					log.debug('addReimbursementLines reimbObj.addPayment: ', reimbObj.addPayment + '\n');

					objSalesOrderRecord.commitLine({
						sublistId: 'item'
					});

					stSalesOrderId = objSalesOrderRecord.save({
						enableSourcing: false,
						ignoreMandatoryFields: true
					});

				}
				return reimbObj;

				/*
				v 1.7 uses LPO Price Level, rather than Dealer Price with Discount
				
							var filteredPackageObjItems = packageObjItems.filter(function(packageObjItem){
								if (packageObjItem.package == reimbObj.package) {
									return packageObjItem;
								}
							})
				
							log.debug('addReimbursementLines filteredPackageObjItems: ', JSON.stringify(filteredPackageObjItems) + '\n');
				
							var packageTotalItemAmount = filteredPackageObjItems.reduce(function(sum,filteredPackageObjItem) {
				
								log.debug('addReimbursementLines filteredPackageObjItem.itemAmount: ', filteredPackageObjItem.itemAmount + '\n');
				
								var totalSum = sum + filteredPackageObjItem.itemAmount;
								return totalSum;
							}, 0)
				
							log.debug('addReimbursementLines1 packageTotalItemAmount: ', packageTotalItemAmount + '\n');
							log.debug('addReimbursementLines2 Number(reimbObj.addPayment): ', Number(reimbObj.addPayment) + '\n');
				
				
							packageTotalItemAmount = packageTotalItemAmount + Number(reimbObj.addPayment);
							log.debug('addReimbursementLines3 packageTotalItemAmount: ', packageTotalItemAmount + '\n');
							log.debug('addReimbursementLines4 Number(reimbObj.reimbursement): ', Number(reimbObj.reimbursement) + '\n');
				
				
							var discountAmount = (Number(reimbObj.reimbursement) - packageTotalItemAmount);
							if (discountAmount > 0) {
								discountAmount = discountAmount * -1;
							}
				
							log.debug('addReimbursementLines4 discountAmount: ', discountAmount + '\n');
				
							var lineNum = objSalesOrderRecord.selectNewLine({
								sublistId: 'item'
							});
				
							// Add discount amount
							objSalesOrderRecord.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'item',
								value: nsUtilPrefrencesObj.custrecord_lpo_discount_item
							});
				
							objSalesOrderRecord.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'custcol_nsts_lpo_package_num',
								value: reimbObj.package
							});
				
							objSalesOrderRecord.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'price',
								value: '-1'
							});
				
							objSalesOrderRecord.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'rate',
								value: discountAmount
							});
				
							objSalesOrderRecord.commitLine({
								sublistId: 'item'
							});
				
							stSalesOrderId = objSalesOrderRecord.save({
								enableSourcing : false,
								ignoreMandatoryFields : true
							});
				
							return reimbObj;
				*/
			})

		}

		function getReimbursementSingle(objReimb) {
			let objSingle = objReimb[0];
			for (let i = 0; i < objReimb.length; i++) {
				if (objReimb[i].addPayment > 0) {
					objSingle = objReimb[i];
					break;
				}
			}
			return objSingle;
		}

		function getReimbursementMap(packageArray, stReimbSearch) {
			reimbObjArray = [];
			reimbPackageArray = [];

			for (let i = 0; i < packageArray.length; i++) {
				log.debug('packageArray[i]: ', packageArray[i] + '\n');

				var arSearchCriteria = {
					SearchId: stReimbSearch,
					Filter: [{
						FieldName: 'custrecord_nsps_package',
						FieldValue: packageArray[i],
						FieldOperator: search.Operator.IS
					}]
				};

				var objPagedSearch = executeSearch(arSearchCriteria);

				var intPageRangesLength = objPagedSearch.getRange({
					start: 0,
					end: 1000
				}).length;

				log.debug('Reimbursement found intPageRangesLength: ', intPageRangesLength + '\n');

				if (intPageRangesLength > 0) {
					var objReimb = objPagedSearch.getRange({
						start: 0,
						end: 1000
					});

					log.debug('JSON.stringify(objReimb): ', JSON.stringify(objReimb) + '\n');

					for (let j = 0; j < objReimb.length; j++) {

						reimbObjArray.push({
							package: packageArray[i],
							reimbId: objReimb[j].id,
							partNo: objReimb[j].getValue('custrecord_nsps_part_no'),
							dealerPrice: objReimb[j].getValue('custrecord_nsps_dlr_price'),
							addPayment: objReimb[j].getValue('custrecord_nsps_add_payment'),
							reimbursement: objReimb[j].getValue('custrecord_nsps_reimbursement')
						});
					}
				}
				/*
				else {
					log.debug('Error  : ', 'Reimbursement not found for: ' + packageArray[i] + '\n');
	
					var objError = error.create({
						name : 'RECORD_NOT_FOUND',
						message : 'Reimbursement not found for: ' + packageArray[i]
					});
					throw objError;
	
				}
				*/
			}

			return reimbObjArray;
		}

		function createSalesOrder(itemType, context, arrItemObjArrayMap, nsUtilPrefrencesObj) {

			log.debug('createSalesOrder itemType: ', itemType);
			log.debug('createSalesOrder context: ', JSON.stringify(context));
			log.debug('createSalesOrder arrItemObjArrayMap: ', JSON.stringify(arrItemObjArrayMap));
			log.debug('nsUtilPrefrencesObj', JSON.stringify(nsUtilPrefrencesObj));

			var lpoRedListCommitIds = getLpoRedListCommitIds();

			try {
				var arItemArrayMap = {};
				try {
					arItemArrayMap = context.values.map(
						function(value) {
							var intItemIndex;
							var valueObj = JSON.parse(value);
							log.debug('JSON.stringify(valueObj) : ', JSON.stringify(valueObj));
							log.debug('valueObj.lpo_part_num : ', valueObj.lpo_part_num);
							log.debug('valueObj.lpo_package_num : ', valueObj.lpo_package_num);
							//log.debug('nonKitItemRefArrayMap.indexOf(valueObj.lpo_part_num) : ', nonKitItemRefArrayMap.indexOf(valueObj.lpo_part_num));

							intItemIndex = arrItemObjArrayMap.map(function(itemObj) {
								return itemObj.item
							}).indexOf(valueObj.lpo_package_num);
							log.debug('cso kit intItemIndex', intItemIndex);

							if (itemType == 'Kit' && intItemIndex >= 0) {
								return {
									"itemType": itemType,
									"submittedDate": valueObj.lpo_submitted_date,
									"batchNum": valueObj.lpo_batch_num,
									"billToCode": valueObj.lpo_bill_to_code,
									"shipToCode": valueObj.lpo_ship_to_code,
									"BAC": valueObj.lpo_bac,
									"VIN": valueObj.lpo_vin,
									"partNum": valueObj.lpo_part_num,
									"itemId": arrItemObjArrayMap[intItemIndex].id,
									"orderType": valueObj.lpo_order_type,
									"partQty": 1,
									"transactionId": valueObj.lpo_gm_transaction_id,
									"orderType": valueObj.lpo_order_type,
									"shipTo": valueObj.lpo_ship_to,
									"stagingOrderId": valueObj.lpo_internal_id,
									"lpoPackageNum": valueObj.lpo_package_num
								};
							}
							//					log.debug('arrItemObjArrayMap: ', JSON.stringify(arrItemObjArrayMap));
							//					log.debug('valueObj: ', JSON.stringify(valueObj));

							intItemIndex = arrItemObjArrayMap.map(function(itemObj) {
								return itemObj.item
							}).indexOf(valueObj.lpo_part_num);
							log.debug('cso nonkit intItemIndex', intItemIndex);

							if (itemType == 'NonKit' && intItemIndex >= 0) {
								return {
									"itemType": itemType,
									"submittedDate": valueObj.lpo_submitted_date,
									"batchNum": valueObj.lpo_batch_num,
									"billToCode": valueObj.lpo_bill_to_code,
									"shipToCode": valueObj.lpo_ship_to_code,
									"BAC": valueObj.lpo_bac,
									"VIN": valueObj.lpo_vin,
									"partNum": valueObj.lpo_part_num,
									"itemId": arrItemObjArrayMap[intItemIndex].id,
									"orderType": valueObj.lpo_order_type,
									"partQty": valueObj.lpo_part_qty,
									"transactionId": valueObj.lpo_gm_transaction_id,
									"orderType": valueObj.lpo_order_type,
									"shipTo": valueObj.lpo_ship_to,
									"stagingOrderId": valueObj.lpo_internal_id,
									"lpoPackageNum": valueObj.lpo_package_num
								};
							} else {
								return {
									"itemType": 'NA'
								};
							}
						}, arrItemObjArrayMap).filter(function(value, index) {
						if (value.itemType == 'NA' || (value.itemType == 'Kit' && index > 0)) {
							return false
						} else {
							return true
						};
					});
				} catch (error) {
					log.error('Error in Sales Order Creation', 'map arItemArrayMap Error : ' + error.message.toString());
				}

				var intCustomerId = 0;
				var intLocationId = 0;
				if (arItemArrayMap[0].orderType == 'LPO') {

					intCustomerId = nsUtilPrefrencesObj.custrecord_lpo_gm_customer_so_lpo; // v 1.8 same customer for all locations

					if (arItemArrayMap[0].shipToCode == nsUtilPrefrencesObj.custrecord_lpo_gm_dfw_ship_to_code) {

						intLocationId = nsUtilPrefrencesObj.custrecord_lpo_gm_location_dfw_gm;
					} else if (arItemArrayMap[0].shipToCode == nsUtilPrefrencesObj.custrecord_lpo_gm_houston_ship_to_code) {

						intLocationId = nsUtilPrefrencesObj.custrecord_lpo_gm_location_houston_gm;
					} else if (arItemArrayMap[0].shipToCode == nsUtilPrefrencesObj.custrecord_lpo_gm_meo_ship_to_code) {

						intLocationId = nsUtilPrefrencesObj.custrecord_lpo_gm_location_meo_gm;
					} else if (arItemArrayMap[0].shipToCode == nsUtilPrefrencesObj.custrecord_lpo_gm_ran_ship_to_code) {

						intLocationId = nsUtilPrefrencesObj.custrecord_lpo_gm_location_ran_gm;
					} else if (arItemArrayMap[0].shipToCode == nsUtilPrefrencesObj.custrecord_lpo_gm_phx_ship_to_code) {

						intLocationId = nsUtilPrefrencesObj.custrecord_lpo_gm_location_phx_gm;
					}
				} else if (arItemArrayMap[0].orderType !== 'LPO') {

					var customerDefaultLocationObj = new Object;

					customerDefaultLocationObj = getDealerOrCustomer(arItemArrayMap[0].BAC, nsUtilPrefrencesObj, arItemArrayMap[0].orderType);

					if (isObjectEmpty(customerDefaultLocationObj)) {
						var errorObj = error.create({
							name: 'MISSING_RECORD_NOTFOUND',
							message: 'Customer Default Location not found for BAC : ' + arItemArrayMap[0].BAC
						});
						throw errorObj;
					} else {

						intCustomerId = nsUtilPrefrencesObj.custrecord_lpo_ford_customer_so_dio; // v 1.8 same customer for all locations

						if (customerDefaultLocationObj.dealerOrCustomerDefaultLocation == nsUtilPrefrencesObj.custrecord_lpo_ford_location_atl_dio) {

							intLocationId = nsUtilPrefrencesObj.custrecord_lpo_ford_location_atl_dio;
						} else if (customerDefaultLocationObj.dealerOrCustomerDefaultLocation == nsUtilPrefrencesObj.custrecord_lpo_ford_location_dfw_ford) {

							intLocationId = nsUtilPrefrencesObj.custrecord_lpo_ford_location_dfw_ford;
						} else if (customerDefaultLocationObj.dealerOrCustomerDefaultLocation == nsUtilPrefrencesObj.custrecord_lpo_ford_location_hou_dio) {

							intLocationId = nsUtilPrefrencesObj.custrecord_lpo_ford_location_hou_dio;
						} else if (customerDefaultLocationObj.dealerOrCustomerDefaultLocation == nsUtilPrefrencesObj.custrecord_lpo_ford_location_mem_dio) {

							intLocationId = nsUtilPrefrencesObj.custrecord_lpo_ford_location_mem_dio;
						} else if (customerDefaultLocationObj.dealerOrCustomerDefaultLocation == nsUtilPrefrencesObj.custrecord_lpo_ford_location_ran_dio) {

							intLocationId = nsUtilPrefrencesObj.custrecord_lpo_ford_location_ran_dio;
						} else if (customerDefaultLocationObj.dealerOrCustomerDefaultLocation == nsUtilPrefrencesObj.custrecord_lpo_ford_location_phx_dio) {

							intLocationId = nsUtilPrefrencesObj.custrecord_lpo_ford_location_phx_dio;
						}
					}
				};

				log.debug('intLocationId', intLocationId);

				var lpoDealerObj = getDealerOrCustomer(arItemArrayMap[0].BAC, nsUtilPrefrencesObj, arItemArrayMap[0].orderType);

				if (isObjectEmpty(lpoDealerObj)) {
					var errorObj = error.create({
						name: 'MISSING_RECORD_NOTFOUND',
						message: 'Dealer not found for BAC: ' + arItemArrayMap[0].BAC
					});
					throw errorObj;
				};

				var shippToInformation = getDealerShipAddress(lpoDealerObj.dealerOrCustomerInternalId, arItemArrayMap[0].orderType);

				var obDealerShippingAddress = shippToInformation.shippToAddress;
				const areaofPriResp = shippToInformation.areaofPriResp;
				var shippingInfo = shippToInformation.shippingInfo;

				log.debug('Create SO JSON.stringify(obDealerShippingAddress): ', JSON.stringify(obDealerShippingAddress) + '\n');

				var dtTranDate, parsedTranDate;
				try {
					if (arItemArrayMap[0].orderType == 'LPO') {

						dtTranDate = arItemArrayMap[0].submittedDate;
					} else {

						var arBatchNum = arItemArrayMap[0].batchNum.split('-');

						var stBatchNumDate = arBatchNum[0];

						dtTranDate = stBatchNumDate.substr(4, 2) + '/' + stBatchNumDate.substr(6, 2) + '/' + stBatchNumDate.substr(0, 4);
					};

					// Assuming Date format is MM/DD/YYYY
					parsedTranDate = format.parse({
						value: dtTranDate,
						type: format.Type.DATE
					});
				} catch (error) {
					log.error('CreateSO dtTranDate error:', error.toString());
				}

				var recSalesOrder = record.create({
					type: record.Type.SALES_ORDER,
					isDynamic: true,
					defaultValues: {
						entity: intCustomerId
					}
				});

				recSalesOrder.setValue({
					fieldId: 'externalid',
					value: arItemArrayMap[0].transactionId
				});

				recSalesOrder.setValue({
					fieldId: 'custbody_nsts_send_to_customer',
					value: lpoDealerObj.dealerOrCustomerInternalId
				});

				recSalesOrder.setValue({
					fieldId: 'shipmethod',
					value: shippingInfo.shipMethod
				});

				recSalesOrder.setValue({
					fieldId: 'custbody_nsps_truck',
					value: shippingInfo.truckNo
				});

				recSalesOrder.setValue({
					fieldId: 'trandate',
					value: parsedTranDate
				});

				recSalesOrder.setValue({
					fieldId: 'custbody_nsts_vin_number',
					value: arItemArrayMap[0].VIN
				});
				// commented by Rad, 8quanta on 03 Oct 2024
				/*recSalesOrder.setValue({
					fieldId: 'custbody_nsts_transaction_id',
					value: arItemArrayMap[0].transactionId
				});
	
				recSalesOrder.setValue({
					fieldId: 'otherrefnum',
					value: arItemArrayMap[0].transactionId
				});*/

				recSalesOrder.setValue({
					fieldId: 'location',
					value: intLocationId
				});

				log.audit('header level fulfillment location', 'cust ID ' + intCustomerId + ', ' + lpoDealerObj.dealerOrCustomerFulfillmentLocation);
				recSalesOrder.setValue({
					fieldId: 'custbody_8q_fulfillment_f',
					value: lpoDealerObj.dealerOrCustomerFulfillmentLocation
				});

				recSalesOrder.setValue({
					fieldId: 'custbody_nsps_load_order_type',
					value: arItemArrayMap[0].orderType
				});

				recSalesOrder.setValue({
					fieldId: 'shipcomplete',
					value: true
				});

				// v1.9 added
				recSalesOrder.setValue({
					fieldId: 'iscrosssubtransaction',
					value: true
				});

				// v1.2 added
				if (lpoDealerObj.dealerOrCustomerRoute) {
					log.debug('setting Route', 'setting LPO Route to ' + lpoDealerObj.dealerOrCustomerRoute);
					recSalesOrder.setValue({
						fieldId: 'custbody_nsps_lpo_route',
						value: lpoDealerObj.dealerOrCustomerRoute
					})
				}

				// v1.6 added
				if (areaofPriResp && areaofPriResp !== '') {
					recSalesOrder.setValue({
						fieldId: 'cseg1',
						value: areaofPriResp
					});
				}

				var blItemLineCreated = false;

				log.debug('recSalesOrder1: ', JSON.stringify(recSalesOrder) + '\n');

				var packageNumArray = [];

				log.debug('arItemArrayMap.length: ', arItemArrayMap.length + '\n');
				let txnIds = [];
				for (var pckIdx = 0; pckIdx < arItemArrayMap.length; pckIdx++) {
					//July 22 - if (arItemArrayMap[pckIdx].orderType == 'LPO' && arItemArrayMap[pckIdx].partQty > 1) {
					if (arItemArrayMap[pckIdx].orderType == 'LPO') {
						if (!packageNumArray.includes(arItemArrayMap[pckIdx].lpoPackageNum)) {
							packageNumArray.push(arItemArrayMap[pckIdx].lpoPackageNum);
						}
					}
					// added by Rad, 8quanta on 03 Oct 2024
					if (!txnIds.includes(arItemArrayMap[pckIdx].transactionId)) {
						txnIds.push(arItemArrayMap[pckIdx].transactionId);
					}
				}
				// added by Rad, 8quanta on 03 Oct 2024
				recSalesOrder.setValue({
					fieldId: 'custbody_nsts_transaction_id',
					value: arItemArrayMap[0].VIN
				});

				recSalesOrder.setValue({
					fieldId: 'otherrefnum',
					value: arItemArrayMap[0].VIN
				});
				var reimbObjArray = [];
				let nspsMissingReimbursement = false;

				if (packageNumArray.length > 0) {
					reimbObjArray = getReimbursementMap(packageNumArray, nsUtilPrefrencesObj.custrecord_lpo_staging_reimbursements_ss);
					if (reimbObjArray.length == 0) {
						nspsMissingReimbursement = true;
					}
				};

				log.debug('packageNumArray ', JSON.stringify(packageNumArray) + '\n');
				log.debug('reimbObjArray ', JSON.stringify(reimbObjArray) + '\n');
				log.debug('arItemArrayMap ', JSON.stringify(arItemArrayMap) + '\n');
				for (var itemIdx = 0; itemIdx < arItemArrayMap.length; itemIdx++) {

					try {
						if (itemIdx == 0) {
							recSalesOrder.selectNewLine({
								sublistId: 'item'
							});
							blItemLineCreated = true;
						}

						recSalesOrder.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'item',
							value: arItemArrayMap[itemIdx].itemId
						});

						log.debug('arItemArrayMap[itemIdx].lpoPackageNum', JSON.stringify(arItemArrayMap[itemIdx].lpoPackageNum));

						recSalesOrder.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'custcol_nsts_lpo_package_num',
							value: arItemArrayMap[itemIdx].lpoPackageNum
						});

						// added by Rad, 8quanta on 03 Oct 2024
						recSalesOrder.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'custcol_8q_lpo_txn_id',
							value: arItemArrayMap[itemIdx].transactionId
						});

						recSalesOrder.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'quantity',
							value: arItemArrayMap[itemIdx].partQty
						});

						// v1.1  added
						log.debug('line level location', intLocationId);
						recSalesOrder.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'location',
							value: intLocationId
						});

						// Fred McIntyre: Can't figure out in this script where to get/set department
						var department = search.lookupFields({
							type: 'item',
							id: arItemArrayMap[itemIdx].itemId,
							columns: ['department']
						}).department;

						if (department && department.length > 0) {
							recSalesOrder.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'department',
								value: department[0].value
							});
						}

						// v1.9  added
						log.audit('line level inventorylocation', 'line ' + itemIdx + ', order type ' + arItemArrayMap[itemIdx].orderType + ', cust ID ' + intCustomerId + ', item ID ' + arItemArrayMap[itemIdx].itemId + ', ' + lpoDealerObj.dealerOrCustomerFulfillmentLocation);

						recSalesOrder.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'inventorylocation',
							value: lpoDealerObj.dealerOrCustomerFulfillmentLocation
						});

						if (arItemArrayMap[itemIdx].orderType == 'LPO') {

							var existesPriceLevelLPO = checkLPOPriceLevel(arItemArrayMap[itemIdx].itemId, nsUtilPrefrencesObj.custrecord_lpo_price_level);

							if (existesPriceLevelLPO) {
								recSalesOrder.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'price',
									value: nsUtilPrefrencesObj.custrecord_lpo_price_level
								});
							} else {
								recSalesOrder.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'price',
									value: '-1'
								});

								recSalesOrder.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'rate',
									value: 0
								});
							}
						}

						/*
		v 1.7 use LPO Price Level
						if (arItemArrayMap[itemIdx].orderType == 'LPO') {
	
							let reimbObj = reimbObjArray.filter(reimb =>  reimb.partNo == arItemArrayMap[itemIdx].partNum);
	
							log.debug('reimbObj 1', JSON.stringify(reimbObj) + '\n');
	
							if (reimbObj.length > 0 && !isEmpty(reimbObj[0].dealerPrice)) {
	
								log.debug('reimbObj 2', JSON.stringify(reimbObj[0]) + '\n');
	
								recSalesOrder.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'price',
									value: '-1'
								});
	
								recSalesOrder.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'rate',
									value: parseFloat(reimbObj[0].dealerPrice)
								});
	
							}
							else {
									var existesPriceLevelLPO = checkLPOPriceLevel(arItemArrayMap[itemIdx].itemId, nsUtilPrefrencesObj.custrecord_lpo_price_level);
	
									if (existesPriceLevelLPO) {
										recSalesOrder.setCurrentSublistValue({
											sublistId: 'item',
											fieldId: 'price',
											value: nsUtilPrefrencesObj.custrecord_lpo_price_level
										});
									}
							}
						}
		*/

						// v1.6 added
						if (areaofPriResp && areaofPriResp !== '') {
							recSalesOrder.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'cseg1',
								value: areaofPriResp
							});
						}
						// If Red List is checked, set Commit to Do Not Commit unless it is LPO Customer
						if (lpoRedListCommitIds.indexOf(intCustomerId) === -1 &&
							recSalesOrder.getCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'custitem_nsps_red_list'
							})) {

							recSalesOrder.setCurrentSublistValue({
								sublistId: 'item',
								fieldId: 'commitinventory',
								value: '3'
							});
						}
						recSalesOrder.commitLine({
							sublistId: 'item'
						});
					} catch (error) {
						log.error('Add Item Line error', error.message);
					}
				}

				if (isEmpty(obDealerShippingAddress)) {

					log.error('Status', 'Shipping Address Not Found for Dealer InternalId :' + lpoDealerObj.dealerOrCustomerInternalId)
				} else {
					//Add Shipping Address
					var subRecAddress = recSalesOrder.getSubrecord({
						fieldId: 'shippingaddress'
					});
					log.debug('subRecAddress: ', JSON.stringify(subRecAddress) + '\n');

					subRecAddress.setValue({
						fieldId: 'country',
						value: obDealerShippingAddress.getValue({
							fieldId: 'country'
						})
					});
					subRecAddress.setValue({
						fieldId: 'city',
						value: obDealerShippingAddress.getValue({
							fieldId: 'city'
						})
					});
					subRecAddress.setValue({
						fieldId: 'state',
						value: obDealerShippingAddress.getValue({
							fieldId: 'stage'
						})
					});
					subRecAddress.setValue({
						fieldId: 'zip',
						value: obDealerShippingAddress.getValue({
							fieldId: 'zip'
						})
					});
					subRecAddress.setValue({
						fieldId: 'addr1',
						value: obDealerShippingAddress.getValue({
							fieldId: 'addr1'
						})
					});
					subRecAddress.setValue({
						fieldId: 'addr2',
						value: obDealerShippingAddress.getValue({
							fieldId: 'addr2'
						})
					});
					subRecAddress.setValue({
						fieldId: 'addr3',
						value: obDealerShippingAddress.getValue({
							fieldId: 'addr3'
						})
					});
					subRecAddress.setValue({
						fieldId: 'addressee',
						value: obDealerShippingAddress.getValue({
							fieldId: 'addressee'
						})
					});
					subRecAddress.setValue({
						fieldId: 'addrphone',
						value: obDealerShippingAddress.getValue({
							fieldId: 'addrphone'
						})
					});
					subRecAddress.setValue({
						fieldId: 'attention',
						value: obDealerShippingAddress.getValue({
							fieldId: 'ATTENTION'
						})
					});
					//End Add Shipping Address

					log.debug('subRecAddress: ', JSON.stringify(subRecAddress) + '\n');

				}

				log.debug('Save SO ', JSON.stringify(recSalesOrder) + '\n');

				if (nspsMissingReimbursement) {
					recSalesOrder.setValue({
						fieldId: 'custbody_nsts_lpo_missing_reimbursemen',
						value: true
					});
				}

				var stSalesOrderId = recSalesOrder.save({
					enableSourcing: false,
					ignoreMandatoryFields: true
				});

				// Add Reimbursement
				if (packageNumArray.length > 0 && reimbObjArray.length > 0) {
					// v 1.7 Using LPO Price Level, addReimbursementLines only includes addPayment. Does not add a discount line.
					addReimbursementLines(stSalesOrderId, reimbObjArray, nsUtilPrefrencesObj);
				}

				log.audit('Sales Order created', 'SOId:' + stSalesOrderId);

				var arUpdatedStagingOrders;

				if (itemType == 'Kit') {
					arUpdatedStagingOrders = context.values.map(
						function(value) {
							var valueObj = JSON.parse(value);

							if (valueObj.lpo_package_num == arrItemObjArrayMap[0].item) {

								record.submitFields({
									type: 'customrecord_nsps_staging_orders',
									id: valueObj.lpo_internal_id,
									values: {
										custrecord_stg_order_ref_id: stSalesOrderId,
										custrecord_stg_error_msg: '',
										custrecord_stg_status: 3
									},
									options: {
										enableSourcing: true,
										ignoreMandatoryFields: true
									}
								});

								return valueObj.lpo_internal_id;
							} else {
								return null;
							}
						}
					);
				} else {
					arUpdatedStagingOrders = arItemArrayMap.map(function(stagingOrder) {
						log.debug('stagingOrder', JSON.stringify(stagingOrder));
						log.debug('stagingOrder.stagingOrderId', stagingOrder.stagingOrderId);

						record.submitFields({
							type: 'customrecord_nsps_staging_orders',
							id: stagingOrder.stagingOrderId,
							values: {
								custrecord_stg_order_ref_id: stSalesOrderId,
								custrecord_stg_error_msg: '',
								custrecord_stg_status: 3
							},
							options: {
								enableSourcing: true,
								ignoreMandatoryFields: true
							}
						});

						return stagingOrder.stagingOrderId;
					})
				}
			} catch (error) {

				if (error.name != 'DUP_RCRD') {

					log.error('Error in Reduce', error.toString());

				} else {
					log.error('Error in Reduce Create SO', 'Sales Order Creation Error : ' + error.message.toString());
				};

				arUpdatedStagingOrders = arItemArrayMap.map(function(stagingOrder) {

					record.submitFields({
						type: 'customrecord_nsps_staging_orders',
						id: stagingOrder.stagingOrderId,
						values: {

							custrecord_stg_error_msg: error.message.toString(),
							custrecord_stg_status: 4
						},
						options: {
							enableSourcing: true,
							ignoreMandatoryFields: true
						}
					});

					return stagingOrder.stagingOrderId;
				});
			}

			return true;
		}

		const getInputData = (inputContext) => {

			log.audit('Status Start Process ' + new Date());

			try {

				var nsUtilPrefrencesObj = getCustomizationPrefrences();

				var nsUtilPrefrences_cache = cache.getCache({
					name: 'nsUtilPrefrencesCache',
					scope: cache.Scope.PRIVATE
				});

				nsUtilPrefrences_cache.put({
					key: 'nsUtilPrefrences',
					value: nsUtilPrefrencesObj
				});

				return search.load({
					id: nsUtilPrefrencesObj.custrecord_lpo_staging_order_ss
				});

				/*
								var searchId = search.lookupFields({
									type: 'customrecord_ns_customization_pref',
									id: 1,
									columns: ['custrecord_lpo_staging_order_ss']
								}).custrecord_lpo_staging_order_ss;
								
								return search.load({
									id: searchId[0].value
								});
				*/
			} catch (error) {
				log.error('Error in GetInputData', error.toString());
			}

			log.debug('Status End GetInputData Process ' + new Date());

			return true;
		}

		const Map = (mapContext) => {

			log.debug('Status Start Map Process ' + new Date());

			try {
				var searchResult = JSON.parse(mapContext.value);
				// updated by Rad, 8quanta on 02 Oct 2024

				var key_map = searchResult.values.custrecord_stg_vin;
				/*searchResult.values.custrecord_stg_order_type +'|'+
													searchResult.values.custrecord_stg_gm_transaction_id  +'|'+
													searchResult.values.custrecord_stg_vin  +'|'+
													searchResult.values.custrecord_stg_submitted_date +'|'+
													searchResult.values.custrecord_stg_batch_num;*/
				// Added by Rad, 8quanta on 05 Nov 2024.If No VIN Complete is checked at the customer level, group the order based on whether the package number is found in the Reimbursement Staging record.
				var customerSearchObj = search.create({
					type: "customer",
					filters: [
						["custentity_nsts_bac", "is", searchResult.values.custrecord_stg_bac],
						"AND",
						["custentity_8q_no_vin_complete_orders", "is", "T"]
					],
					columns: []
				});
				if (customerSearchObj.runPaged().count > 0) {
					let packageFound = 0;
					var customrecord_nsps_staging_reimbursementsSearchObj = search.create({
						type: "customrecord_nsps_staging_reimbursements",
						filters: [
							["custrecord_nsps_package", "is", searchResult.values.custrecord_stg_package_num],
							"AND", 
      						["custrecord_nsps_add_payment","equalto","245"]
						],
						columns: []
					});
					if (customrecord_nsps_staging_reimbursementsSearchObj.runPaged().count > 0) {
						packageFound = 1;
					}
					key_map += packageFound;
				}

				log.debug('Map key_map:', key_map);

				mapContext.write({
					key: key_map,
					value: {
						lpo_internal_id: searchResult.id,
						lpo_submitted_date: searchResult.values.custrecord_stg_submitted_date,
						lpo_batch_num: searchResult.values.custrecord_stg_batch_num,
						lpo_gm_transaction_id: searchResult.values.custrecord_stg_gm_transaction_id,
						lpo_bac: searchResult.values.custrecord_stg_bac,
						lpo_vin: searchResult.values.custrecord_stg_vin,
						lpo_package_num: searchResult.values.custrecord_stg_package_num,
						lpo_part_num: searchResult.values.custrecord_stg_part_num,
						lpo_part_qty: searchResult.values.custrecord_stg_part_qty,
						lpo_order_type: searchResult.values.custrecord_stg_order_type,
						lpo_bill_to: searchResult.values.custrecord_stg_bill_to_code,
						lpo_ship_to: searchResult.values.custrecord_stg_ship_to_code,
						lpo_ship_to_code: searchResult.values.custrecord_stg_ship_to_code
					}
				});
			} catch (error) {
				log.error('Error in Map', error.toString());
			}

			log.debug('Status End Map Process ' + new Date());

			return true;
		}

		function checkLPOPriceLevel(itemId, priceLevelLPO) {

			var objItemRecord = record.load({
				type: record.Type.INVENTORY_ITEM,
				id: parseInt(itemId),
				isDynamic: true,
			});

			var priceLPOExists = false;

			let lineNumber = objItemRecord.findSublistLineWithValue({
				sublistId: 'price1',
				fieldId: 'pricelevel',
				value: priceLevelLPO
			});

			if (lineNumber >= 0) {
				priceLPOExists = true;
			}

			log.debug('priceLPOExists  ', priceLPOExists);

			return priceLPOExists;
		}

		const Reduce = (reduceContext) => {

			log.debug('Status Start Reduce Process ' + new Date());

			try {
				//				var nsUtilPrefrencesObj = getCustomizationPrefrences();
				var nsUtilPrefrences_cache = cache.getCache({
					name: 'nsUtilPrefrencesCache',
					scope: cache.Scope.PRIVATE
				});

				var nsUtilPrefrencesObj = JSON.parse(nsUtilPrefrences_cache.get({
					key: 'nsUtilPrefrences',
					loader: getCustomizationPrefrences
				}))

				log.debug('Record currently under progress ', 'record  ID: ' + reduceContext.key + '\n');

				var packageArray = [];
				packageArray = getUniqueItem(reduceContext, 'Kit');
				var nonKitItemObjArray = [];
				var getItemMapObj = {};
				var packageObjArrayMap = [];
				var packageArrayMap = [];
				var nonKitObjArrayMap = [];
				var nonKitItemRefArrayMap = [];

				if (packageArray != null && packageArray.length > 0) {
					getItemMapObj = getItemMap('Kit', packageArray, nsUtilPrefrencesObj.custrecord_lpo_kitpack_item_ss);
					log.debug('getItemMapObj Kit: ', JSON.stringify(getItemMapObj) + '\n');
					packageObjArrayMap = getItemMapObj.itemObjArray;
					packageArrayMap = getItemMapObj.packageArrayMap;
					nonKitItemRefArrayMap = getItemMapObj.nonKitItemArray;
				} else {
					log.debug('package is null logic: ', reduceContext.values + '\n');
					nonKitItemRefArrayMap = getUniqueItem(reduceContext, 'NoKit');
					log.debug('nonKitItemRefArrayMap: ', nonKitItemRefArrayMap + '\n');
				}

				log.debug('Non Kit Logic nonKitItemRefArrayMap.length: ', nonKitItemRefArrayMap.length + '\n');

				if (nonKitItemRefArrayMap.length > 0) {

					log.debug('Non Kit Logic nonKitItemRefArrayMap.length: ', nonKitItemRefArrayMap.length + '\n');
					log.debug('Non Kit Logic nonKitItemRefArrayMap: ', nonKitItemRefArrayMap + '\n');
					log.debug('typeof nonKitItemRefArrayMap: ', typeof nonKitItemRefArrayMap + '\n');
					log.debug('typeof context.values: ', typeof reduceContext.values + '\n');
					log.debug('nonKitItemRefArrayMap: ', JSON.stringify(nonKitItemRefArrayMap) + '\n');

					var nonKitItemArrayMap = reduceContext.values.map(
						function(value) {

							var valueObj = JSON.parse(value);

							log.debug('x valueObj: ', JSON.stringify(valueObj) + '\n');

							if (valueObj.lpo_order_type == 'LPO') {
								if (nonKitItemRefArrayMap.indexOf(valueObj.lpo_package_num) >= 0) {
									return valueObj.lpo_part_num;
								} else {
									return -1;
								}
							} else if (valueObj.lpo_order_type !== 'LPO') {
								return valueObj.lpo_part_num;
							} else {
								return -1;
							}
						}, nonKitItemRefArrayMap).filter(function(value) {

						if (isNaN(value) == true) {
							return value.length > 0
						} else {
							return value >= 0
						}
					});

					log.debug('nonKitItemArrayMap: ', nonKitItemArrayMap + '\n');

					getItemMapObj = getItemMap('NonKit', nonKitItemArrayMap, nsUtilPrefrencesObj.custrecord_lpo_inv_item_ss);
					nonKitObjArrayMap = getItemMapObj.itemObjArray;
					log.debug('getItemMapObj NonKit: ', JSON.stringify(getItemMapObj) + '\n');

				}

				for (var intPKG in packageObjArrayMap) {
					log.debug('Start Create Kit packageObjArrayMap: ', JSON.stringify(packageObjArrayMap[intPKG]) + '\n');
					//createSalesOrder('Kit', context, [packageObjArrayMap[intPKG]], objScriptParameters);
				}

				if (nonKitObjArrayMap.length > 0) {
					log.debug('Start Create NonKit nonKitObjArrayMap: ', JSON.stringify(nonKitObjArrayMap) + '\n');
					createSalesOrder('NonKit', reduceContext, nonKitObjArrayMap, nsUtilPrefrencesObj);
				}
			} catch (error) {

				log.error('Error in Reduce', 'After Sales Order Creation : ' + error.message.toString());
			}

			log.debug('Status End Reduce Process ' + new Date());

			return true;
		}

		const Summarize = (summaryContext) => {

			try {

				summaryContext.reduceSummary.errors.iterator().each(function(key, error) {

					log.error('Summary Task Status', 'FAILED : ' + key + ' : ' + error);

				});
			} catch (error) {
				log.error('Error in Summarize', error.toString());
			}

			log.audit('Status End Process ' + new Date());

			return true;
		}

		function isObjectEmpty(obj) {
			if (Object.getOwnPropertyNames) {
				return (Object.getOwnPropertyNames(obj).length === 0);
			} else {
				var k;
				for (k in obj) {
					if (obj.hasOwnProperty(k)) {
						return false;
					}
				}
				return true;
			}
		}

		function isEmpty(stValue) {
			return ((stValue === 'none' || stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) ||
				(stValue.constructor === Object && (function(v) {
					for (var k in v) return false;
					return true;
				})(stValue)));
		}

		return {
			getInputData: getInputData,
			map: Map,
			reduce: Reduce,
			summarize: Summarize
		};

	});