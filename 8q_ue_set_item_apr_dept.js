/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 
	Purpose : 
*/

define(['N/search', 'N/record', 'N/runtime'], function (search, record, runtime) {

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
		try {
			if (context.type === 'delete' || !context.newRecord.id) {
//			log.audit(runtime.executionContext, 'no context.newRecord.id');
				return true;
			}

			let rec = {};
			try {
				// 10 units
				rec = record.load({
					type: context.newRecord.type,
					id: context.newRecord.id
				});
			} catch (e) {
//				log.error(runtime.executionContext, 'id ' + context.newRecord.id + ', type: ' + context.newRecord.type + ', load record ' + e.message);
			}

			let entity = Number(rec.getValue({fieldId: 'entity'}));
			if (entity === 1776) {
				return true;
			}

//			let portal = rec.getValue({ fieldId: 'custbody7' });
//			if (context.newRecord.type === 'salesorder' && portal) {
//				let userObj = runtime.getCurrentUser();
//				log.error(context.newRecord.type, 'PORTAL ID ' + context.newRecord.id + ', context: ' + runtime.executionContext + ' userId ' + userObj.id + ' portal: ' + portal);
//			}
			let apr = 0;

			let konceptsGrillsDept = 0;
			let locationText = rec.getText({ fieldId: 'location' });
			if (!isEmpty(locationText)) {
				if (locationText.match(/Koncepts/i)) {
					apr = 103;
					konceptsGrillsDept = 8;
				} else if (locationText.match(/Grills/i)) {
					apr = 104;
					konceptsGrillsDept = 9;
				}
			}

			if (apr === 0) {
				try {
					let trans = {};
					let getAPR = {};
					if (rec.getValue({ fieldId: 'createdfrom' })) {
						try {
							// 1 unit
							trans = search.lookupFields({
								type: 'transaction',
								id: rec.getValue({ fieldId: 'createdfrom' }),
								columns: ['entity', 'custbody_nsts_send_to_customer']
							});
//							if (context.newRecord.type === 'salesorder' && portal) {
//								log.error(runtime.executionContext, 'id ' + context.newRecord.id + ', type: ' + context.newRecord.type + ', trans ' + JSON.stringify(trans));
//							}
							if (trans.custbody_nsts_send_to_customer.length > 0) {
								entity = trans.custbody_nsts_send_to_customer[0].value;
							} else if (trans.entity.length > 0) {
								entity = trans.entity[0].value;
							}
						} catch (e) {
							log.error(runtime.executionContext, 'id ' + context.newRecord.id + ', type: ' + context.newRecord.type + ', get trans entity err ' + e.message);
						}
					} else {
						if (rec.getValue({ fieldId: 'custbody_nsts_send_to_customer' })) {
							entity = rec.getValue({ fieldId: 'custbody_nsts_send_to_customer' });
						}
					}
					if (entity) {
						try {
							// 1 unit
							getAPR = search.lookupFields({
								type: 'entity',
								id: entity,
								columns: ['cseg1', 'custentity_nsps_customer_default_loc']
							});
//							if (context.newRecord.type === 'salesorder' && portal) {
//								log.error(runtime.executionContext, 'id ' + context.newRecord.id + ', type: ' + context.newRecord.type + ', getAPR ' + JSON.stringify(getAPR));
//							}
							if (getAPR.cseg1 != null && getAPR.cseg1.length > 0) {
								apr = Number(getAPR.cseg1[0].value);
							}
						} catch (e) {
							log.error(runtime.executionContext, 'id ' + context.newRecord.id + ', type: ' + context.newRecord.type + ', getAPR ' + JSON.stringify(getAPR) + ', entity ' + entity + ', err ' + e.message);
						}
					} else {
						log.error(runtime.executionContext, 'id ' + context.newRecord.id + ', type: ' + context.newRecord.type + ', get APR no entity');
					}
				} catch (e) {
					log.error(runtime.executionContext, 'id ' + context.newRecord.id + ', type: ' + context.newRecord.type + ', get APR entity ' + entity + ', getAPR ' + JSON.stringify(getAPR) + ', trans ' + JSON.stringify(trans) + ', err ' + e.message);
				}
			}
			let ct = rec.getLineCount({ sublistId: 'item' });
			for (let i = 0; i < ct; i++) {
				try {

					let department = 0;
					if (konceptsGrillsDept) {
						department = konceptsGrillsDept;
					}
					let lineDept = rec.getSublistValue({sublistId: 'item', fieldId: 'department', line: i});
					if (department === 0 && isEmpty(lineDept) ) {
						let item = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
						try {
							// 1 unit
							let getDEPT = search.lookupFields({
								type: 'item',
								id: item,
								columns: ['department']
							});
//							if (context.newRecord.type === 'salesorder' && portal) {
//								log.error('l', 'id ' + context.newRecord.id + ', type: ' + context.newRecord.type + ', getDept ' + JSON.stringify(getDEPT));
//							}
							if (getDEPT.department != null && getDEPT.department.length > 0) {
								department = getDEPT.department[0].value;
							}
						} catch (e) {
							log.error(runtime.executionContext, 'id ' + context.newRecord.id + ', type: ' + context.newRecord.type + ', getDEPT err  ' + e.message);
						}

					}
					if (!isEmpty(department) && department !== 0) {
						rec.setSublistValue({ sublistId: 'item', fieldId: 'department', value: department, line: i });
					}
					// Custom Segment "Vendor" - id 112, is inactive setting it causes an error when saving.
					if (!isEmpty(apr) && apr !== 0 && apr !== 112) {
							rec.setSublistValue({ sublistId: 'item', fieldId: 'cseg1', value: apr, line: i });
					}
				} catch (e) {
					log.error(runtime.executionContext, 'id ' + context.newRecord.id + ', type: ' + context.newRecord.type + ', item err ' + e.message);
				}
			}
			// 20 units
			rec.save();

		} catch (e) {
			log.error(runtime.executionContext, 'id ' + context.newRecord.id + ', type: ' + context.newRecord.type + ', script err ' + e.message);
		}

		return true;
	}

	function isEmpty(stValue) {
	 return ((stValue === '' || stValue == null || stValue == 'null' || stValue == undefined || stValue == 'undefined')
		 || (stValue.constructor === Array && stValue.length == 0)
		 || (stValue.constructor === Object && (function(v){for(let k in v)return false;return true;})(stValue)));
	};


	return {
		afterSubmit: afterSubmit,
	};

});
