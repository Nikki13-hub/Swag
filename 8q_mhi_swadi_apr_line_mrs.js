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
        const savedSearchId = 5334;
        return search.load({id: savedSearchId});
    };

    const map = (context) => {
        log.debug('MAP START', 'MAP START')
        const contextValueObject = JSON.parse(context.value),
            {recordType, id} = contextValueObject;
        const tranRecord = record.load({
           type: recordType,
           id: id,
        });
        tranRecord.setValue('memo', 'AOPR Updated');
        const rec_updated = tranRecord.save();
        log.debug('rec_updated',rec_updated);
    };

    const summarize = (summary) => {
    };

    return {getInputData, map, summarize}
});