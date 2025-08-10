/**
 *@NApiVersion 2.1
 *@NScriptType MassUpdateScript
 */
define(['N/record'], (record) => {
    function each(params) {
        // Mass delete record
        record.delete({
            type: params.type,
            id: params.id
        });
    }
    return {
        each: each
    };
}); 