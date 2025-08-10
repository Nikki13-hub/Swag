/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/*
	Author : Obediah Rattray, 8Quanta obie@8quanta.com
	Created Date : ^!
	Purpose : 
*/

define(['N/search','N/record'],function(search,record) {

	/**
		* Function definition to be triggered before record is loaded.
		*
		* @param {Object} context
		* @param {Record} context.newRecord - New record
		* @param {Record} context.oldRecord - Old record
		* @param {string} context.type - Trigger type
		* @Since 2015.2
		*/
	function afterSubmit(context) {
		let rec = context.newRecord;
		if (context.type == 'create') {
			try {
				record.submitFields({
					type: 'inventoryitem',
					id: rec.id,
					values: {externalid: rec.getValue({fieldId: 'itemid'})}
				});
			} catch (e) {
				log.error({e : e.message})
			};
		};

		return true;
	}

	return {
		afterSubmit: afterSubmit
	};

});
