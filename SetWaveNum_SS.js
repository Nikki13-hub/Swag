/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/search', 'N/record', 'N/runtime'],
function (log, search, record, runtime) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */

    function execute(scriptContext) {
    	try {
			var waveId = runtime.getCurrentScript().getParameter("custscript_wave_id");
			log.debug('Script Param', 'wave id='+waveId);
			if( !waveId )	return;
			var rec = record.load({type: 'wave', id: waveId});
            var waveNum = (rec.getValue('trandisplayname')||'').replace('Wave #', '');
            var numLines = rec.getLineCount({sublistId: 'lineitems'});
            log.debug('Line Info >>>' + waveNum, 'length='+numLines);

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
            log.debug('Error In :: Error', 'execute :: ' + e.toString());
        }

        return;
    }

    return {
        execute: execute
    };
    
});
