/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
    Author : Nikitha Punna
    Created Date : 19 July 2025
    Purpose : To check if the Transit Sales Order is fully committed
              and set the 'Transit Available' checkbox to true on the original SO.
*/

define(['N/record', 'N/runtime', 'N/search'],
    function (record, runtime, search) {

        function getInputData() {
            const functionName = 'getInputData';
            try {
                const searchId = 'customsearch10949_2'; // Replace with parameter if needed
                log.debug(functionName, 'Loading saved search: ' + searchId);

                return search.load({ id: searchId });
            } catch (e) {
                log.error(functionName, 'Error: ' + e.message);
            }
        }

        function map(context) {
            const functionName = 'map';
            const soId = context.key;

            try {
                log.debug(functionName, 'Processing SO ID: ' + soId);

                let committed = true;

                const TransitOrder = record.load({
                    type: record.Type.SALES_ORDER,
                    id: soId,
                    isDynamic: true
                });

                log.debug(functionName, 'Loaded Transit Order ID: ' + TransitOrder.id);

                const original_sales_order = TransitOrder.getValue('custbody_8q_origin_sales_order');
                const transit_tire = TransitOrder.getValue('custbody_mhi_transit_invoice');
                const mountbalance_item = TransitOrder.getValue('custbody_nsps_contains_mb');

                log.debug(functionName, 'Original SO: ' + original_sales_order +
                    ' | Transit Tire: ' + transit_tire +
                    ' | Mount Balance Item: ' + mountbalance_item);

                // Only proceed if this is a transit tire order and not mount balance
                if (transit_tire && mountbalance_item === false) {
                    const lineCount = TransitOrder.getLineCount({ sublistId: 'item' });
                    log.debug(functionName, 'Line Count: ' + lineCount);

                    for (let i = 0; i < lineCount; i++) {
                        const itemType = TransitOrder.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemtype',
                            line: i
                        });

                        if (itemType === 'InvtPart') {
                            const qty = TransitOrder.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                line: i
                            });

                            const qtyCommitted = TransitOrder.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantitycommitted',
                                line: i
                            });

                            const backorderQty = TransitOrder.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantitybackordered',
                                line: i
                            });

                            if (backorderQty > 0 || qty !== qtyCommitted) {
                                committed = false;
                                log.audit('Not Fully Committed',
                                    `Line ${i} has backordered or uncommitted qty. Stopping.`);
                                break;
                            }
                        }
                    }

                    // Proceed only if committed is true
                    if (committed && original_sales_order) {
                        try {
                            log.audit('Conditions Met',
                                'Fully committed. Updating original SO ID: ' + original_sales_order);

                            record.submitFields({
                                type: record.Type.SALES_ORDER,
                                id: original_sales_order,
                                values: {
                                    custbodytransit_available: true // make sure this is the correct field ID
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });

                            // Confirm value
                            const confirmedValue = record.load({
                                type: record.Type.SALES_ORDER,
                                id: original_sales_order
                            }).getValue('custbodytransit_available');

                            log.audit('Update Confirmed',
                                'Original SO ' + original_sales_order +
                                ' checkbox value: ' + confirmedValue);

                        } catch (e) {
                            log.error({
                                title: 'Error Updating Original SO',
                                details: 'Failed to update SO ID ' + original_sales_order +
                                    '. Error: ' + e.message
                            });
                        }
                    } else {
                        log.debug('Skipped',
                            'SO ID ' + soId +
                            ' not fully committed or original SO missing. Not updated.');
                    }
                } else {
                    log.debug('Skipped',
                        'Conditions not met for SO ID ' + soId +
                        '. Transit Tire or MB item not valid.');
                }

                return true;

            } catch (ex) {
                log.error(functionName + ' Error - SO ID: ' + soId, ex.message);
            }
        }

        function summarize(summary) {
            summary.mapSummary.errors.iterator().each(function (key, error) {
                log.error('Map Error for Key: ' + key, error);
                return true;
            });

            summary.reduceSummary.errors.iterator().each(function (key, error) {
                log.error('Reduce Error for Key: ' + key, error);
                return true;
            });
        }

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        };
    });