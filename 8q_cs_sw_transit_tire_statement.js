/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
/*
	Auther : Radhakrishnan
	Date : 11 Feb 2022
	Purpose : client script for the suitelet page. Suitlet to print custom sales order statement
*/
define(['N/currentRecord', 'N/record', 'N/search', 'N/ui/message', 'N/url'],
	function(currentRecord, record, search, message, url) {

		function padTo2Digits(num) {
			return num.toString().padStart(2, '0');
		}

		function formatDate(date) {
			return [
				padTo2Digits(date.getMonth() + 1),
				padTo2Digits(date.getDate()),
				date.getFullYear(),
			].join('/');
		}

		function fieldChanged(scriptContext) {
			try {
				let fieldName = scriptContext.fieldId;
				let currentRecord = scriptContext.currentRecord;
				if (fieldName == 'custpage_chk_allcustomers') {
					let allCustomers = currentRecord.getValue('custpage_chk_allcustomers');
					var fieldAllCustomers = currentRecord.getField('custpage_chk_allcustomers');
					var fieldCustomer = currentRecord.getField('custpage_customer');
					if(allCustomers){
						currentRecord.setValue('custpage_customer',null);
						fieldCustomer.isDisabled=true;
					}
					else{
						fieldCustomer.isDisabled=false;
					}
				}
				else if (fieldName == 'custpage_customer') {
					var fieldAllCustomers = currentRecord.getField('custpage_chk_allcustomers');
					var fieldCustomer = currentRecord.getField('custpage_customer');
					let customer = currentRecord.getValue('custpage_customer');
					if(_logValidation(customer)){
						currentRecord.setValue('custpage_chk_allcustomers',false);
						fieldAllCustomers.isDisabled=true;
					}
					else{
						fieldAllCustomers.isDisabled=false;
						currentRecord.setValue('custpage_chk_allcustomers',true);
					}
				}
			} catch (e) {
				log.error("error details", e);
			}
		}

		function saveRecord(context) {
			try {
				var currentRecord = context.currentRecord;
				// loop through sublist to check if any of the checkbox is selected, if not return error
				/*var lineCount = currentRecord.getLineCount({
				    sublistId: 'custpage_sublist'
				});
				var isChecked = false;
				if (lineCount > 0) {
				    for (var x = 0; x < lineCount; x++) {
				        var checked = currentRecord.getSublistValue({
				            sublistId: 'custpage_sublist',
				            fieldId: 'custpage_check',
				            line: x
				        });

				        if (checked == true || checked == 'T') {
				            isChecked = true;
				            break;
				        }
				    }
				}
				if (!isChecked) {
				    alert('No customer selected. Please make a selection.');
				    return false;
				}*/
				var customrecord_8q_cust_statement_parentSearchObj = search.create({
					type: "customrecord_8q_cust_statement_parent",
					filters: [
						["custrecord_8q_custstmt_processed", "is", "F"]
					],
					columns: [
						search.createColumn({
							name: "internalid",
							label: "Internal ID"
						})
					]
				});
				let searchResultCount = Number(customrecord_8q_cust_statement_parentSearchObj.runPaged().count);
				if (searchResultCount > 0) {
					var myMsg = message.create({
						title: '',
						message: 'A statement generation is already in progress. Please wait.',
						type: message.Type.INFORMATION
					});
					myMsg.show();
					setTimeout(myMsg.hide, 5000);
					return false;
				}
				if (!_logValidation(currentRecord.getValue('custpage_customer')) && currentRecord.getValue('custpage_chk_allcustomers')) {
					return confirm('Generate statements for all customers in the selected subsidiary?');
				} 
				else if(!_logValidation(currentRecord.getValue('custpage_customer')) && !currentRecord.getValue('custpage_chk_allcustomers')){
					alert('Please select at least one customer !');
					return false;
				}
				else {
					return true;
				}

			} catch (_e) {
				log.debug('error', _e);
			}
			return true;
		}

		function _logValidation(value) {
			if (value != 'null' && value != '' && value != undefined && value != 'NaN') {
				return true;
			} else {
				return false;
			}
		}
		return {
			fieldChanged: fieldChanged,
			saveRecord: saveRecord
		};
	});