            /** 
             *@NApiVersion 2.1
             *@NScriptType UserEventScript
             */
            /*
				Auther : Radhakrishnan
				Date : 07 Sep 2023
				Purpose : To update location at line level
			 */
				define(['N/record', 'N/search'],
            	function(record, search) {

            		function afterSubmit(context) {
            			if (context.type == 'edit' || context.type == 'xedit') {
            				try {
            					let currentRecord = context.newRecord;
            					let poId = context.newRecord.id;
            					let vendor = currentRecord.getValue('entity');
            					let oldLocation = currentRecord.getValue('location');
                                if(poId == 24415543){
                                   log.debug('oldLocation', oldLocation);
                                }
            					let billingLocation = '';
            					let targetLocation = ''
            					let targetSubsidiary = '';
            					let billingSubsidiary = '';
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
            					if (_logValidation(billingLocation)) {
            						let objPO = record.load({
            							type: record.Type.PURCHASE_ORDER,
            							id: poId,
            						});
            						let lineCount = objPO.getLineCount({
            							sublistId: 'item'
            						});
            						let tobeSaved = true;
            						for (let x = 0; x < lineCount; x++) {
            							let oldBillLocation = objPO.getSublistValue({
            								sublistId: 'item',
            								fieldId: 'location',
            								line: x
            							});
            							let oldTargLocation = objPO.getSublistValue({
            								sublistId: 'item',
            								fieldId: 'targetlocation',
            								line: x
            							});
            							let oldTargSubsidiary = objPO.getSublistValue({
            								sublistId: 'item',
            								fieldId: 'targetsubsidiary',
            								line: x
            							});
            							if (!_logValidation(oldBillLocation) || !_logValidation(oldTargLocation) || !_logValidation(oldTargSubsidiary)) {
            								tobeSaved = true;
            								objPO.setSublistValue({
            									sublistId: 'item',
            									fieldId: 'location',
            									value: billingLocation,
            									line: x
            								});
            								objPO.setSublistValue({
            									sublistId: 'item',
            									fieldId: 'targetlocation',
            									value: targetLocation,
            									line: x
            								});
            								objPO.setSublistValue({
            									sublistId: 'item',
            									fieldId: 'targetsubsidiary',
            									value: targetSubsidiary,
            									line: x
            								});
            							}
            						}
            						if (tobeSaved) {
            							objPO.save();
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
            			afterSubmit: afterSubmit
            		};
            	});