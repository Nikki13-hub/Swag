/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */

define(['N/record', 'N/query', 'N/runtime'],
	function (record, query, runtime) {
		var exports = {};

		function beforeSubmit(context) {
			var newRec = context.newRecord;
			var newRecId = newRec.id;
			try {
				log.debug('context.type', context.type);
				if (context.type == 'create' || context.type == 'edit' || context.type == 'xedit') {
					var cSql = `select t.id, t.cseg1 tapr, c.id cid, c.cseg1 capr, c.custentity_nsps_customer_default_loc cloc from transaction t
				left join customer c on c.id = t.entity
				where t.id = ${newRecId}`;
					var cResults = query.runSuiteQL({ query: cSql }).asMappedResults();
					var cSeg1 = Number(newRec.getValue('cseg1')) || '';
					//log.debug('cResults', cResults);
					if (!cSeg1) {
						log.debug('cSeg1', cSeg1);
						var cuSeg1 = Number(cResults[0].capr) || cSeg1;
						if (cuSeg1 != cSeg1) {
							var cAPR = cuSeg1;
							log.debug('cAPR', cAPR);
							newRec.setValue({ fieldId: 'cseg1', value: cAPR });
						}
						else { var cAPR = cSeg1; }

						var numLines = newRec.getLineCount({
							sublistId: 'item'
						});
						for (var i = 0; i < numLines; i++) {
							var cSeg0 = Number(newRec.getSublistValue({
								sublistId: 'item',
								fieldId: 'cseg1',
								line: i
							})) || '';
							if (!cSeg0 || cSeg0 != cAPR) {
								newRec.setSublistValue({
									sublistId: 'item',
									fieldId: 'cseg1',
									value: cAPR,
									line: i
								});
								log.debug(newRecId, 'Setting line ' + i + ' to APR ' + cSeg1);
							}
						}
					}
				}
			}
			catch (e) { log.error(newRecId, e.message) };
		}

		exports.beforeSubmit = beforeSubmit;
		return exports;

	});