/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 */
define(['N/record', 'N/log'], function(record, log) {
    function post(context) {
      
        log.debug('context', context);
        return { success: true };
    }
    return { post: post };
});