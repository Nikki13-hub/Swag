/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 4/18/2024
	Purpose : For non-Administrator roles, do not allow edit, delete, nor create if transaction date or posting period are on or before those
		set in Setup > Accounting > Manage User Closed Periods
*/

define(['N/runtime','N/search','N/error'],function(runtime,search,error) {

	/**
		* Function definition to be triggered before record is loaded.
		*
		* @param {Object} context
		* @param {Record} context.newRecord - New record
		* @param {string} context.type - Trigger type
		* @param {Form} context.form - Current form
		* @Since 2015.2
		*/
	function beforeLoad(context) {
      if (context.newRecord.id && context.type !== 'view') {
			return checkDates(context);
		}
		return true;
	}

	/**
		* Function definition to be triggered before record is loaded.
		*
		* @param {Object} context
		* @param {Record} context.newRecord - New record
		* @param {Record} context.oldRecord - Old record
		* @param {string} context.type - Trigger type
		* @Since 2015.2
		*/
	function beforeSubmit(context) {
		return checkDates(context);
	}

	function checkDates(context) {
		let rec = context.newRecord;
		let tranDate = rec.getValue({fieldId: 'trandate'}) || 0;
		let period = rec.getValue({fieldId: 'postingperiod'}) || 0;
		if (!tranDate && !period) {
			return true;
		}

		let userObj = runtime.getCurrentUser();
		let role = userObj.roleId;
		if (role === 'administrator') {
			return true;
		}
		let opts = search.lookupFields({
			type: 'customrecord_8q_upc_settings',
			id: 1,
			columns: [
				'custrecord_8q_upc_user_closed_period',
				'custrecord_8q_upc_user_closed_year',
				'custrecord_8q_upc_user_closed_month'
			]
		});
		let year = 0;
		let month = 0;
		if (tranDate) {
			let dt = new Date(tranDate);
			year = dt.getFullYear();
			month = dt.getMonth();
		}
		let setYear = Number(opts.custrecord_8q_upc_user_closed_year);
		let setMonth = Number(opts.custrecord_8q_upc_user_closed_month);
		let setPeriod = Number(opts.custrecord_8q_upc_user_closed_period);
		if (period && period <= setPeriod) {
			throwError();
			return false;
		}
		if (year && year < setYear) {
			throwError();
			return false;
		}
		if (year && year === setYear && month <= setMonth) {
			throwError();
			return false;
		}
		return true;
	}
	
	function throwError() {
		throw error.create({
			name: 'FIPARSER_USER_ERROR',
			message: 'This transaction is in a closed period. You do not have permission to create, edit, or delete transactions in a closed period. Please see your Administrator if you have a question.',
			notifyOff: true
		}).message;
		return false;
	}
	
	return {
		beforeLoad: beforeLoad,
		beforeSubmit: beforeSubmit
	};

});
