/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
 
 define(['N/error', 'N/record', 'N/query', 'N/currentRecord'],
 function(error, record, query, currentRecord) {
 
 function processCM() {
	 //var rec = currentRecord.get();
	 //var rec = context.currentRecord;
	 var lines = context.currentRecord.getLineCount({sublistId: 'ipricing'});
	 for (var i = 0; i < lines; i++) {
		 var process = context.currentRecord.getSublistValue({sublistId: 'ipricing', fieldId: 'processcm', line: i});
		 if (process === true) {
			 console.log(process);
			 context.currentRecord.setSublistValue({sublistId: 'ipricing', fieldId: 'nsinvoice', value: '1234', line: i});
			 context.currentRecord.setSublistValue({sublistId: 'ipricing', fieldId: 'nscredit', value: '4321', line: i});
		 }
	 }
 }
  
 function pageInit(context) {
 }
 
 return {
 pageInit: pageInit,
 processCM: processCM
 };
 });