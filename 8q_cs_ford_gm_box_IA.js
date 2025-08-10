/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/log'], function (record, log) {

  function validateLine(context) {
    let rec = context.currentRecord;
    let depText = '';
    try {
      depText = rec.getCurrentSublistText({
        sublistId: 'inventory',
        fieldId: 'department'
      });
    } catch (e) {
      log.error('get text' +e);
    }
    
     try {
      if (depText === 'Ford') {
        rec.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'custcol_8q_ford_check_box',
          value: true
        });
      }
    } catch (e) {
      log.error('is Ford'+e);
    }

    try {
      if (depText !== 'Ford') {
        rec.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'custcol_8q_ford_check_box',
          value: false
        });
      }
    } catch (e) {
      log.error('not ford'+e);
    }

    try {
      if (depText === 'GM') {
        rec.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'custcol_8q_gm_check_box',
          value: true
        });
      }
    } catch (e) {
      log.error('is GM'+e);
    }

    try {
      if (depText !== 'GM') {
        rec.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'custcol_8q_gm_check_box',
          value: false
        });
      }
    } catch (e) {
      log.error('not GM'+e);
    }

    try {
      if (depText === 'Custom Koncepts') {
        rec.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'custcol_8q_custom_k_box',
          value: true
        });
      }
    } catch (e) {
      log.error('is GM'+e);
    }

    try {
      if (depText !== 'Custom Koncepts') {
        rec.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'custcol_8q_custom_k_box',
          value: false
        });
      }
    } catch (e) {
      log.error('not GM'+e);
    }

    try {
      if (depText === 'Grills') {
        rec.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'custcol_8q_grills_box',
          value: true
        });
      }
    } catch (e) {
      log.error('is GM'+e);
    }

    try {
      if (depText !== 'Grills') {
        rec.setCurrentSublistValue({
          sublistId: 'inventory',
          fieldId: 'custcol_8q_grills_box',
          value: false
        });
      }
    } catch (e) {
      log.error('not GM'+e);
    }

    return true;
  }

  return {
    validateLine: validateLine
  };

});
