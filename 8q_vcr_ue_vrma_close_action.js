/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([],
    
    () => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            let allowed_contexts = ['view'];
            let newRec = scriptContext.newRecord;
            if(allowed_contexts.indexOf(scriptContext.type) != -1){
                let status = newRec.getValue('status');
                let allowed_status = ['Pending Return'];
                if(allowed_status.indexOf(status) != -1){
                    let form = scriptContext.form;
                    form.clientScriptModulePath = 'SuiteScripts/8Quanta/8q_vcr_cs_vrma_close_trigger.js'
                    form.removeButton('closeremaining');
                    form.addButton({
                        id: 'custpage_close_popup',
                        label: 'Close',
                        functionName: `openPopup(${newRec.id})`
                    });
                }
            }
        }

        

        return {beforeLoad}

    });
