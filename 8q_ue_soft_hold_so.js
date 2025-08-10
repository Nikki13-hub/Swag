/** 
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
/*
    Auther : Radhakrishnan
    Date : 27 Dec 2023
    Purpose : To change status of the order to Pending Approval if SOFT HOLD checkbox is checked at the customer level
    */
    define(['N/record', 'N/search'],
	function(record, search) {
		function afterSubmit(context) {
			if (context.type == 'create' || context.type == 'copy') {
				try {
					let currentRecord = context.newRecord;
					let recId = context.newRecord.id;
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
						record.submitFields({
							type: 'salesorder',
							id: recId,
							values: {
								orderstatus: 'A'
							},
							options: {
								enableSourcing: true,
								ignoreMandatoryFields: true
							}
						});
					}

				} catch (e) {
					log.audit('ERROR', e);
				}
			}
		}

		function beforeLoad(context) {
			if (context.type == context.UserEventType.VIEW) {
				var form = context.form;
				let currentRecord = context.newRecord;
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
					form.removeButton({
						id: 'approve',
					});
				}
			}
		}
		return {
			afterSubmit: afterSubmit,
			beforeLoad: beforeLoad
		};
	});