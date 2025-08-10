/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
	Auther : Rad
	Created Date : 28 Feb 2025
	Purpose : To create distribution JE
*/
define(['N/record', 'N/runtime', 'N/search'],
	function(record, runtime, search) {
		function getInputData() {
			let functionName = 'getInputData';
			try {
				let scriptObj = runtime.getCurrentScript();
				let s_savesearch_ID = scriptObj.getParameter('custscript_sp_dist_je_ss');
				let searchResults = search.load({
					id: s_savesearch_ID
				}).run();
				let dataArray = [];
				// 3 saved search data to be combined and send to map stage.
				searchResults.each(result => {
					dataArray.push({
						account: result.getValue({
							name: 'account',
							summary: 'GROUP'
						}),
						department: result.getValue({
							name: 'department',
							summary: 'GROUP'
						}),
						location: result.getValue({
							name: 'location',
							summary: 'GROUP'
						}),
						apr: result.getValue({
							name: 'line.cseg1',
							summary: 'GROUP'
						}),
						debit: result.getValue({
							name: 'debitamount',
							summary: 'SUM'
						}),
						credit: result.getValue({
							name: 'creditamount',
							summary: 'SUM'
						})
					});
					return true;
				});
				return dataArray;
			} catch (e) {
				log.error(functionName, 'error->' + e.message);
			}
		}

		function map(context) {
			let functionName = 'map';
			try {
				let data = JSON.parse(context.value);
				let account = data['account'];
				let department = data['department'];
				let location = data['location'];
				let apr = data['apr'];
				let debit = parseFloat(data['debit'] || 0);
				let credit = parseFloat(data['credit'] || 0);
				let departments = {};
				if(nullCheck(apr)){
					let lookupData = search.lookupFields({
						type: 'customrecord_cseg1',
						id: apr,
						columns: ['isinactive']
					});
					if (lookupData.isinactive) {
						apr = '';
					}
				}
				//The code fetches all departments and stores them in JSON for later retrieval based on location. However, only the department for a single location is needed, as done for the APR below. Since the code works, it's being kept as is.
				var customrecord_8q_dj_dep_mapSearchObj = search.create({
					type: "customrecord_8q_dj_dep_map",
					columns: [
						search.createColumn({
							name: "custrecord_8q_djdm_loc",
							label: "Location"
						}),
						search.createColumn({
							name: "custrecord_8q_djdm_dep",
							label: "Department"
						})
					]
				});
				customrecord_8q_dj_dep_mapSearchObj.run().each(function(result) {
					departments[result.getValue('custrecord_8q_djdm_loc')] = result.getValue('custrecord_8q_djdm_dep');
					return true;
				});
				if (!nullCheck(account)) {
					log.error('SKIPPED', 'account is empty. debit:' + debit + ',credit:' + credit);
					return;
				}
				if (!nullCheck(location)) {
					log.error('SKIPPED', 'location is empty. debit:' + debit + ',credit:' + credit);
					return;
				}
				if (!nullCheck(department)) {
					department = departments[location];
				}
				if (!nullCheck(department)) {
					log.error('SKIPPED', 'department is empty. debit:' + debit + ',credit:' + credit);
					return;
				}
				if(!nullCheck(apr)){
					var customrecord_8q_dj_apr_mapSearchObj = search.create({
						type: "customrecord_8q_dj_apr_map",
						filters:
						[
						   ["custrecord_8q_djam_loc","anyof",location]
						],
						columns:
						[
						   search.createColumn({name: "custrecord_8q_djam_apr", label: "Area of Primary Responsibility"})
						]
					 });
					 customrecord_8q_dj_apr_mapSearchObj.run().each(function(result){
						apr = result.getValue('custrecord_8q_djam_apr');
						return true;
					 });
				}
				// There is a mapping table which has current location and new location for each subsidiary.
				let locations = {};
				var customrecord_8q_dj_loc_mapSearchObj = search.create({
					type: "customrecord_8q_dj_loc_map",
					columns: [
						search.createColumn({
							name: "custrecord_8q_djlm_cur_loc",
							label: "Current Location"
						}),
						search.createColumn({
							name: "custrecord_8q_djlm_new_loc",
							label: "New Location"
						}),
						search.createColumn({
							name: "custrecord_8q_djlm_sub",
							label: "Subsidiary"
						})
					]
				});
				customrecord_8q_dj_loc_mapSearchObj.run().each(function(result) {
					let key = result.getValue('custrecord_8q_djlm_cur_loc') + '|' + result.getValue('custrecord_8q_djlm_sub');
					locations[key] = result.getValue('custrecord_8q_djlm_new_loc');
					return true;
				});
				let newSubsidiary = (department == 5) ? 3 : 2; // subsidiary mapping based on department
				if (debit > 0) {
					// two JE lines if debit has value, one for distribution subsidiary another for the FAD/ADI subsidiary
					context.write({
						key: '1',
						value: {
							account: account,
							department: department,
							location: location,
							apr: apr,
							debit: 0,
							credit: debit,
							subsidiary: 5
						}
					});
					context.write({
						key: '1',
						value: {
							account: account,
							department: department,
							location: locations[location + '|' + newSubsidiary],
							apr: apr,
							credit: 0,
							debit: debit,
							subsidiary: newSubsidiary,
						}
					});
				}
				if (credit > 0) {
					// similarly, two JE lines if credit has value, one for distribution subsidiary another for the FAD/ADI subsidiary
					context.write({
						key: '1',
						value: {
							account: account,
							department: department,
							location: location,
							apr: apr,
							credit: 0,
							debit: credit,
							subsidiary: 5
						}
					});
					context.write({
						key: '1',
						value: {
							account: account,
							department: department,
							location: locations[location + '|' + newSubsidiary],
							apr: apr,
							credit: credit,
							debit: 0,
							subsidiary: newSubsidiary,
						}
					});
				}
			} catch (ex) {
				log.error(functionName, 'exception->' + ex);
			}
		}

		function reduce(context) {
			let functionName = 'reduce';
			try {
				let scriptObj = runtime.getCurrentScript();
				let txnDate = scriptObj.getParameter('custscript_sp_dist_je_date');
				let postingPeriod = scriptObj.getParameter('custscript_sp_dist_je_pp');
				if(!nullCheck(txnDate)){
					log.error('ERROR', 'Please select date.');
					return;
				}
				if(!nullCheck(postingPeriod)){
					log.error('ERROR', 'Please select posting period.');
					return;
				}
				var journalEntry = record.create({
					type: record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY,
					isDynamic: true
				});
				journalEntry.setValue({
					fieldId: 'subsidiary',
					value: 5
				});
				journalEntry.setValue({
					fieldId: 'trandate',
					value: txnDate
				});
				journalEntry.setValue({
					fieldId: 'postingperiod',
					value: postingPeriod
				});
				// two for loop used since there is a validation in intercompany journal that first line should be the from subsidiary.
				// this loop creates JE line for all distribution subsidiary
				for (let i = 0; i < context.values.length; i++) {
					let parseData = JSON.parse(context.values[i]);
					if (parseData.subsidiary != 5) continue; // skips any other subsidiary except distribution
					journalEntry.selectNewLine({
						sublistId: 'line'
					});
					journalEntry.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'linesubsidiary',
						value: parseData.subsidiary
					});
					journalEntry.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'account',
						value: parseData.account
					});
					journalEntry.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'location',
						value: parseData.location
					});
					if (parseData.debit > 0) {
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'debit',
							value: parseFloat(parseData.debit)
						});
					}
					if (parseData.credit > 0) {
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'credit',
							value: parseFloat(parseData.credit)
						});
					}
					journalEntry.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'department',
						value: parseData.department
					});
					journalEntry.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'cseg1',
						value: parseData.apr
					});
					journalEntry.commitLine({
						sublistId: 'line'
					});
				}
				// this loop creates JE line for all subsidiaries other than distribution.
				for (let i = 0; i < context.values.length; i++) {
					let parseData = JSON.parse(context.values[i]);
					if (parseData.subsidiary == 5) continue; // skips distribution subsidiary
					journalEntry.selectNewLine({
						sublistId: 'line'
					});
					journalEntry.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'linesubsidiary',
						value: parseData.subsidiary
					});
					journalEntry.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'account',
						value: parseData.account
					});
					journalEntry.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'location',
						value: parseData.location
					});
					if (parseData.debit > 0) {
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'debit',
							value: parseFloat(parseData.debit)
						});
					}
					if (parseData.credit > 0) {
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'credit',
							value: parseFloat(parseData.credit)
						});
					}
					journalEntry.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'department',
						value: parseData.department
					});
					journalEntry.setCurrentSublistValue({
						sublistId: 'line',
						fieldId: 'cseg1',
						value: parseData.apr
					});
					journalEntry.commitLine({
						sublistId: 'line'
					});
				}
				// entities are hardcoded against the subsidiary, key in the entites{} is subsidiary id
				let entities = {};
				entities[2] = 13577;
				entities[3] = 13578;
				entities[5] = 13579;
				// this generates unique subsidiary list except distribution subsidiary with total debit and credit.
				let groupSub = [];
				for (let i = 0; i < context.values.length; i++) {
					let parseData = JSON.parse(context.values[i]);
					let {
						subsidiary,
						debit,
						credit
					} = parseData;
					if (subsidiary == 5) continue;
					let existing = groupSub.find(item => item.subsidiary === subsidiary);
					if (existing) {
						existing.totalDebit += debit;
						existing.totalCredit += credit;
					} else {
						groupSub.push({
							'subsidiary': subsidiary,
							'totalDebit': debit,
							'totalCredit': credit
						});
					}
				}
				// loop through the unique subsidiary list to create intercompany elimination JE lines
				for (let i = 0; i < groupSub.length; i++) {
					let parseData = groupSub[i];
					let difference = Math.abs(parseData.totalDebit - parseData.totalCredit);
					if (parseData.totalDebit > parseData.totalCredit) {
						journalEntry.selectNewLine({
							sublistId: 'line'
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'linesubsidiary',
							value: 5
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: 921
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'debit',
							value: difference
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'eliminate',
							value: true
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: entities[parseData.subsidiary]
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'duetofromsubsidiary',
							value: parseData.subsidiary
						});
						journalEntry.commitLine({
							sublistId: 'line'
						});
						journalEntry.selectNewLine({
							sublistId: 'line'
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'linesubsidiary',
							value: parseData.subsidiary
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: 928
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'credit',
							value: difference
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'eliminate',
							value: true
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: entities[5]
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'duetofromsubsidiary',
							value: 5
						});
						journalEntry.commitLine({
							sublistId: 'line'
						});
					} else {
						journalEntry.selectNewLine({
							sublistId: 'line'
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'linesubsidiary',
							value: 5
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: 928
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'credit',
							value: difference
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'eliminate',
							value: true
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: entities[parseData.subsidiary]
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'duetofromsubsidiary',
							value: parseData.subsidiary
						});
						journalEntry.commitLine({
							sublistId: 'line'
						});
						journalEntry.selectNewLine({
							sublistId: 'line'
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'linesubsidiary',
							value: parseData.subsidiary
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'account',
							value: 927
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'debit',
							value: difference
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'eliminate',
							value: true
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'entity',
							value: entities[5]
						});
						journalEntry.setCurrentSublistValue({
							sublistId: 'line',
							fieldId: 'duetofromsubsidiary',
							value: 5
						});
						journalEntry.commitLine({
							sublistId: 'line'
						});
					}
				}
				let id = journalEntry.save();
				log.audit('Adv. JE Created', 'Internal ID : '+id);
			} catch (ex) {
				log.error(functionName, 'exception->' + ex);
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

		function nullCheck(value) {
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