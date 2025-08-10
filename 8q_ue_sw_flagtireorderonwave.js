            /** 
             *@NApiVersion 2.1
             *@NScriptType UserEventScript
             */
            /*
				Auther : Radhakrishnan
				Date : 30 Aug 2023
				Purpose : To flag tire order that 'LPO order waved'
			 */
				define(['N/record', 'N/search'],
            	function(record, search) {

            		function afterSubmit(context) {
            			if (context.type == 'create' || context.type == 'edit') {
            				try {
            					let currentRecord = context.newRecord;
            					let recId = currentRecord.id;
            					log.audit(context.type, recId);
            					if (!_logValidation(recId)) {
            						return;
            					}
            					let objRec = record.load({
            						type: record.Type.WAVE,
            						id: recId,
            						isDynamic: true
            					});
            					let lineCount = objRec.getLineCount({
            						sublistId: 'waveorders'
            					});
            					log.audit(recId, 'line count:' + lineCount);
            					// loop through the order lines  
            					for (let i = 0; i < lineCount; i++) {
            						let soId = objRec.getSublistValue({
            							sublistId: 'waveorders',
            							fieldId: 'ordernumberid',
            							line: i
            						});
            						// check for lined tire order
            						if (_logValidation(soId)) {
            							log.audit(recId + ' SO Id :', soId);
            							let lookupData = search.lookupFields({
            								type: record.Type.SALES_ORDER,
            								id: soId,
            								columns: ['custbody_8q_linked_sales_order']
            							});
            							let linkedSO = lookupData.custbody_8q_linked_sales_order;
            							// if tire order found, check 'LPO order Waved' flag on the tire order
            							if (_logValidation(linkedSO)) {
            								let linkedSOId = linkedSO[0].value;
            								if (_logValidation(linkedSOId)) {
            									record.submitFields({
            										type: record.Type.SALES_ORDER,
            										id: linkedSOId,
            										values: {
            											custbody_8q_lpo_order_waved: true
            										},
            										options: {
            											enableSourcing: false,
            											ignoreMandatoryFields: true
            										}
            									});
            									log.audit('Wave Id:' + recId, 'Wave checkbox checked. linkedSOId:' + linkedSOId);
            								} else {
            									log.audit(recId, 'Linked SO missing on SO Id:' + soId);
            								}
            							}
            						} else {
            							log.audit(recId, 'SO Id missing');
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