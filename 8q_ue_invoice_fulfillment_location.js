/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 12/11/2023
	Purpose : Copy line Inventory Location from SO to Fulfillment Location on Invoice
*/

define(['N/record','N/search'],function(record,search) {

	function beforeSubmit(context) {
		let rec = context.newRecord;
		let createdFrom = rec.getValue({fieldId: 'createdfrom'});
		if (!createdFrom) {
			return true;
		}
		try {
			let soRec = record.load({type: 'salesorder', id: createdFrom});
			let lineCt = rec.getLineCount({sublistId: 'item'});
			for (let i = 0; i < lineCt; i++) {
					// cannot use getSublistLineWithValue with item id because the same item could be on more than
					// one line with different inventory locations
					let line = Number(rec.getSublistValue({sublistId: 'item', fieldId: 'orderline', line: i}));
					let soLine = soRec.findSublistLineWithValue({sublistId: 'item', fieldId: 'line', value: line});
					if (soLine < 0) {
						continue;
					}
					// On a test SO, with same item on two lines, different inventory locations, they both
					// have the same inventorylocation id, but different text values. Very strange.
					// So, use the text and get the id.
					let locText = soRec.getSublistText({sublistId: 'item', fieldId: 'inventorylocation', line: soLine});
					if (locText) {
						let locId = getLocationId(locText);
						if (locId) {
							rec.setSublistValue({sublistId: 'item', fieldId: 'custcol_8q_inv_fulfillment_location', value: locId, line: i});
						}
					}
			}
		} catch (e) {
		}
		return true;
	}

	function getLocationId(locText) {
		let locId = 0;
		try {
			search.create({
				type: 'location',
				filters: [{name: 'name', operator: 'is', values: [locText]}]
			}).run().each(function(res) {
				locId = res.id;
			});
		} catch (e) {
		}
		return locId;
	}

	return {
		beforeSubmit: beforeSubmit
	};

});
