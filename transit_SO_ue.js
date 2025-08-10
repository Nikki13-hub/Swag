/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * This script runs after a Sales Order is submitted.
 * It checks if the SO is a "Transit Sales Order" by looking for a link to an "Original Sales Order".
 * If it is, it verifies that EVERY item line on the order is fully committed.
 * If the entire order is committed, it updates a checkbox on the Original Sales Order.
 *
 */
define(['N/record', 'N/log'], function(record, log) {

    function afterSubmit(scriptContext) {
        // 1. Only run on Create or Edit events.
        if (scriptContext.type !== scriptContext.UserEventType.CREATE && scriptContext.type !== scriptContext.UserEventType.EDIT) {
            return;
        }

        const transitSO = scriptContext.newRecord;

        // 2. Identify if this is a Transit SO by checking for the link back to the Original SO.
        const originalSOId = transitSO.getValue({ fieldId: 'custbody_8q_origin_sales_order' });

        // If this field is empty, it's not a TSO we need to process. Exit the script.
        if (!originalSOId) {
            log.debug('Exit: Not a Transit SO', 'The custbody_8q_origin_sales_order field is not populated. Record ID: ' + transitSO.id);
            return;
        }

        log.debug('Processing Transit SO', 'Record ID: ' + transitSO.id + ' | Linked to Original SO ID: ' + originalSOId);

        // 3. Assume the order is fully committed until proven otherwise.
        let isFullyCommitted = true;
        
        const lineCount = transitSO.getLineCount({ sublistId: 'item' });

        // If the TSO has no lines, it cannot be considered "committed" for our purpose.
        if (lineCount === 0) {
            isFullyCommitted = false;
            log.debug('Condition Not Met', 'Transit SO has no item lines.');
        } else {
            // 4. Loop through every item line to check its commitment status.
            for (let i = 0; i < lineCount; i++) {
                const quantity = transitSO.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                const quantityCommitted = transitSO.getSublistValue({ sublistId: 'item', fieldId: 'quantitycommitted', line: i });

                log.debug(`Line ${i} Check`, `Item: ${transitSO.getSublistText({sublistId: 'item', fieldId: 'item', line: i})} | Qty: ${quantity} | Committed: ${quantityCommitted}`);

                // 5. If any line is not fully committed, set the flag to false and stop checking.
                if (quantityCommitted < quantity) {
                    isFullyCommitted = false;
                    log.audit('Condition Not Met', `Line ${i} is not fully committed. Breaking loop.`);
                    break; 
                }
            }
        }

        // 6. If, after checking all lines, the order is still considered fully committed...
        if (isFullyCommitted) {
            try {
                log.audit('Conditions Met!', 'Entire order is fully committed. Attempting to update checkbox on Original SO ID: ' + originalSOId);

                // 7. ...update the checkbox on the Original Sales Order.
                record.submitFields({
                    type: record.Type.SALES_ORDER,
                    id: originalSOId,
                    values: {
                        // The custom checkbox to mark as "True"
                        'custbodytransit_available_so': true
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });

                log.audit('Success', 'Original SO ' + originalSOId + ' has been updated successfully.');

            } catch (e) {
                log.error({
                    title: 'Error Updating Original SO',
                    details: 'Failed to update SO ID ' + originalSOId + '. Error: ' + e.message
                });
            }
        } else {
            log.debug('No Action Taken', 'The Transit SO was not fully committed, so the Original SO was not updated.');
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});