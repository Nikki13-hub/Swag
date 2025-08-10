/* eslint-disable prefer-destructuring */
/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
/* eslint-disable max-len */
/* eslint-disable no-plusplus */
/* eslint-disable no-unused-vars */
/* eslint-disable no-prototype-builtins */
/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'], (record, search) => {
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
    const crData = getCustomRecords();
    log.debug('crData', crData);
    return crData;
  };


  /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
  const reduce = (context) => {
    const values = JSON.parse(context.values[0]);
    const { soId } = values;
    log.debug('values', values);
    const SOExists = {};
    SOExists.exists = false;
    if (isNotEmpty(soId)) {
      searchForOrder(soId, SOExists);
    }

    let summaryObj = {};
    let updateObj = '';
    if (SOExists.exists) {
      log.debug('updating transactions', true);
      updateObj = updateTransaction(values, SOExists.id);
    } else {
      log.debug('making transactions', true);
      updateObj = createTransaction(values);
    }

    log.debug('updateObj', updateObj);
    if (updateObj.error == true) {
      if (updateObj.hasOwnProperty('errorLines')) {
        summaryObj = {
          errors: updateObj.errorMessage, errorLines: updateObj.errorLines, successLines: updateObj.successLines, soId: updateObj.soId
        };
      } else {
        summaryObj = {
          errors: updateObj.errorMessage, errorLines: values.lines, successLines: null, soId: null
        };
      }
    } else {
      summaryObj = {
        errors: null, errorLines: null, successLines: updateObj.successLines, soId: updateObj.soId
      };
    }

    log.debug('summaryObj', summaryObj);

    context.write({
      key: values.lines[0].sequence,
      value: summaryObj
    });
  };


  /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
  const summarize = (summary) => {
    try {
      const { output } = summary;
      const updateObj = [];
      output.iterator().each((key, value) => {
        const data = JSON.parse(value);
        log.debug(key, data);
        const { errors } = data;
        const { errorLines } = data;
        const { successLines } = data;
        const { soId } = data;
        if (isNotEmpty(errors)) {
          updateObj.push({
            success: false, successLines, errorLines, soId, errors
          });
        } else {
          updateObj.push({
            success: true, successLines, errorLines, soId
          });
        }

        return true;
      });

      updateAllCR(updateObj);
    } catch (e) {
      log.error('Cant update CR', e.message);
    }
  };

  const getCustomRecords = () => {
    // const returnObj = [];
    // const orderIds = [];
    const crData = [];
    const realCRData = {};
    const crSearch = search.create({
      type: 'customrecord_mhi_linnworks_staging_order',
      filters:
      [
        ['custrecord_mhi_status', 'anyof', '@NONE@', '1']// , 'OR', ['custrecord_mhi_sequence_num', 'is', '133979'], 'OR', ['custrecord_mhi_sequence_num', 'is', '133116']]
      ],
      columns:
      [
        search.createColumn({ name: 'custrecord_mhi_address', label: 'Address' }),
        search.createColumn({ name: 'custrecord_mhi_batch', label: 'Batch #' }),
        search.createColumn({ name: 'custrecord_mhi_city', label: 'City' }),
        search.createColumn({ name: 'custrecord_mhi_company', label: 'Company' }),
        search.createColumn({ name: 'custrecord_mhi_error_message', label: 'Error Message' }),
        search.createColumn({ name: 'custrecord_mhi_part_item', label: 'Item' }),
        search.createColumn({ name: 'custrecord_mhi_item_description', label: 'Item Description' }),
        search.createColumn({ name: 'custrecord_mhi_ns_order', label: 'NS Order #' }),
        search.createColumn({
          name: 'custrecord_mhi_sequence_num',
          sort: search.Sort.ASC,
          label: 'Order Sequence #'
        }),
        search.createColumn({
          name: 'custrecord_mhi_line',
          sort: search.Sort.ASC,
          label: 'Line #'
        }),
        search.createColumn({ name: 'custrecord_mhi_order_type', label: 'Order Type' }),
        search.createColumn({ name: 'custrecord_mhi_qty', label: 'Qty' }),
        search.createColumn({ name: 'custrecord_mhi_reference', label: 'Reference #' }),
        search.createColumn({ name: 'custrecord_mhi_shipping_address_name', label: 'Shipping Address Name' }),
        search.createColumn({ name: 'custrecord_mhi_state', label: 'State' }),
        search.createColumn({ name: 'custrecord_mhi_status', label: 'Status' }),
        search.createColumn({ name: 'custrecord_mhi_zip_code', label: 'Zip Code' }),
        search.createColumn({ name: 'custrecord_mhi_fad_code', label: 'Name' })
      ]
    });

    crSearch.run().each((result) => {
      const innerObj = {};
      const linkedSO = result.getValue({ name: 'custrecord_mhi_ns_order' });
      const referenceOrder = result.getValue({ name: 'custrecord_mhi_reference' });
      innerObj.internalid = result.id;
      innerObj.address = result.getValue({ name: 'custrecord_mhi_address' });
      innerObj.batch = result.getValue({ name: 'custrecord_mhi_batch' });
      innerObj.city = result.getValue({ name: 'custrecord_mhi_city' });
      innerObj.company = result.getValue({ name: 'custrecord_mhi_company' });
      innerObj.currentError = result.getValue({ name: 'custrecord_mhi_error_message' });
      innerObj.item = result.getValue({ name: 'custrecord_mhi_part_item' });
      innerObj.itemDescription = result.getValue({ name: 'custrecord_mhi_item_description' });
      innerObj.line = result.getValue({ name: 'custrecord_mhi_line' });
      innerObj.currentOrder = linkedSO;
      innerObj.sequence = referenceOrder;
      innerObj.externalid = 'linnworks' + referenceOrder;//
      innerObj.orderType = result.getValue({ name: 'custrecord_mhi_order_type' });
      innerObj.quantity = result.getValue({ name: 'custrecord_mhi_qty' });
      innerObj.referenceOrder = result.getValue({ name: 'custrecord_mhi_sequence_num' });
      innerObj.addressName = result.getValue({ name: 'custrecord_mhi_shipping_address_name' });
      innerObj.state = result.getValue({ name: 'custrecord_mhi_state' });
      innerObj.status = result.getValue({ name: 'custrecord_mhi_status' });
      innerObj.zip = result.getValue({ name: 'custrecord_mhi_zip_code' });
      innerObj.customer = result.getValue({ name: 'custrecord_mhi_fad_code' });
      crData.push(innerObj);
      return true;
    });


    for (let i = 0; i < crData.length; i++) {
      const { currentOrder } = crData[i];
      const { sequence } = crData[i];
      if (isNotEmpty(currentOrder) && !realCRData.hasOwnProperty(currentOrder)) {
        realCRData[currentOrder] = {};
        realCRData[currentOrder].soId = currentOrder;
        realCRData[currentOrder].lines = [];
        realCRData[currentOrder].lines.push(crData[i]);
      } else if (isNotEmpty(currentOrder)) {
        realCRData[currentOrder].lines.push(crData[i]);
      } else if (!realCRData.hasOwnProperty(sequence)) {
        realCRData[sequence] = {};
        realCRData[sequence].soId = '';
        realCRData[sequence].lines = [];
        realCRData[sequence].lines.push(crData[i]);
      } else {
        realCRData[sequence].lines.push(crData[i]);
      }
    }

    return realCRData;
  };

  const searchForOrder = (extId, resultObj) => {
    const returnObj = {};
    returnObj.exists = false;
    const salesorderSearchObj = search.create({
      type: 'salesorder',
      filters:
      [
        ['type', 'anyof', 'SalesOrd'],
        'AND',
        ['mainline', 'is', 'T'],
        'AND',
        ['status', 'noneof', 'SalesOrd:D', 'SalesOrd:E', 'SalesOrd:G', 'SalesOrd:H'],
        'AND',
        ['externalid', 'anyof', extId]
      ],
      columns: []
    });
    const searchResultCount = salesorderSearchObj.runPaged().count;
    log.debug('salesorderSearchObj result count', searchResultCount);
    salesorderSearchObj.run().each((result) => {
      resultObj.exists = true;
      resultObj.id = result.id;
      return true;
    });

    return returnObj;
  };

  const updateTransaction = (data, soId) => {
    const crLines = data.lines;
    const returnObj = {};
    const seenLines = [];
    const errorLines = [];
    const successLines = [];
    const soRecord = record.load({
      type: 'salesorder',
      id: soId,
      isDynamic: true
    });
    const verificationObj = {};
    verificationObj.customer = soRecord.getValue({
      fieldId: 'entity'
    });
    verificationObj.referenceOrder = soRecord.getValue({
      fieldId: 'otherrefnum'
    });
    // const temporarySequence = soRecord.getValue({
    //   fieldId: 'externalid'
    // });
    // verificationObj.sequence = temporarySequence.split('linnworks')[1];
    verificationObj.sequence = soRecord.getValue({
      fieldId: 'custbody8'
    });
    verificationObj.addressText = soRecord.getValue({
      fieldId: 'shippaddress'
    });

    const errorObj = rectifyHeaderData(soRecord, data, true, verificationObj);
    if (errorObj.error == true) {
      return errorObj;
    }

    let lineCount = soRecord.getLineCount({
      sublistId: 'item'
    });

    for (let i = 0; i < lineCount; i++) {
      const comparisonLine = i + 1;
      const matchedIndex = crLines.findIndex((e) => e.line == comparisonLine);
      if (matchedIndex == -1) {
        // NOPE; this now needs to be verification against the SO for creating a new line
      } else if (crLines[matchedIndex].status == 1 || crLines[matchedIndex] == null || crLines[matchedIndex] == '') {
        // Now this is more complicated; this needs to have multie field checking against the SO
        seenLines.push(matchedIndex);
        updateSublist(soRecord, crLines[i], i, true);
        successLines.push(crLines[i]);
      } else {
        // This just be normal
        errorLines.push(crLines[matchedIndex]);
      }
    }

    for (let i = 0; i < crLines.length; i++) {
      if (seenLines.indexOf(i) == -1) {
        if (crLines[i].status == 1 || crLines[i] == null || crLines[i] == '') {
          updateSublist(soRecord, crLines[i], lineCount, false);
          lineCount++;
          successLines.push(crLines[i]);
        } else {
          errorLines.push(crLines[i]);
        }
      }
    }

    let soID = '';
    let errorMessage = '';
    try {
      soID = soRecord.save();
    } catch (e) {
      log.error('Cant update SO', e.message);
      errorMessage += 'Sales Order for Sequence: ' + data.lines[0].sequence + ' couldn\'t be updated. Reason: ' + e.message;
    }

    if (soID == '' || soID == null) {
      returnObj.error = true;
      returnObj.soId = null;
      returnObj.errorLines = errorLines;
      returnObj.successLines = null;
      returnObj.errorMessage = errorMessage;
      return returnObj;
    }

    returnObj.soId = soID;
    if (errorLines.length > 0) {
      returnObj.error = true;
      returnObj.errorLines = errorLines;
      returnObj.successLines = successLines;
      returnObj.errorMessage = 'Lines have incorrect status for updating to orders';
    } else {
      returnObj.error = false;
      returnObj.successLines = successLines;
      returnObj.errorLines = null;
      returnObj.errorMessage = null;
    }

    return returnObj;
  };

  const createTransaction = (data) => {
    const returnObj = {};
    const crLines = data.lines;
    const errorLines = [];
    const successLines = [];
    const soRecord = record.create({
      type: 'salesorder',
      isDynamic: true
    });

    const errorObj = rectifyHeaderData(soRecord, data, false, {});
    if (errorObj.error == true) {
      return errorObj;
    }

    soRecord.setValue({
      fieldId: 'externalid',
      value: data.lines[0].externalid
    });
    soRecord.setValue({
      fieldId: 'custbody8',
      value: data.lines[0].sequence
    });

    for (let i = 0; i < crLines.length; i++) {
      if (crLines[i].status == 1 || crLines[i].status == '' || crLines[i].status == null) {
        updateSublist(soRecord, crLines[i], i, false);
        successLines.push(crLines[i]);
      } else {
        errorLines.push(crLines[i]);
      }
    }


    let soID = '';
    let errorMessage = '';
    try {
      soID = soRecord.save();
    } catch (e) {
      log.error('Cant create SO', e.message);
      errorMessage += 'Sales Order for Sequence: ' + data.lines[0].sequence + ' couldn\'t be created. Reason: ' + e.message;
    }

    if (soID == '' || soID == null) {
      returnObj.error = true;
      returnObj.soId = null;
      returnObj.errorLines = errorLines;
      returnObj.successLines = null;
      returnObj.errorMessage = errorMessage;
      return returnObj;
    }

    returnObj.soId = soID;
    if (errorLines.length > 0) {
      returnObj.error = true;
      returnObj.errorLines = errorLines;
      returnObj.successLines = successLines;
      returnObj.errorMessage = 'Lines have incorrect status for updating to orders';
    } else {
      returnObj.error = false;
      returnObj.successLines = successLines;
      returnObj.errorLines = null;
      returnObj.errorMessage = null;
    }

    return returnObj;
  };

  const updateSublist = (recordObj, lineData, lineNumber, updateFlag) => {
    if (updateFlag == false) {
      recordObj.selectLine({
        sublistId: 'item',
        line: lineNumber
      });
      recordObj.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'item',
        value: lineData.item
      });
      recordObj.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: lineData.quantity
      });
      recordObj.commitLine({
        sublistId: 'item'
      });
    } else {
      recordObj.selectLine({
        sublistId: 'item',
        line: lineNumber
      });
      const currentItem = recordObj.getCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'item'
      });
      if (currentItem != lineData.item) {
        return false;
      }

      recordObj.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'quantity',
        value: lineData.quantity
      });

      recordObj.commitLine({
        sublistId: 'item'
      });
    }
  };

  const rectifyHeaderData = (soRecord, data, editFlag, historicalData) => {
    const customerMapping = {
      33018: 1244,
      33165: 1245,
      33166: 1246,
      33200: 7103,
      33202: 11931,
      33201: 11927
    };
    const returnObj = {};
    returnObj.error = false;
    if (editFlag == false) {
      const initialHeaderObj = {};
      let comparisonText = '';
      for (let i = 0; i < data.lines.length; i++) {
        log.debug(i, data.lines[i]);
        let innerText = '';
        const currentData = data.lines[i];
        innerText += currentData.addressName;
        innerText += '\n';
        innerText += currentData.company;
        innerText += '\n';
        innerText += currentData.address;
        innerText += '\n';
        innerText += currentData.city;
        innerText += '\n';
        innerText += currentData.state;
        innerText += '\n';
        innerText += currentData.zip;
        if (comparisonText == '') {
          comparisonText = innerText;
        } else if (innerText != comparisonText) {
          returnObj.error = true;
          returnObj.errorMessage = 'Data mismatch; On creation of SO, custom record set for' + initialHeaderObj.externalid + ' sequence has mismatching address information';
          returnObj.errorField = 'company';
        }

        if (i == 0) {
          initialHeaderObj.customer = currentData.customer;
          initialHeaderObj.sequence = currentData.sequence;
          initialHeaderObj.orderType = currentData.orderType;
          initialHeaderObj.referenceOrder = currentData.referenceOrder;
          log.debug('initialHeaderObj', initialHeaderObj);
        }

        if (currentData.customer != initialHeaderObj.customer) {
          returnObj.error = true;
          returnObj.errorMessage = 'Data mismatch; On creation of SO, custom record data set with sequence:' + currentData.sequence + ' has differing header values for Customer';
          returnObj.errorField = 'custrecord_mhi_fad_code';
        }

        if (!customerMapping.hasOwnProperty(currentData.customer)) {
          returnObj.error = true;
          returnObj.errorMessage = 'Data mismatch; On creation of SO, custom record data set with sequence:' + currentData.sequence + ' has invalid Customer Code (FAD Code)';
          returnObj.errorField = 'custrecord_mhi_fad_code';
        }

        if (currentData.sequence != initialHeaderObj.sequence) {
          returnObj.error = true;
          returnObj.errorMessage = 'Data mismatch; On creation of SO, custom record data set with sequence:' + currentData.sequence + ' for sequence';
          returnObj.errorField = 'custrecord_mhi_sequence_num';
        }

        if (currentData.orderType != initialHeaderObj.orderType) {
          returnObj.error = true;
          returnObj.errorMessage = 'Data mismatch; On creation of SO, custom record data set with sequence:' + currentData.sequence + ' had differing header values for Order Type';
          returnObj.errorField = 'custrecord_mhi_order_type';
        }

        if (currentData.referenceOrder != initialHeaderObj.referenceOrder) {
          returnObj.error = true;
          returnObj.errorMessage = 'Data mismatch; On creation of SO, custom record data set with sequence:' + currentData.sequence + ' had differing header for Reference Number';
          returnObj.errorField = 'custrecord_mhi_reference';
        }

        if (returnObj.error == true) {
          break;
        }
      }

      if (returnObj.error == true) {
        return returnObj;
      }

      const realCustomer = customerMapping[initialHeaderObj.customer];
      soRecord.setValue({
        fieldId: 'generatetranidonsave',
        value: true
      });
      soRecord.setValue({
        fieldId: 'entity',
        value: realCustomer
      });
      const location = search.lookupFields({
        type: 'customer',
        id: realCustomer,
        columns: ['custentity_nsps_customer_default_loc']
      });

      if (isNotEmpty(location.custentity_nsps_customer_default_loc)) {
        soRecord.setValue({
          fieldId: 'location',
          value: location.custentity_nsps_customer_default_loc[0].value
        });
      }

      soRecord.setValue({
        fieldId: 'otherrefnum',
        value: initialHeaderObj.referenceOrder
      });
      soRecord.setValue({
        fieldId: 'custbody_nsps_online_ord_type',
        value: 4
      });

      let memoText = '';
      memoText += 'Generated through Automation. OrderType: ' + initialHeaderObj.orderType;
      soRecord.setValue({
        fieldId: 'memo',
        value: memoText
      });
      soRecord.setValue({
        fieldId: 'shipaddress',
        value: comparisonText
      });
      returnObj.error = false;
      return returnObj;
    }

    const initialHeaderObj = {};
    const reverseCustomer = Object.keys(historicalData).find((key) => historicalData[key] === historicalData.customer);
    let comparisonText = '';
    for (let i = 0; i < data.lines.length; i++) {
      log.debug(i, data.lines[i]);
      let innerText = '';
      const currentData = data.lines[i];
      innerText += currentData.addressName;
      innerText += '\n';
      innerText += currentData.company;
      innerText += '\n';
      innerText += currentData.address;
      innerText += '\n';
      innerText += currentData.city;
      innerText += '\n';
      innerText += currentData.state;
      innerText += '\n';
      innerText += currentData.zip;
      if (comparisonText == '') {
        comparisonText = innerText;
      } else if (innerText != comparisonText || innerText != historicalData.addressText) {
        returnObj.error = true;
        returnObj.errorMessage = 'Data mismatch; On creation of SO, custom record set for' + initialHeaderObj.externalid + ' sequence has mismatching address information';
        returnObj.errorField = 'company';
      }

      if (i == 0) {
        initialHeaderObj.customer = currentData.customer;
        initialHeaderObj.sequence = currentData.sequence;
        initialHeaderObj.orderType = currentData.orderType;
        initialHeaderObj.referenceOrder = currentData.referenceOrder;
        log.debug('initialHeaderObj', initialHeaderObj);
      }

      if (currentData.customer != initialHeaderObj.customer || currentData.customer != reverseCustomer) {
        returnObj.error = true;
        returnObj.errorMessage = 'Data mismatch; On creation of SO, custom record data set with sequence:' + currentData.sequence + ' has differing header values for Customer';
        returnObj.errorField = 'custrecord_mhi_fad_code';
      }

      if (!customerMapping.hasOwnProperty(currentData.customer)) {
        returnObj.error = true;
        returnObj.errorMessage = 'Data mismatch; On creation of SO, custom record data set with sequence:' + currentData.sequence + ' has invalid Customer Code (FAD Code)';
        returnObj.errorField = 'custrecord_mhi_fad_code';
      }

      if (currentData.sequence != initialHeaderObj.sequence || currentData.sequence != historicalData.sequence) {
        returnObj.error = true;
        returnObj.errorMessage = 'Data mismatch; On creation of SO, custom record data set with sequence:' + currentData.sequence + ' for sequence';
        returnObj.errorField = 'custrecord_mhi_sequence_num';
      }

      if (currentData.orderType != initialHeaderObj.orderType) {
        returnObj.error = true;
        returnObj.errorMessage = 'Data mismatch; On creation of SO, custom record data set with sequence:' + currentData.sequence + ' had differing header values for Order Type';
        returnObj.errorField = 'custrecord_mhi_order_type';
      }

      if (currentData.referenceOrder != initialHeaderObj.referenceOrder || currentData.referenceOrder != historicalData.referenceOrder) {
        returnObj.error = true;
        returnObj.errorMessage = 'Data mismatch; On creation of SO, custom record data set with sequence:' + currentData.sequence + ' had differing header for Reference Number';
        returnObj.errorField = 'custrecord_mhi_reference';
      }

      if (returnObj.error == true) {
        break;
      }
    }

    if (returnObj.error == true) {
      return returnObj;
    }

    returnObj.error = false;
    return returnObj;

    // here we deal with UPDATING; this should only be done to identify data from CR to ORDER that mismatch
  };

  const updateAllCR = (dataObj) => {
    for (let t = 0; t < dataObj.length; t++) {
      const currentUpdateObj = dataObj[t];
      const hadErrors = currentUpdateObj.success;
      if (hadErrors == false) {
        if (isNotEmpty(currentUpdateObj.soId)) {
          for (let i = 0; i < currentUpdateObj.successLines.length; i++) {
            const updateObj = {};
            updateObj.custrecord_mhi_error_message = 'Succesful Import';
            updateObj.custrecord_mhi_ns_order = currentUpdateObj.soId;
            updateObj.custrecord_mhi_status = 3;
            record.submitFields({
              type: 'customrecord_mhi_linnworks_staging_order',
              id: currentUpdateObj.successLines[i].internalid,
              values: updateObj
            });
          }
        }

        for (let i = 0; i < currentUpdateObj.errorLines.length; i++) {
          const updateObj = {};
          updateObj.custrecord_mhi_error_message = currentUpdateObj.errors;
          updateObj.custrecord_mhi_status = 4;
          record.submitFields({
            type: 'customrecord_mhi_linnworks_staging_order',
            id: currentUpdateObj.errorLines[i].internalid,
            values: updateObj
          });
        }
      } else {
        for (let i = 0; i < currentUpdateObj.successLines.length; i++) {
          const updateObj = {};
          updateObj.custrecord_mhi_error_message = 'Succesful Import';
          updateObj.custrecord_mhi_status = 3;
          updateObj.custrecord_mhi_ns_order = currentUpdateObj.soId;
          record.submitFields({
            type: 'customrecord_mhi_linnworks_staging_order',
            id: currentUpdateObj.successLines[i].internalid,
            values: updateObj
          });
        }
      }
    }
  };

  function isNotEmpty(stValue) {
    if (
      stValue == ''
    || stValue == null
    || stValue == undefined
    || stValue == 'null'
    || stValue == ' '
    ) {
      return false;
    }

    return true;
  }

  return {
    getInputData,
    reduce,
    summarize
  };
});
