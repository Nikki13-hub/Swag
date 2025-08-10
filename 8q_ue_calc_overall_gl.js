/** 
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
/*
    Auther : Radhakrishnan
    Date : 08 Jan 2023
    Purpose : To calculate the Overall GL field at the line level on the inventory adjustment record.
    */
    define(['N/record', 'N/search'],
	function(record, search) {

		function afterSubmit(context) {
			if (context.type == 'create' || context.type == 'copy' || context.type == 'edit') {
				try {
					let recId = context.newRecord.id;
					let objRec = record.load({
						type: record.Type.INVENTORY_ADJUSTMENT,
						id: recId,
					});
					let lineCount = objRec.getLineCount({
						sublistId: 'inventory'
					});
					for (let x = 0; x < lineCount; x++) {
						let adjustQtyBy = objRec.getSublistValue({
							sublistId: 'inventory',
							fieldId: 'adjustqtyby',
							line: x
						}) || 0;
						let unitCost = objRec.getSublistValue({
							sublistId: 'inventory',
							fieldId: 'unitcost',
							line: x
						}) || 0;
						let overallGL = adjustQtyBy * unitCost;
						objRec.setSublistValue({
							sublistId: 'inventory',
							fieldId: 'custcol_8q_overall_gl',
							value: overallGL,
							line: x
						});
					}
					objRec.save();
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