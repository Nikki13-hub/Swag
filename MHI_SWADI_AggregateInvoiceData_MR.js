/* eslint-disable max-len */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-plusplus */
/* eslint-disable no-unused-vars */
/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/format'], (record, search, format) => {
  /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
  const getInputData = () => {
    const originalInvoices = originalInvoiceData();
    const duplicateInvoices = duplicateInvoiceData();
    const reduceObj = parseInformation(originalInvoices, duplicateInvoices);
    log.debug('total search objects aggregated', reduceObj);

    return reduceObj;
  };

  /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
  const reduce = (context) => {
    const soId = context.key;
    const numberSOINV = collectAllInvoices(soId);
    const invoiceData = JSON.parse(context.values[0]);
    const originalInvoiceId = Object.keys(invoiceData)[0];
    const countOriginalInvoices = Object.keys(invoiceData).length;

    if (countOriginalInvoices > 1) {
      log.error('Invoice: ' + newDocNumber + '. SO_ID: ' + soId, 'This Sales order has more than one original invoice associated with it, and will not be processed.');
      return;
    }

    const originalInvoiceTran = search.lookupFields({
      type: 'invoice',
      id: originalInvoiceId,
      columns: ['tranid']
    });
    const newDocNumber = originalInvoiceTran.tranid;

    let errorFlag = false;
    let inputNumberInvoice = 0;
    for (let i = 0; i < invoiceData[originalInvoiceId].records.length; i++) {
      inputNumberInvoice++;
    }

    inputNumberInvoice++; // This is for the key of the object; assuming that each SO is only related to singular original invoices

    if (inputNumberInvoice != numberSOINV) {
      log.error('Invoice: ' + newDocNumber + '. SO_ID: ' + soId, 'This Sales order has uneven invoice amounts, and will not be processed.');
      return;
    }

    try {
      record.delete({
        type: 'invoice',
        id: originalInvoiceId
      });
    } catch (e) {
      log.error('Cant delete original invoice: ' + newDocNumber + '. SOID: ' + soId, e.message);
      errorFlag = true;
    }

    if (errorFlag) {
      return;
    }

    try {
      deleteDuplicateInvoices(invoiceData[originalInvoiceId].records);
    } catch (e) {
      log.error('Cant delete Duplicate Invoice Array.: ' + invoiceData[originalInvoiceId] + '. SOID: ' + soId, e.message);
      errorFlag = true;
    }

    if (errorFlag) {
      return;
    }

    try {
      const newInvoiceRecord = record.transform({
        fromType: record.Type.SALES_ORDER,
        fromId: soId,
        toType: record.Type.INVOICE,
        isDynamic: true
      });
      const testDate = format.parse({ value: invoiceData[originalInvoiceId].date, type: format.Type.DATE });
      const newPeriod = invoiceData[originalInvoiceId].period;
      newInvoiceRecord.setValue({
        fieldId: 'tranid',
        value: newDocNumber
      });
      newInvoiceRecord.setValue({
        fieldId: 'postingperiod',
        value: newPeriod
      });
      newInvoiceRecord.setValue({
        fieldId: 'trandate',
        value: testDate
      });
      const newInvoiceId = newInvoiceRecord.save();
      log.debug('Sales Order: ' + soId + '. New Invoice Created', newDocNumber);
    } catch (e) {
      log.error('Cant create new invoice. Original Main invoice: ' + newDocNumber + '. SO: ' + soId, e.message);
    }
  };


  /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
  const summarize = (summary) => {

  };

  const originalInvoiceData = () => {
    const returnObj = [];
    const invoiceSearchObj = search.create({
      type: 'invoice',
      filters:
      [
        ['type', 'anyof', 'CustInvc'],
        'AND',
        ['mainline', 'is', 'T'],
        'AND',
        ['custbody_mhi_original_invoice', 'is', 'T'],
        'AND',
        ['custbody_mhi_lucas_flag', 'is', 'F']
      ],
      columns:
      [
        search.createColumn({ name: 'internalid', label: 'Internal ID' }),
        search.createColumn({ name: 'createdfrom', label: 'Created From' }),
        search.createColumn({ name: 'postingperiod', label: 'Internal ID' }),
        search.createColumn({ name: 'trandate', label: 'Created From' })
      ]
    });

    invoiceSearchObj.run().each((result) => {
      const searchObj = {};
      searchObj.soId = result.getValue({ name: 'createdfrom' });
      searchObj.invId = result.getValue({ name: 'internalid' });
      searchObj.period = result.getValue({ name: 'postingperiod' });
      searchObj.date = result.getValue({ name: 'trandate' });
      returnObj.push(searchObj);
      return true;
    });

    return returnObj;
  };

  const duplicateInvoiceData = () => {
    const returnObj = [];
    const invoiceSearchObj = search.create({
      type: 'invoice',
      filters:
      [
        ['type', 'anyof', 'CustInvc'],
        'AND',
        ['mainline', 'is', 'T'],
        'AND',
        ['custbody_mhi_lucas_flag', 'is', 'T'],
        'AND',
        ['custbody_mhi_original_invoice', 'is', 'F']
      ],
      columns:
      [
        search.createColumn({ name: 'internalid', label: 'Internal ID' }),
        search.createColumn({ name: 'createdfrom', label: 'Created From' })
      ]
    });

    invoiceSearchObj.run().each((result) => {
      const searchObj = {};
      searchObj.soId = result.getValue({ name: 'createdfrom' });
      searchObj.invId = result.getValue({ name: 'internalid' });
      returnObj.push(searchObj);
      return true;
    });

    return returnObj;
  };

  const parseInformation = (originalInvoices, duplicateInvoices) => {
    const returnObj = {};
    for (let i = 0; i < originalInvoices.length; i++) {
      const currentSO = originalInvoices[i].soId;
      const origInv = originalInvoices[i].invId;

      if (!returnObj.hasOwnProperty(currentSO)) {
        returnObj[currentSO] = {};
        if (!returnObj[currentSO].hasOwnProperty(origInv)) {
          returnObj[currentSO][origInv] = {};
          returnObj[currentSO][origInv].date = originalInvoices[i].date;
          returnObj[currentSO][origInv].period = originalInvoices[i].period;
          returnObj[currentSO][origInv].records = [];
        }

        for (let t = 0; t < duplicateInvoices.length; t++) {
          if (duplicateInvoices[t].soId == currentSO) {
            returnObj[currentSO][origInv].records.push(duplicateInvoices[t].invId);
          }
        }
      } // We're making an assumption based off the following:
      // SO's that are related to more than 2 ORIGINAL invoices, won't have those invoices creating duplicates
      /* else {
        returnObj[currentSO][origInv] = [];
        for (let t = 0; t < duplicateInvoices.length; t++) {
          returnObj[currentSO][origInv].push(duplicateInvoices[t].invId);
        }
      } */
    }

    return returnObj;
  };

  const collectAllInvoices = (soId) => {
    let invoiceCount = 0;
    const invoiceSearchObj = search.create({
      type: 'invoice',
      filters:
      [
        ['type', 'anyof', 'CustInvc'],
        'AND',
        ['mainline', 'is', 'T'],
        'AND',
        ['createdfrom', 'anyof', soId]
      ],
      columns:
      [
        search.createColumn({ name: 'internalid', label: 'Internal ID' })
      ]
    });

    invoiceSearchObj.run().each((result) => {
      invoiceCount++;
      return true;
    });

    return invoiceCount;
  };

  const deleteDuplicateInvoices = (duplicateInvoiceArray) => {
    for (let i = 0; i < duplicateInvoiceArray.length; i++) {
      record.delete({
        type: 'invoice',
        id: duplicateInvoiceArray[i]
      });
    }
  };

  return {
    getInputData,
    reduce,
    summarize
  };
});
