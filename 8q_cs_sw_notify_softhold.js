/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
/*
	Auther : Radhakrishnan
	Date : 03 Jan 2024
	Purpose : client script to show message that the order will be on hold
*/
define(['N/currentRecord', 'N/record', 'N/search', 'N/ui/message', 'N/url'],
	function(currentRecord, record, search, message, url) {
		function saveRecord(context) {
			try {
				let currentRecord = context.currentRecord;
				if (!_logValidation(currentRecord.id)) {
					let transitTire = currentRecord.getValue('custbody_mhi_transit_invoice');
					if (transitTire)
						return;
					let customer = currentRecord.getValue('entity');
					let lookupData = search.lookupFields({
						type: 'customer',
						id: customer,
						columns: ['custentity_8q_soft_hold']
					});
					let softHold = lookupData.custentity_8q_soft_hold;
					if (softHold) {
						return confirm('This order will be saved but will not be released as this customer is on credit hold. Continue ?');
					}
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
			saveRecord: saveRecord
		};
	});