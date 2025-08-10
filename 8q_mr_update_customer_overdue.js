/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
	Auther : Radhakrishnan
	Created Date : 12 Jan 2024
	Purpose : To update 'AR OVER 60 DAYS' custom field at the customer level
*/
define(['N/record', 'N/runtime', 'N/search'],
	function(record, runtime, search) {
		function getInputData() {
			let functionName = 'getInputData';
			try {
				let scriptObj = runtime.getCurrentScript();
				let s_savesearch_ID = scriptObj.getParameter('custscript_8q_mr_overduecustomers_ss');
				return search.load({
					id: s_savesearch_ID
				});
			} catch (e) {
				log.error(functionName, 'error->' + e.message);
			}
		}

		function map(context) {
			let functionName = 'map';
			let customerId = context.key;
			try {
				let overdueBalance = 0;
				var transactionSearchObj = search.create({
					type: "transaction",
					filters:
					[
						["accounttype","anyof","AcctRec"], 
						"AND", 
						["trandate","before","sixtydaysago"], 
						"AND", 
						["amountremaining","notequalto","0.00"], 
						"AND", 
						["customer.internalid","anyof",customerId]
					],
					columns:
					[
						search.createColumn({
							name: "formulacurrency",
							summary: "SUM",
							formula: "CASE WHEN substr({amount},1,1)='-' THEN({amountremaining}*-1) ELSE {amountremaining} END",
							label: "Formula (Currency)"
						 })
					]
				 });
				 transactionSearchObj.run().each(function(result){
					overdueBalance = result.getValue(result.columns[0]);
					return true;
				 });
				record.submitFields({
					type: record.Type.CUSTOMER,
					id: customerId,
					values: {
						custentity_8q_ar_over_60days: overdueBalance
					},
					options: {
						enableSourcing: false,
						ignoreMandatoryFields: true
					}
				});
			} catch (ex) {
				log.error(functionName + ': #' + customerId, 'exception->' + ex);
			}
		}
		
		function summarize(summary) {
			//Grab Map errors
			summary.mapSummary.errors.iterator().each(function(key, value) {
				log.error(key, 'ERROR String: ' + value);
				return true;
			});
			summary.reduceSummary.errors.iterator().each(function(key, value) {
				log.error(key, 'ERROR String: ' + value);
				return true;
			});
		}
		return {
			getInputData: getInputData,
			map: map,
			summarize: summarize
		};
	});