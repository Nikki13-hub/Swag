/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/currentRecord'],

function(search, record, currentRecord) {

    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
        
    }

    function goInvoice(entityId) {
        var curRec = currentRecord.get();
        try{
            window.open('https://6827316.app.netsuite.com/app/accounting/transactions/salesord.nl?entity='+entityId+'&whence=', '_self');
        } catch(e){

        }
    }

    return {
        pageInit: pageInit,
        goInvoice: goInvoice
    };
});