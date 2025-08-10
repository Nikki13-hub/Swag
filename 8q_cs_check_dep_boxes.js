/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log'], function (record, log) {

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
		let sublistId = (rec.type === 'journalentry') ? 'line' : (rec.type === 'inventoryadjustment') ? 'inventory' : 'item'
		if (context.fieldId === 'department') {
			let depValue = '';
			try {
				depValue = rec.getCurrentSublistText({
					sublistId: sublistId,
					fieldId: 'department'
				});
			} catch (e) {
				//log.error('get text' +e);
			}
			if (!depValue) {
				return true;
			}
			depValue = Number(depValue);
			try {
				if (depValue === 5) {
					rec.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_8q_ford_check_box',
						value: true
					});
					rec.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_8q_gm_check_box',
						value: false
					});
					rec.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_8q_other_dept',
						value: false
					});
				} else if (depValue === 6) {
					rec.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_8q_gm_check_box',
						value: true
					});
					rec.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_8q_ford_check_box',
						value: false
					});
					rec.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_8q_other_dept',
						value: false
					});
				} else {
					rec.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_8q_other_dept',
						value: true
					});
					rec.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_8q_gm_check_box',
						value: false
					});
					rec.setCurrentSublistValue({
						sublistId: sublistId,
						fieldId: 'custcol_8q_ford_check_box',
						value: false
					});
				}
			} catch (e) {
				//log.error('get text' +e);
			}
		}
		return true;
	}

	/**
		* Validation function to be executed when record is saved.
		*
		* @param {Object} context
		* @param {Record} context.currentRecord - Current form record
		* @returns {boolean} Return true if record is valid
		*
		* @since 2015.2
		*/
	function saveRecord(context) {
		if (window.location.href.match(/void=T/) ) {
			return true;
		}
		let rec = context.currentRecord;
		try {
			let depValue = '';
			let sublistId = (rec.type === 'journalentry') ? 'line' : (rec.type === 'inventoryadjustment') ? 'inventory' : 'item';
			let sublist = rec.getSublist({sublistId: sublistId});
			let numlines = rec.getLineCount({
				sublistId: sublistId
			});
			for (let i = 0; i < numlines; i++) {
				rec.selectLine({sublistId: sublistId, line: i});
				try {
					depValue = rec.getCurrentSublistText({
						sublistId: sublistId,
						fieldId: 'department'
					});
				} catch (e) {
					//log.error('get text' +e);
				}
				if (!depValue) {
					continue;
				}
				depValue = Number(depValue);
				try {
					if (depValue === 5) {
						rec.setCurrentSublistValue({
							sublistId: sublistId,
							fieldId: 'custcol_8q_ford_check_box',
							value: true
						});
						rec.setCurrentSublistValue({
							sublistId: sublistId,
							fieldId: 'custcol_8q_gm_check_box',
							value: false
						});
						rec.setCurrentSublistValue({
							sublistId: sublistId,
							fieldId: 'custcol_8q_other_dept',
							value: false
						});
					} else if (depValue === 6) {
						rec.setCurrentSublistValue({
							sublistId: sublistId,
							fieldId: 'custcol_8q_gm_check_box',
							value: true
						});
						rec.setCurrentSublistValue({
							sublistId: sublistId,
							fieldId: 'custcol_8q_ford_check_box',
							value: false
						});
						rec.setCurrentSublistValue({
							sublistId: sublistId,
							fieldId: 'custcol_8q_other_dept',
							value: false
						});
					} else {
						rec.setCurrentSublistValue({
							sublistId: sublistId,
							fieldId: 'custcol_8q_other_dept',
							value: true
						});
						rec.setCurrentSublistValue({
							sublistId: sublistId,
							fieldId: 'custcol_8q_gm_check_box',
							value: false
						});
						rec.setCurrentSublistValue({
							sublistId: sublistId,
							fieldId: 'custcol_8q_ford_check_box',
							value: false
						});
					}
				} catch (e) {
					//log.error('get text' +e);
				}
				rec.commitLine({sublistId: sublistId});
			}
		} catch (e) {
			//log.error('update',e.message);
		};
		return true;
	}

	return {
		fieldChanged: fieldChanged,
		saveRecord: saveRecord
	}

});
