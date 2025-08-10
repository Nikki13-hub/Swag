/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/ui/serverWidget', 'N/runtime', 'N/task'],

function(record, search, ui, runtime, task) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {
        
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {
        
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
        log.debug('Script Info', 'type='+scriptContext.type+', rec='+scriptContext.newRecord.id);
        if (scriptContext.type != scriptContext.UserEventType.DELETE && scriptContext.newRecord.id) {
            try {
                var scriptObj = runtime.getCurrentScript();
                var rec = record.load({type: 'wave', id: scriptContext.newRecord.id});
                var waveNum = (rec.getValue('trandisplayname')||'').replace('Wave #', '');
                var numLines = rec.getLineCount({sublistId: 'lineitems'});
                log.debug('Line Info >>>' + waveNum, 'length='+numLines);
                if( numLines > 100 ) {
                    var scriptTask = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT
                    });
                    scriptTask.scriptId = 'customscript_setwavenum_ss';
                    scriptTask.params = {'custscript_wave_id': scriptContext.newRecord.id};
                    var taskId = scriptTask.submit();
                    log.debug("afterSubmit", "Scheduled Script: " + taskId);
                    return ;
                }

                for(var i=0;i<numLines;i++) {
                    var soId = rec.getSublistValue({
                        sublistId: 'lineitems',
                        fieldId : 'ordernumberid',
                        line: i
                    });
                    log.debug('SO Info', 'id='+soId);
                    try {
                        record.submitFields({
                            type: 'salesorder',
                            id: soId,
                            values: {
                              'custbody_wave_num': waveNum
                            },
                            options: {
                              enableSourcing: false,
                              ignoreMandatoryFields: true
                            }
                        });
                    } catch(e){
                        if (e.message != undefined)
                            log.error('afterSubmit:ERROR' , e.name + ' ' + e.message);
                        else
                            log.error('afterSubmit:ERROR', 'Unexpected Error' , e.toString()); 
                    } 
                } 
            } catch(e){
                if (e.message != undefined)
                    log.error('afterSubmit:ERROR' , e.name + ' ' + e.message);
                else
                    log.error('afterSubmit:ERROR', 'Unexpected Error' , e.toString()); 
            } 
        }
    }

    return {
        //beforeLoad: beforeLoad,
        //beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
