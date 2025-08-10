/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 4/8/2024
	Purpose : Make sure that receiving location has the same Standard Cost as the sending location
						Use M/R script since this was exceeding units usage limit
*/

define(['N/task','N/search','N/record','N/format'],function(task,search,record,format) {

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
		// inventorytransfer doesn't have status
		let oldRec = context.oldRecord;
		if (!isEmpty(oldRec) && rec.type !== 'inventorytransfer') {
			let oldStatus = oldRec.getValue({fieldId: 'status'});
			let newStatus = rec.getValue({fieldId: 'status'});
			// newStatus is B when changing from Pending Approval to Pending Fulfillment
			// If edited again, newStatus is Pending Fulfillment
			if ( !( oldStatus === 'Pending Approval' && (newStatus === 'Pending Fulfillment' || newStatus === 'B') ) ) {
				return true;
			}
		}

		const myTask = task.create({
			taskType: task.TaskType.MAP_REDUCE,
			scriptId: 'customscript_8q_mr_trnsfr_order_set_cost',
			params: {
				custscript_8q_mr_cost_update_rec_id: rec.id,
				custscript_8q_mr_cost_update_rec_type: rec.type
			}
		});
		let taskId = 0;
		try {
			taskId = myTask.submit();
		} catch (e) {
			if (e.message.match(/No available idle Script Deployments/) ) {
				let ok = newDeployment();
				if (ok) {
					taskId = myTask.submit();
				}
			}
		}

		return true;
	}

	function newDeployment() {
		let scriptId = 0;
		search.create({
			type: 'script',
			filters: [
				{name: 'scriptid', operator: 'is', values: ['customscript_8q_mr_trnsfr_order_set_cost']}
			]
		}).run().each(function(res) {
			scriptId = res.id;
		});

		let curDeployNum = search.create({
			type:'scriptdeployment',
			filters:[
				{name: 'script', operator: 'anyof', values: [scriptId]},
				{name: 'isdeployed', operator: 'is', values: ['T']}
			]
		}).runPaged().count;

		let scriptIdColumn = search.createColumn({
				name: 'scriptid',
				sort: search.Sort.DESC
		});

		let num = curDeployNum + 1;
		let deployId = 0;
		search.create({
			type:'scriptdeployment',
			filters:[
				{name:'scriptid',operator:'is',values:['customdeploy_8q_ue_trnsfr_ord_set_cst_'+num]},
			],
		}).run().each(function(res){
			deployId = res.id;
			return true;
		});

		if (deployId) {
			record.submitFields({
				type: 'scriptdeployment',
				id: deployId,
				values: {isdeployed: true}
			});
			return true;
		}

		if (num > 99) {
			return 0;
		}

		deployment = record.create({
			type: record.Type.SCRIPT_DEPLOYMENT,
			defaultValues: {
				script: scriptId
			}
		});
		deployment.setValue({
				fieldId: 'isdeployed',
				value: true
		});
		deployment.setValue({
				fieldId: 'status',
				value: 'NOTSCHEDULED'
		});
		deployment.setValue({
				fieldId: 'loglevel',
				value: 'ERROR'
		});
		deployment.setValue({
				fieldId: 'priority',
				value: '1'
		});
		deployment.setValue({
				fieldId: 'concurrencylimit',
				value: '1'
		});
		deployment.setValue({
				fieldId: 'queueallstagesatonce',
				value: true
		});
		deployment.setValue({
				fieldId: 'yieldaftermins',
				value: '60'
		});
		deployment.setValue({
				fieldId: 'buffersize',
				value: '1'
		});
		deployment.setValue({
				fieldId: 'starttime',
				value: format.format({value: new Date(), type: format.Type.DATETIMETZ})
		});
		deployment.setValue({
				fieldId: 'title',
				value: '8Q MR Trnsfr Order set Cost DO NOT RUN '+num
		});
		deployment.setValue({
				fieldId: 'scriptid',
				value: '_8q_ue_trnsfr_ord_set_cst_'+num
		});

		let id = deployment.save();
		return id;
	}
	
	function isEmpty(stValue) {
	 return ((stValue === '' || stValue == null || stValue == 'null' || stValue == undefined || stValue == 'undefined')
		 || (stValue.constructor === Array && stValue.length == 0)
		 || (stValue.constructor === Object && (function(v){for(let k in v)return false;return true;})(stValue)));
	};

	return {
		afterSubmit: afterSubmit
	};

});
