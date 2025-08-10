/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */

define(['N/currentRecord', 'N/runtime', 'N/query', 'N/ui/message'], 
function(currentRecord, runtime, query, message) {
		
		function pageInit(context) {
			console.log(context);
			console.log(context.form);
			var sql = `select id, fullname from subsidiary where parent is not null and iselimination = 'F' order by id`;
			var subs = query.runSuiteQL({query: sql}).asMappedResults();
			subs.forEach(function(s) {
				context.currentRecord.getField({fieldId: 'custpage_locations'}).insertSelectOption({value: s.id, text: s.fullname});
				return true;
			});
			context.currentRecord.getField({fieldId: 'custpage_locations'}).insertSelectOption({value: '0', text: 'All Subsidiaries', isSelected: true});
		    return;
			
        }
		
		return {
			pageInit: pageInit
			};
});