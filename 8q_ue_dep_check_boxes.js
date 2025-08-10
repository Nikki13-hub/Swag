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

define(['N/search','N/record','N/ui/serverWidget'],function(search,record) {

	/**
		* Function definition to be triggered before record is loaded.
		*
		* @param {Object} context
		* @param {Record} context.newRecord - New record
		* @param {string} context.type - Trigger type
		* @param {Form} context.form - Current form
		* @Since 2015.2
		*/
	function beforeSubmit(context) {
    if (context.type == 'create' || context.type == 'xedit' || context.type == 'edit') {
      let rec = context.newRecord;
      let depValue = '';
      let sublistId = (rec.type === 'journalentry') ? 'line' : (rec.type === 'inventoryadjustment') ? 'inventory' : 'item'
      let numlines = rec.getLineCount({
        sublistId: sublistId
      });
      for (let i = 0; i < numlines; i++) {
      try {
        depValue = rec.getSublistValue({
          sublistId: sublistId,
          fieldId: 'department',
          line: i
        });
        log.error({depValue})
        if (depValue === '5') {
          rec.setSublistValue({
            sublistId: sublistId,
            fieldId: 'custcol_8q_ford_check_box',
            line: i,
            value: true
          });
          
        }
        if (depValue !== '5') {
          rec.setSublistValue({
            sublistId: sublistId,
            fieldId: 'custcol_8q_ford_check_box',
            line: i,
            value: false
          });
        }
        if (depValue === '6') {
          rec.setSublistValue({
            sublistId: sublistId,
            fieldId: 'custcol_8q_gm_check_box',
            line: i,
            value: true
          });

        }
        if (depValue !== '6') {
          rec.setSublistValue({
            sublistId: sublistId,
            fieldId: 'custcol_8q_gm_check_box',
            line: i,
            value: false
          });
        }
        if (depValue !== '6' || depValue !== '5') {
          rec.setSublistValue({
            sublistId: sublistId,
            fieldId: 'custcol_8q_other_dept',
            line: i,
            value: true
          });
        } 
        if (depValue === '6' || depValue === '5') {
          rec.setSublistValue({
            sublistId: sublistId,
            fieldId: 'custcol_8q_other_dept',
            line: i,
            value: false
          });
        }
      } catch (e) {
        log.error(e.message);
      };
    };
      return true;
	}
}

	return {
		beforeSubmit: beforeSubmit,
	};

});
