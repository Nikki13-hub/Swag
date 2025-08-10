/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log', 'N/runtime'], (search, record, log, runtime) => {

    function getInputData() {
        const deploymentId = runtime.getCurrentScript().deploymentId;
        log.debug('Deployment ID', deploymentId);

        let searchId;
        if (deploymentId === 'customdeploybackorder_checkbox_mr') {
            searchId = 'customsearch10960_2';
        } else if (deploymentId === 'customdeploy3') {
            searchId = 'customsearch10961_2';
        } else {
            throw new Error('Unsupported deployment ID: ' + deploymentId);
        }

        const soBackorderSearch = search.load({ id: searchId });
        log.debug('Loaded Search ID', soBackorderSearch.id);
        return soBackorderSearch;
    }

    function map(context) {
        const result = JSON.parse(context.value);
        const soId = result.id;
        log.debug(`Processing Sales Order ID: ${soId}`, `Map context value: ${context.value}`);

        try {
            const salesOrder = record.load({
                type: record.Type.SALES_ORDER,
                id: soId,
                isDynamic: false
            });

            const lineCount = salesOrder.getLineCount({ sublistId: 'item' });
            let hasBackOrder = false;

            for (let i = 0; i < lineCount; i++) {
                const backOrdered = salesOrder.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantitybackordered',
                    line: i
                });

                if (backOrdered > 0) {
                    hasBackOrder = true;
                    break;
                }
            }

            const currentFlag = salesOrder.getValue('custbodyso_backordered');

            if (hasBackOrder && !currentFlag) {
                salesOrder.setValue({
                    fieldId: 'custbodyso_backordered',
                    value: true
                });
                salesOrder.save({ ignoreMandatoryFields: true });
                log.audit(`Sales Order ${soId}`, 'Back Order checkbox SET to TRUE');
            } else if (!hasBackOrder && currentFlag) {
                salesOrder.setValue({
                    fieldId: 'custbodyso_backordered',
                    value: false
                });
                salesOrder.save({ ignoreMandatoryFields: true });
                log.audit(`Sales Order ${soId}`, 'Back Order checkbox UNCHECKED (no more backorders)');
            }

        } catch (error) {
            log.error(`Error processing SO ${soId}`, error);
        }
    }

    return {
        getInputData,
        map
    };
});