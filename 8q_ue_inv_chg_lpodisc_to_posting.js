/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define([],function() {

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
		let rec = context.newRecord;
		let lineCt = rec.getLineCount({sublistId: 'item'});
		let oldLPODisc = 10212;
		let LPODisc = 66105;

		for (let i = 0; i < lineCt; i++) {
			let item = Number(rec.getSublistValue({sublistId: 'item', fieldId: 'item', line: i}));
			if (item === oldLPODisc) {
				let amt = rec.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i});
				let pkg = rec.getSublistValue({sublistId: 'item', fieldId: 'custcol_nsts_lpo_package_num', line: i});
				let area = rec.getValue({fieldId: 'cseg1'});
				let loc = rec.getValue({fieldId: 'location'});
				rec.setSublistValue({sublistId: 'item', fieldId: 'item', value: LPODisc, line: i});
				rec.setSublistValue({sublistId: 'item', fieldId: 'price', value: -1, line: i});
				rec.setSublistValue({sublistId: 'item', fieldId: 'amount', value: amt, line: i});
				if (loc) {
					rec.setSublistValue({sublistId: 'item', fieldId: 'location', value: loc, line: i})
				}
				if (pkg) {
					rec.setSublistValue({sublistId: 'item', fieldId: 'custcol_nsts_lpo_package_num', value: pkg, line: i})
				}
				if (area) {
					rec.setSublistValue({sublistId: 'item', fieldId: 'cseg1', value: area, line: i})
				}
			}
		}
		if (Number(rec.getValue({fieldId: 'discountitem'})) === oldLPODisc) {
			let amt = rec.getValue({fieldId: 'discountrate'});
			rec.setValue({fieldId: 'discountitem', value: LPODisc});
			rec.setValue({fieldId: 'discountrate', value: amt});
		}

		return true;
	}

	return {
		beforeSubmit: beforeSubmit,
	};

});
