/* eslint-disable no-plusplus */
/**
 * @NApiVersion 2.1
 * @NScriptType workflowactionscript
 */
define(['N/record', 'N/search'], (record) => {
  /**
     * Definition of the Workflow Action script trigger point.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
  const onAction = (scriptContext) => {
    const soId = scriptContext.newRecord.id;
    log.debug('onAction::soId', soId);

    const ifRec = record.transform({
      fromType: record.Type.SALES_ORDER,
      fromId: soId,
      toType: record.Type.ITEM_FULFILLMENT,
      isDynamic: false
    });
    log.debug('onAction::ifRec', ifRec);

    const lineCount = ifRec.getLineCount({
      sublistId: 'item'
    });
    log.debug('onAction::lineCount', lineCount);

    for (let x = 0; x < lineCount; x++) {
      ifRec.setSublistValue({
        sublistId: 'item',
        fieldId: 'itemreceive',
        line: x,
        value: true
      });
    }
    ifRec.setValue('shipstatus', 'C');
    const savedIfRecId = ifRec.save();
    log.debug('onAction::savedIfRecId', savedIfRecId);
  };

  return {
    onAction
  };
});