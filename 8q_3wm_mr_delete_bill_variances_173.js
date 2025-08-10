/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/search', 'N/record', 'N/runtime'], function (search, record, runtime) {
    const SCRIPT_PARAMS = {
        SAVED_SEARCH: 'custscript_8q_3wm_bv_ss',
    }

    const STATUS = {
        PENDING: 1,
        SUCCESS: 2,
        ERROR: 3
    }

    const getInputData = () => {
        // Replace 'YOUR_SAVED_SEARCH_ID' with the ID of your saved search for invoices
        log.debug('INPUT Start', 'INPUT Start')
        let scriptObj = runtime.getCurrentScript();
        let savedSearchId = scriptObj.getParameter({ name: SCRIPT_PARAMS.SAVED_SEARCH });
        log.debug('savedSearchId', savedSearchId);
        let billSearch = search.load({
            id: savedSearchId
        });
        let allResults = []
        let rangeStart = 0;
        let rangeCount = 1000;
        let pagedResults, pageResultsCount;
        do {
            log.debug('start', rangeStart)
            log.debug('end', rangeCount)
            pagedResults = billSearch.run().getRange({
                start: rangeStart,
                end: rangeStart + rangeCount
            });
            allResults = allResults.concat(pagedResults);
            rangeStart += pagedResults.length;
            pageResultsCount = pagedResults.length > 0 ? pagedResults.length : 0;
            //log.debug('pagedResultsCount', pagedResultsCount);
        }
        while (pageResultsCount == rangeCount);

        let data = [];
        let dataObj;
        for (z = 0; z < allResults.length; z++) {
            dataObj = {
                bvid: allResults[z].id,
                billnum: allResults[z].getValue('custrecord_8q_bv_bill_num')
            }
            data.push(dataObj);
        }
        return data;
    }


    const reduce = (context) => {
        log.debug('REDUCE Start', 'REDUCE Start')
        // No reduce logic needed in this case
        let reduceValues = context.values;
        log.debug('reduceValues', reduceValues);
        let firstValue;
        if (reduceValues.length > 0) {
            firstValue = JSON.parse(context.values[0]);
        } else {
            firstValue = JSON.parse(context.values);
        }
        log.debug('firstValue', firstValue);
        let subValues = {};
        try {
            let billProcessor = getBillProcessorByBillNum(firstValue.billnum);
            log.debug('billProcessor', billProcessor);
            if (billProcessor.internalid) {
                if (billProcessor.billpayment) {
                    record.delete({
                        type: record.Type.VENDOR_PAYMENT,
                        id: billProcessor.billpayment,
                    });
                }
                if (billProcessor.bill) {
                    record.delete({
                        type: record.Type.VENDOR_BILL,
                        id: billProcessor.bill,
                    });
                    record.submitFields({
                        type: 'customrecord_8q_3wm_processed_bills',
                        id:  billProcessor.internalid,
                        values: {
                            custrecord_8q_3wm_pr_status: STATUS.ERROR
                        }
                    })
                }

                subValues = {
                    custrecord_8q_bv_bill_processor: billProcessor.internalid,
                    custrecord_8q_bv_status: STATUS.SUCCESS,
                    custrecord_8q_bv_error_msg: ''
                }

            } else {
                log.error(`ERROR: ${firstValue.bvid}`, `No Bill Processor Found for Bill #: ${firstValue.billnum}.`);
                subValues = {
                    custrecord_8q_bv_status: STATUS.ERROR,
                    custrecord_8q_bv_error_msg: `No Bill Processor Found for Bill #: ${firstValue.billnum}.`
                }
            }


        }
        catch (e) {
            log.error('ERROR:' + firstValue.bvid, e);
            subValues = {
                custrecord_8q_bv_status: STATUS.ERROR,
                custrecord_8q_bv_error_msg: JSON.stringify(e)
            }
        }
        let bvId = record.submitFields({
            type: 'customrecord_8q_3wm_gm_bill_varia_173',
            id: firstValue.bvid,
            values: subValues
        });
        log.debug(`Updated BV: ${bvId}`, `Updated BV: ${bvId}`);
    }

    const summarize = (context) => {
        // Log summary details
        if (context.inputSummary.error) {

            log.error('Input Error', context.inputSummary.error);

        }
        context.mapSummary.errors.iterator().each(function (key, error) {

            log.error('Map Error for key: ' + key, error);

            return true;

        });
        context.reduceSummary.errors.iterator().each(function (key, error) {

            log.error('Reduce Error for key: ' + key, error);

            return true;

        });
    }

    const getBillProcessorByBillNum = (billNum) => {
        let billProcessor = {};
        const billsSearchObj = search.create({
            type: "customrecord_8q_3wm_processed_bills",
            filters:
                [
                    ["custrecord_8q_3wm_pr_vendor_bill.numbertext", "is", billNum]
                ],
            columns:
                [
                    search.createColumn({
                        name: "internalid",
                        join: "custrecord_8q_3wm_pr_vendor_bill",
                        label: "Internal ID"
                    }),
                    search.createColumn({ name: "custrecord_8q_3wm_pr_po", label: "Purchase Order" }),
                    search.createColumn({
                        name: "internalid",
                        join: "custrecord_8q_3wm_pr_bill_pay",
                        label: "Internal ID"
                    }),
                    search.createColumn({ name: "custrecord_8q_3wm_pr_status", label: "Status" })
                ]
        });
        results = billsSearchObj.run().getRange({
            start: 0,
            end: 1
        });
        if (results[0]) {
            billProcessor = {
                internalid: results[0].id,
                bill: results[0].getValue({
                    name: "internalid",
                    join: "custrecord_8q_3wm_pr_vendor_bill",
                }),
                billpayment: results[0].getValue({
                    name: "internalid",
                    join: "custrecord_8q_3wm_pr_bill_pay"
                })
            }
        }
        return billProcessor;
    }

    const isEmpty = (value) => {
        return (value == null || (typeof value === "string" && value.trim().length === 0));
    }

    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    };

});