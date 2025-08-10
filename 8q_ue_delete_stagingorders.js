            /** 
             *@NApiVersion 2.1
             *@NScriptType UserEventScript
             */
            /*
				Auther : Radhakrishnan
				Date : 13 Dec 2023
				Purpose : To delete records where product line is not accessories
			 */
				define(['N/record', 'N/search'],
            	function(record, search) {
            		function afterSubmit(context) {
            			if (context.type == 'create') {
            				try {
            					let recId = context.newRecord.id;
            					var objRec = record.load({
            						type: 'customrecord_8q_gm_ecom_staging_order',
            						id: recId
            					});
                                let productLine= objRec.getValue('custrecord_gmecom_productline');
                                let lineStatus= objRec.getValue('custrecord_gmecom_linestatus');
								if(!productLine.includes('Accessories') || !lineStatus.includes('Ordered')){
                                    record.delete({
                                        type: 'customrecord_8q_gm_ecom_staging_order',
                                        id: recId
                                    });
                                }
                            } catch (e) {
            					log.debug('error', e);
            				}
            			}
            		}
            		
            		return {
            			afterSubmit: afterSubmit
            		};
            	});