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
        const savedSearchId = 10394;
        return search.load({id: savedSearchId});
    };

    const reduce = (context) => {
        log.debug('Reduce START', 'Reduce START')
        // log.debug('context.values', context.values);
        const contextValueObject = JSON.parse(context.values[0]),
            {recordType, id} = contextValueObject;
        const rec_deleted = record.delete({
           type: recordType,
           id: id,
        });
        log.debug('rec_deleted',rec_deleted);
    };

    const summarize = (context) => {
        if (context.inputSummary.error) {

            log.error('Input Error', context.inputSummary.error);

        }
        context.mapSummary.errors.iterator().each(function (key, error) {

            log.error('Map Error for key: ' + key, error);
            return true;

        });

        context.reduceSummary.errors.iterator().each(function (key, error) {

            log.error('Reduce Error for key: ' + key, error);
        });
    };

    return {getInputData, reduce, summarize}
});