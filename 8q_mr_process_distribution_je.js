/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
	Auther : Rad
	Created Date : 05 Dec 2024
	Purpose : To process distribution journals
*/
define(['N/record', 'N/runtime', 'N/search'],
	function(record, runtime, search) {
		function getInputData() {
			// get data from saved search. saved search id passed as a script parameter
			let functionName = 'getInputData';
			try {
				let scriptObj = runtime.getCurrentScript();
				let s_savesearch_ID = scriptObj.getParameter('custscript_sp_dist_ss');
				return search.load({
					id: s_savesearch_ID
				});
			} catch (e) {
				log.error(functionName, 'error->' + e.message);
			}
		}

		function map(context) {
			let functionName = 'map';
			try {
				var customrecord_8q_cc_je_detailsSearchObj = search.create({
					type: "customrecord_8q_cc_je_details",
					filters: [
						["custrecord_8qccjed_je", "anyof", context.key]
					]
				});
				customrecord_8q_cc_je_detailsSearchObj.run().each(function(result) {
					record.delete({
						type: 'customrecord_8q_cc_je_details',
						id: result.id
					});
					return true;
				});
				let glData = []
				let transactionSearchObj = search.create({
					type: "transaction",
					filters: [
						["internalid", "anyof", context.key],
						"AND",
						["posting", "is", "T"],
						//"AND",
						//["mainline", "is", "F"]
					],
					columns: [
						search.createColumn({
							name: "account",
							label: "Account"
						}),
						search.createColumn({
							name: "creditamount",
							label: "Amount (Credit)"
						}),
						search.createColumn({
							name: "debitamount",
							label: "Amount (Debit)"
						}),
						search.createColumn({
							name: "department",
							label: "Department"
						}),
						search.createColumn({
							name: "location",
							label: "Location"
						}),
						search.createColumn({
							name: "line.cseg1",
							label: "Area of Primary Responsibility"
						}),
						search.createColumn({
							name: "postingperiod",
							label: "Posting Period"
						}),
						search.createColumn({
							name: "subsidiary",
							label: "Subsidiary"
						})
					]
				});
				var myResults = getAllResults(transactionSearchObj);
				myResults.forEach(function(result) {
					let lineData = {};
					lineData.key = context.key;
					lineData.account = result.getValue('account');
					lineData.department = result.getValue('department');
					lineData.location = result.getValue('location');
					lineData.apr = result.getValue('line.cseg1');
					lineData.credit = result.getValue('creditamount');
					lineData.debit = result.getValue('debitamount');
					lineData.period = result.getValue('postingperiod');
					lineData.subsidiary = result.getValue('subsidiary');
					if (_logValidation(lineData.account)) {
						glData.push(lineData);
					}
					return true;
				});
				let summarizedData = glData.reduce((acc, item) => {
					let key = `${item.key}-${item.account}-${item.department}-${item.location}-${item.apr}`;
					if (!acc[key]) {
						// Initialize a new group if it doesn't exist
						acc[key] = {
							key: item.key,
							account: item.account,
							department: item.department,
							location: item.location,
							apr: item.apr,
							period: item.period,
							subsidiary: item.subsidiary,
							totalCredit: 0,
							totalDebit: 0,
						};
					}
					// Accumulate credit and debit values (convert to numbers to handle strings)
					acc[key].totalCredit += parseFloat(item.credit) || 0;
					acc[key].totalDebit += parseFloat(item.debit) || 0;
					return acc;
				}, {});
				//log.debug('summarizedData', JSON.stringify(summarizedData));
				for (let key in summarizedData) {
					let line = summarizedData[key];
					context.write({
						key: key,
						value: {
							key: line.key,
							account: line.account,
							department: line.department,
							location: line.location,
							apr: line.apr,
							period: line.period,
							subsidiary: line.subsidiary,
							credit: line.totalCredit,
							debit: line.totalDebit
						}
					});
				}
			} catch (ex) {
				log.error(functionName, 'exception->' + ex);
			}

		}

		function getAllResults(s) {
			var results = s.run();
			var searchResults = [];
			var searchid = 0;
			do {
				var resultslice = results.getRange({
					start: searchid,
					end: searchid + 1000
				});
				resultslice.forEach(function(slice) {
					searchResults.push(slice);
					searchid++;
				});
			} while (resultslice.length >= 1000);
			return searchResults;
		}

		function reduce(context) {
			let functionName = 'reduce';
			try {
				let parseData = JSON.parse(context.values);
				let objRecord = record.create({
					type: 'customrecord_8q_cc_je_details'
				});
				objRecord.setValue('custrecord_8qccjed_je', parseData.key);
				objRecord.setValue('custrecord_8qccjed_type', 'Distribution');
				objRecord.setValue('custrecord_8qccjed_acc', parseData.account);
				objRecord.setValue('custrecord_8qccjed_dep', parseData.department);
				objRecord.setValue('custrecord_8qccjed_location', parseData.location);
				objRecord.setValue('custrecord_8qccjed_apr', parseData.apr);
				objRecord.setValue('custrecord_8qccjed_debit', parseData.debit);
				objRecord.setValue('custrecord_8qccjed_credit', parseData.credit);
				objRecord.setValue('custrecord_8qccjed_period', parseData.period);
				objRecord.setValue('custrecord_8qccjed_subsidiary', parseData.subsidiary);
				objRecord.save();
				context.write({
					key: parseData.key,
					value: parseData.key
				});
			} catch (ex) {
				log.error(functionName, 'exception->' + ex);
			}
		}

		function summarize(summary) {
			summary.output.iterator().each((key, value) => {
				log.audit('PROCESSED', 'Transaction #' + key);
			});
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

		function _logValidation(value) {
			if (value != 'null' && value != '' && value != undefined && value != 'NaN') {
				return true;
			} else {
				return false;
			}
		}

		return {
			getInputData: getInputData,
			map: map,
			reduce: reduce,
			summarize: summarize
		};
	});