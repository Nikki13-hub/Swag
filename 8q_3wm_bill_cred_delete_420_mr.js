/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */

define([
    'N/search',
    'N/record'
],
(search, record) => {

    const getInputData = () => {
        log.debug('InputData START', 'InputData START')
        const savedSearchId = 7211;
        let bcSearch =  search.load({id: savedSearchId});
        let data = [];
        let bcId, recordType;
        bcSearch.run().each(function(result){
            bcId = result.getValue({
                name: "internalid",
                join: "CUSTRECORD_8Q_VRMA_CREDIT_420"
            })
            recordType = 'vendorcredit';
            data.push({
                id: bcId,
                recordType: recordType
            });
            return true;
        });
        log.debug('input data',data);
        return data;
    };

    const reduce = (context) => {
        log.debug('Reduce START', 'Reduce START')
        const contextValueObject = JSON.parse(context.values),
            {recordType, id} = contextValueObject;
        const rec_deleted = record.delete({
           type: recordType,
           id: id,
        });
        log.debug('rec_deleted',rec_deleted);
    };

    const summarize = (summary) => {
    };

    return {getInputData, reduce, summarize}
});