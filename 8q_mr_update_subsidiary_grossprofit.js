/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
	Auther : Radhakrishnan
	Created Date : 12 Jan 2024
	Purpose : To update 'Gross Profit' custom field at the subsidiary level
*/
define(['N/record', 'N/runtime', 'N/search'],
	function(record, runtime, search) {
		function getInputData() {
			let functionName = 'getInputData';
			try {
				let scriptObj = runtime.getCurrentScript();
				let s_savesearch_ID = scriptObj.getParameter('custscript_8q_mr_subsidiary_ss');
				return search.load({
					id: s_savesearch_ID
				});
			} catch (e) {
				log.error(functionName, 'error->' + e.message);
			}
		}

		function map(context) {
			let functionName = 'map';
			let subsidiaryId = context.key;
			try {
				let grossProfit = 0;
				let income = 0;
				let profitPerc=0;
				let filterData = [];
				filterData.push(['trandate', 'within', 'thismonthtodate']);
				filterData.push('AND');
				filterData.push(['posting', 'is', 'T']);
				filterData.push('AND');
				if (subsidiaryId == 2) {
					filterData.push(['account', 'anyof', '276', '1910', '213', '1866']);
					filterData.push('AND');
					filterData.push(['subsidiary', 'anyof', '2', '5']);
					filterData.push('AND');
					filterData.push(['department', 'noneof', '5']);
				} 
				else if (subsidiaryId == 3) {
					filterData.push(['account', 'anyof', '276', '213']);
					filterData.push('AND');
					filterData.push(['subsidiary', 'anyof', '3', '5']);
					filterData.push('AND');
					filterData.push(['department', 'noneof', '6']);
				}
				var transactionSearchObj = search.create({
					type: "transaction",
					filters: filterData,
					columns: [
						search.createColumn({
							name: "formulanumeric",
							summary: "SUM",
							formula: "(CASE WHEN {accounttype} = 'Income' THEN {amount} ELSE 0 END) - (CASE WHEN {accounttype} = 'Cost of Goods Sold' THEN {amount} ELSE 0 END)",
							label: "Formula (Numeric)"
						 }),
						 search.createColumn({
							name: "formulanumeric",
							summary: "SUM",
							formula: "CASE WHEN {accounttype} = 'Income' THEN {amount} ELSE 0 END",
							label: "Formula (Numeric)"
						 })
					]
				});
				transactionSearchObj.run().each(function(result) {
					grossProfit = result.getValue(result.columns[0]);
					income = result.getValue(result.columns[1]) || 0;
					return true;
				});
				if(income!=0){
					profitPerc=((grossProfit/income)*100).toFixed(2);
				}
				let objRecord = record.load({
					type: record.Type.SUBSIDIARY,
					id: subsidiaryId,
					isDynamic: true
				});
				objRecord.setValue('custrecord_8q_subs_grossprofit', grossProfit);
				objRecord.setValue('custrecord_8q_subs_grossprofit_perc', profitPerc);
				objRecord.save();
			} catch (ex) {
				log.error(functionName + ': #' + subsidiaryId, 'exception->' + ex);
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