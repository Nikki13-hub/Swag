/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([],
    /**
 * @param{runtime} runtime
 */
    () => {

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            let newRec = scriptContext.newRecord;
            let allow_context = ['create', 'edit', 'copy'];
            if (allow_context.indexOf(scriptContext.type) != -1) {
                let vendor = newRec.getValue('entity');
                log.debug('vendor', vendor);
                let allowed_vendors = ['2974', '3011', '7078'];
                if (allowed_vendors.indexOf(vendor) != -1) {
                    let tranDate = newRec.getValue('trandate');
                    let dueDate = newRec.getValue('duedate');
                    if (!isEmpty(tranDate)) {
                        if(scriptContext.type == 'create'){
                            newRec.setValue('custbody_8q_original_bill_date', tranDate);
                            newRec.setValue({
                                fieldId: 'trandate',
                                value: new Date(),
                                ignoreFieldChange: true
                            });
                        }
                        // let orig_bill_date = newRec.getValue('custbody_8q_original_bill_date');
                        // newRec.setValue('overrideinstallments', true);
                        // if(vendor == 3011) { // 1167
                        //     newRec.setValue('duedate', orig_bill_date);
                        // } else if (vendor == 2974){
                        //     let date_103 = new Date(orig_bill_date);
                        //     date_103.setDate(date_103.getDate() + 30);
                        //     log.debug('date_103', date_103);
                        //     newRec.setValue('duedate', date_103)
                        // }
                    }
                }
            }
        }

        const isEmpty = (value) => {
            return (value == null || (typeof value === "string" && value.trim().length === 0));
        }

        return { beforeSubmit }

    });
