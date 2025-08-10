            /** 
             *@NApiVersion 2.1
             *@NScriptType UserEventScript
             */
            /*
				Auther : Radhakrishnan
				Date : 07 Sep 2023
				Purpose : To update subsidiary and location
			 */
				define(['N/record', 'N/search', 'N/ui/serverWidget','N/ui/message'],
            	function(record, search, serverWidget, message) {

            		function beforeLoad(context) {
            			if (context.type == 'view') {
            				try {
            					let currentRecord = context.newRecord;
								let processed=currentRecord.getValue('custrecord_8q_custstmt_processed');
                                if(!processed){
                                    context.form.addPageInitMessage({type: message.Type.WARNING, message: 'Statement Generation in progress !'});
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
            			beforeLoad: beforeLoad
            		};
            	});