/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

define(['N/error', 'N/log'], function(log) {
    function execute(context) {
        log.debug('Start', 'This is a test script to trigger an error for owner notification');

        // Intentionally throw a fake error to test notification
        throw error.create({
            name: 'TEST_OWNER_NOTIFICATION',
            message: 'This is a test error to verify if script owner receives this email.',
            notifyOff: false
        });
    }

    return {
        execute: execute
    };
});