/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 8/21/2023
	Purpose : Call script to change Commit on Sales Orders based on item Red List
*/

define(['N/task'],function(task) {

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
		if (context.type === 'create' || context.type === 'copy') {
			return true;
		}
		let newRec = context.newRecord;
		let oldRec = context.oldRecord;
		let newRedList = newRec.getValue({fieldId: 'custitem_nsps_red_list'});
		let oldRedList = oldRec.getValue({fieldId: 'custitem_nsps_red_list'});
		if (oldRedList !== newRedList) {
			task.create({
				taskType: task.TaskType.MAP_REDUCE,
				scriptId: 'customscript_8q_mr_so_item_redlist_updt',
				params: {
					custscript_8q_item_id: newRec.id
				}
			}).submit();
		}

		return true;
	}

	return {
		afterSubmit: afterSubmit
	};

});
