/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log', 'N/search', 'N/runtime'], (record, log, search, runtime) => {

    const afterSubmit = (context) => {
        try {
            var executionContext = runtime.executionContext;
            log.debug('Execution context', executionContext);

            // Load record again since entity might not be set in context.newRecord in portal
            var newRec = record.load({
                type: context.newRecord.type,
                id: context.newRecord.id,
                isDynamic: false
            });

            var customerId = newRec.getValue({ fieldId: 'entity' });
            var sendToCustomer = newRec.getValue({ fieldId: 'custbody_nsts_send_to_customer' });

            log.debug('customerId', customerId);
            log.debug('sendToCustomer', sendToCustomer);

            var customerToLookup = sendToCustomer || customerId;
            if (!customerToLookup) {
                log.error('No valid customer found to lookup');
                return;
            }

            var lookup = search.lookupFields({
                type: search.Type.CUSTOMER,
                id: customerToLookup,
                columns: ['salesrep', 'custentity_nsts_bac']
            });

            log.debug('Customer Lookup Result', lookup);

            var relatedSalesRepId = lookup.salesrep?.[0]?.value || null;
            var customerBAC = lookup.custentity_nsts_bac || null;

            if (relatedSalesRepId || customerBAC) {
                record.submitFields({
                    type: newRec.type,
                    id: newRec.id,
                    values: {
                        custbody_swag_sales_rep: relatedSalesRepId,
                        custbody_swag_customer_bac_trans: customerBAC
                    }
                });

                log.audit('Updated Record', {
                    recordId: newRec.id,
                    salesRepId: relatedSalesRepId,
                    bac: customerBAC
                });
            }

        } catch (e) {
            log.error('Error in afterSubmit', e);
        }
    };

    return { afterSubmit };
});
