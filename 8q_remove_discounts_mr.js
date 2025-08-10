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
            const savedSearchId = 7022;
            return search.load({ id: savedSearchId });
        };

        const reduce = (context) => {
            log.debug('Reduce START', 'Reduce START')
            const contextValueObject = JSON.parse(context.values),
                { recordType, id } = contextValueObject;

            try {
                const invoiceRec = record.load({
                    type: recordType,
                    id: id,
                    isDynamic: true
                });
                invoiceRec.setValue('discountitem', '');
                invoiceRec.setValue('discountrate', '');
                invoiceRec.setValue('custbody_8q_disc_removed', true);
                _setLineItems(invoiceRec);
                const sub_id = invoiceRec.save();
                log.debug('sub_id', sub_id);
            } catch (e) {
                log.error('REDUCE_ERROR', e);
            }

        }


        const _setLineItems = (invoiceRec) => {

            const itemLineCount = invoiceRec.getLineCount({ sublistId: 'item' });

            for (let i = 0; i < itemLineCount; i++) {
                invoiceRec.selectLine({ sublistId: 'item', line: i });
                _setUpLineItem(invoiceRec);
                invoiceRec.commitLine({
                    sublistId: 'item'
                });
            }
        }
        const _setUpLineItem = (invoiceRec) => {
            const isNumberedItem = invoiceRec.getCurrentSublistValue({ 'sublistId': 'item', 'fieldId': 'inventorydetailreq' }) === 'T';
            log.debug('isNumberedItem', isNumberedItem);
            if (isNumberedItem) {
                _addItemInventoryDetail(invoiceRec);
            }
        }

        const _addItemInventoryDetail = (invoiceRec) => {
            const inventoryDetails = invoiceRec.getCurrentSublistSubrecord({ sublistId: 'item', fieldId: 'inventorydetail' }),
                inventoryAssignmentsCount = inventoryDetails.getLineCount('inventoryassignment');
            log.debug('inventoryAssignmentsCount', inventoryAssignmentsCount)
            for (z = 0; z < inventoryAssignmentsCount; z++) {
                inventoryDetails.selectLine({ sublistId: 'inventoryassignment', line: z });
                let lot = inventoryDetails.getCurrentSublistValue({
                    sublistId: 'inventoryassignment',
                    fieldId: 'issueinventorynumber'
                });
                let binnumber = inventoryDetails.getCurrentSublistValue({
                    sublistId: 'inventoryassignment',
                    fieldId: 'binnumber'
                });
                let lotQty = inventoryDetails.getCurrentSublistValue({
                    sublistId: 'inventoryassignment',
                    fieldId: 'quantity'
                });
                log.debug('lot:' + lot + ' bin:' + binnumber, 'lotQty:' + lotQty);
                inventoryDetails.setCurrentSublistValue({
                    sublistId: 'inventoryassignment',
                    fieldId: 'quantity',
                    value: lotQty
                });
                inventoryDetails.commitLine({
                    sublistId: 'inventoryassignment'
                });
            }
        }
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

                return true;

            });
        }

        return { getInputData, reduce, summarize }
    });