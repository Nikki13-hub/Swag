            /** 
             *@NApiVersion 2.1
             *@NScriptType UserEventScript
             */
            /*
				Auther : Radhakrishnan
				Date : 07 Sep 2023
				Purpose : To update subsidiary and location
			 */
				define(['N/record', 'N/search'],
					function(record, search) {
	
						function beforeSubmit(context) {
							if (context.type == 'create' || context.type == 'copy') {
								try {
									let currentRecord = context.newRecord;
									let customForm=currentRecord.getValue('customform');
									if(customForm=='185'){
										return;
									}
									let vendor = currentRecord.getValue('entity');
									let oldLocation = currentRecord.getValue('location');
									let vendorNo = currentRecord.getValue('otherrefnum');
									let billingLocation = '';
									let targetLocation = ''
									let targetSubsidiary = '';
									let billingSubsidiary = '';
									let customrecord_8q_vendor_bill_loc_metrixSearchObj = search.create({
										type: "customrecord_8q_vendor_bill_loc_metrix",
										filters: [
											["custrecord_8q_vendor", "anyof", vendor],
											"AND",
											["custrecord_8q_target_location", "anyof", oldLocation]
										],
										columns: [
											search.createColumn({
												name: "custrecord_8q_billing_location",
												label: "Billing Location"
											}),
											search.createColumn({
												name: "custrecord_8q_billing_subsidiary",
												label: "Billing Subsidiary"
											}),
											search.createColumn({
												name: "custrecord_8q_target_location",
												label: "Target Location"
											}),
											search.createColumn({
												name: "custrecord_8q_target_subsidiary",
												label: "Target Subsidiary"
											})
										]
									});
									customrecord_8q_vendor_bill_loc_metrixSearchObj.run().each(function(result) {
										billingLocation = result.getValue('custrecord_8q_billing_location');
										targetLocation = result.getValue('custrecord_8q_target_location');
										targetSubsidiary = result.getValue('custrecord_8q_target_subsidiary');
										billingSubsidiary = result.getValue('custrecord_8q_billing_subsidiary');
										return true;
									});
									if (!_logValidation(billingLocation)) {
										let customrecord_8q_vendor_bill_loc_metrixSearchObj = search.create({
											type: "customrecord_8q_vendor_bill_loc_metrix",
											filters: [
												["custrecord_8q_vendor", "anyof", vendor],
												"AND",
												["custrecord_8q_billing_location", "anyof", oldLocation]
											],
											columns: [
												search.createColumn({
													name: "custrecord_8q_billing_location",
													label: "Billing Location"
												}),
												search.createColumn({
													name: "custrecord_8q_billing_subsidiary",
													label: "Billing Subsidiary"
												}),
												search.createColumn({
													name: "custrecord_8q_target_location",
													label: "Target Location"
												}),
												search.createColumn({
													name: "custrecord_8q_target_subsidiary",
													label: "Target Subsidiary"
												})
											]
										});
										customrecord_8q_vendor_bill_loc_metrixSearchObj.run().each(function(result) {
											billingLocation = result.getValue('custrecord_8q_billing_location');
											targetLocation = result.getValue('custrecord_8q_target_location');
											targetSubsidiary = result.getValue('custrecord_8q_target_subsidiary');
											billingSubsidiary = result.getValue('custrecord_8q_billing_subsidiary');
											return true;
										});
									}
									if (_logValidation(billingLocation)) {
										currentRecord.setValue('subsidiary', billingSubsidiary);
										currentRecord.setValue('entity', vendor);
										currentRecord.setValue('location', billingLocation);
										if(_logValidation(vendorNo)){
											currentRecord.setValue('otherrefnum', vendorNo);
										}
										let lineCount = currentRecord.getLineCount({
											sublistId: 'item'
										});
										for (let x = 0; x < lineCount; x++) {
											let item = currentRecord.getSublistValue({
												sublistId: 'item',
												fieldId: 'item',
												line: x
											});
											let qty = currentRecord.getSublistValue({
												sublistId: 'item',
												fieldId: 'quantity',
												line: x
											});
											let rate = currentRecord.getSublistValue({
												sublistId: 'item',
												fieldId: 'rate',
												line: x
											});
											let amount = currentRecord.getSublistValue({
												sublistId: 'item',
												fieldId: 'amount',
												line: x
											});
											let custcol_atlas_wd_promise_date = currentRecord.getSublistValue({
												sublistId: 'item',
												fieldId: 'custcol_atlas_wd_promise_date',
												line: x
											});
											let expectedreceiptdate = currentRecord.getSublistValue({
												sublistId: 'item',
												fieldId: 'expectedreceiptdate',
												line: x
											});
											let _class = currentRecord.getSublistValue({
												sublistId: 'item',
												fieldId: 'class',
												line: x
											});
											currentRecord.setSublistValue({
												sublistId: 'item',
												fieldId: 'item',
												value: item,
												line: x
											});
											currentRecord.setSublistValue({
												sublistId: 'item',
												fieldId: 'location',
												value: billingLocation,
												line: x
											});
											currentRecord.setSublistValue({
												sublistId: 'item',
												fieldId: 'targetlocation',
												value: targetLocation,
												line: x
											});
											currentRecord.setSublistValue({
												sublistId: 'item',
												fieldId: 'targetsubsidiary',
												value: targetSubsidiary,
												line: x
											});
											currentRecord.setSublistValue({
												sublistId: 'item',
												fieldId: 'quantity',
												value: qty,
												line: x
											});
											currentRecord.setSublistValue({
												sublistId: 'item',
												fieldId: 'rate',
												value: rate,
												line: x
											});
											currentRecord.setSublistValue({
												sublistId: 'item',
												fieldId: 'amount',
												value: amount,
												line: x
											});
											currentRecord.setSublistValue({
												sublistId: 'item',
												fieldId: 'custcol_atlas_wd_promise_date',
												value: custcol_atlas_wd_promise_date,
												line: x
											});
											currentRecord.setSublistValue({
												sublistId: 'item',
												fieldId: 'expectedreceiptdate',
												value: expectedreceiptdate,
												line: x
											});
											currentRecord.setSublistValue({
												sublistId: 'item',
												fieldId: 'class',
												value: _class,
												line: x
											});
										}
									}
								} catch (e) {
									log.audit('ERROR', e);
								}
							}
						}
	
						function _logValidation(value) {
							if (value != 'null' && value != '' && value != undefined && value != 'NaN') {
								return true;
							} else {
								return false;
							}
						}
	
						return {
							beforeSubmit: beforeSubmit
						};
					});