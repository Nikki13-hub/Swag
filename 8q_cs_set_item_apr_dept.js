/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 2023-08-31
	Purpose : Add Customer Area of Responsibility and Item Department to line items.
*/
define(['N/search'],function(search) {

	let apr = 0;

	function pageInit(context) {

		let rec = context.currentRecord;
		if (!rec.id) {
			return true;
		}
		let entity = Number(rec.getValue({fieldId: 'entity'})) || 0;
		try {
			if (rec.getValue({fieldId: 'createdfrom'})) {
				let trans = search.lookupFields({
					type: 'transaction',
					id: rec.getValue({fieldId: 'createdfrom'}),
					columns: ['entity','custbody_nsts_send_to_customer']
				});
				if (trans.custbody_nsts_send_to_customer.length > 0 ) {
					entity = trans.custbody_nsts_send_to_customer[0].value;
				} else {
					entity = trans.entity[0].value;
				}

			} else {
				if (rec.getValue({fieldId: 'custbody_nsts_send_to_customer'}) ) {
					entity = rec.getValue({fieldId: 'custbody_nsts_send_to_customer'});
				}
			}
			let getAPR = search.lookupFields({
				type: 'entity',
				id: entity,
				columns: ['cseg1']
			});
			if (getAPR.cseg1.length > 0) {
				apr = getAPR.cseg1[0].value;
			}
		} catch (e) {
			log.error('get APR',e.message);
		}
		// let pageInit get APR but not set it. It will be set in validateLine
		// If entity changes, fieldChanged updates apr
		return true;
	}
	/**
		* Function to be executed when field is changed.
		*
		* @param {Object} context
		* @param {Record} context.currentRecord - Current form record
		* @param {string} context.sublistId - Sublist name
		* @param {string} context.fieldId - Field name
		* @param {number} context.line - Line number. Will be undefined if not a sublist or matrix field
		* @param {number} context.columnNum - Line number. Will be undefined if not a matrix field
		*
		* @since 2015.2
		*/
	function fieldChanged(context) {
		let rec = context.currentRecord;

		let entity = Number(rec.getValue({fieldId: 'entity'})) || 0;

		if (context.fieldId === 'entity' && entity) {
			try {
				if (rec.type === 'itemfulfillment') {
					let trans = search.lookupFields({
						type: 'transaction',
						id: rec.getValue({fieldId: 'createdfrom'}),
						columns: ['entity','custbody_nsts_send_to_customer']
					});
					entity = trans.entity[0].value;
					if (trans.custbody_nsts_send_to_customer[0].value ) {
						entity = trans.custbody_nsts_send_to_customer[0].value;
					}
				} else {
					if (rec.getValue({fieldId: 'custbody_nsts_send_to_customer'}) ) {
						entity = rec.getValue({fieldId: 'custbody_nsts_send_to_customer'});
					}
				}
				let getAPR = search.lookupFields({
					type: 'entity',
					id: entity,
					columns: ['cseg1']
				});
				if (getAPR.cseg1.length > 0) {
					apr = getAPR.cseg1[0].value;
				}
				return true;
			} catch (e) {
			}
			return true;
		}

		if (context.fieldId === 'custbody_nsts_send_to_customer' && rec.getValue({fieldId: 'custbody_nsts_send_to_customer'})) {
			try {
				entity = rec.getValue({fieldId: 'custbody_nsts_send_to_customer'});
				let getAPR = search.lookupFields({
					type: 'entity',
					id: entity,
					columns: ['cseg1']
				});
				if (getAPR.cseg1.length > 0) {
					apr = getAPR.cseg1[0].value;
				}
			} catch (e) {
			}
			return true;
		}

	}

	function validateLine(context) {
		let rec = context.currentRecord;
		if (context.sublistId === 'item' && rec.getCurrentSublistValue({sublistId: 'item', fieldId: 'item'})) {
			try {
				let item = rec.getCurrentSublistValue({sublistId: 'item', fieldId: 'item'});
				let getDEPT = search.lookupFields({
					type: 'item',
					id: item,
					columns: ['department']
				});
				if (getDEPT.department.length > 0) {
					rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'department', value: getDEPT.department[0].value});
				}

				let custForm = rec.getText({fieldId: 'customform'});
				if (custForm.match(/Koncepts/i)) {
					apr = 103;
				} else if (custForm.match(/Grills/i)) {
					apr = 104;
				}
				if (apr) {
					rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'cseg1', value: apr});
				}
			} catch (e) {
			}
			return true;
		}

		return true;
	}

	return {
		pageInit: pageInit,
		fieldChanged: fieldChanged,
		validateLine: validateLine,
	};

});
