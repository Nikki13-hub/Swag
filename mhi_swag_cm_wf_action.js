          /**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/runtime'], function(record, runtime) {
    function onAction(context){
        log.debug({
            title: 'Start Script'
        });
		var cmId = runtime.getCurrentScript().getParameter({name: 'custscript_del_cm_id'});
		log.debug('cm',cmId);
        var delId = record.delete({type: 'creditmemo', id: Number(cmId)});
		if (delId) {
		log.debug('deleted', delId);
        return true;}
		else {return false;}
    }
    return {
        onAction: onAction
    }
}); 

        