/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
/*
	Auther : Radhakrishnan
	Created Date : 29 Aug 2023
	Purpose : To create LPO orders
*/
define(['N/record', 'N/runtime', 'N/search', 'N/render', 'N/file', 'N/url'],
	function(record, runtime, search, render, file, url) {
		function getInputData() {
			// get data from saved search. saved search id passed as a script parameter
			let functionName = 'getInputData';
			try {
				let scriptObj = runtime.getCurrentScript();
				let id = scriptObj.getParameter('custscript_8q_trst_stmt_id');
				let lookupData = search.lookupFields({
					type: 'customrecord_8q_cust_statement_parent',
					id: id,
					columns: ['custrecord_8q_custstmt_subsidiary']
				});
				let objSubsidiary = lookupData.custrecord_8q_custstmt_subsidiary;
				let subsidiary = objSubsidiary[0].value;
				return search.create({
					type: "transaction",
					filters: [
						["type", "anyof", "CustInvc", "CustCred"],
						"AND",
						["custbody_mhi_transit_invoice", "is", "T"],
						"AND",
						["subsidiary", "anyof", subsidiary],
						//"AND",
						//["customer.internalid", "anyof", "1902"]
					],
					columns: [
						search.createColumn({
							name: "internalid",
							join: "customer",
							summary: "GROUP",
							sort: search.Sort.ASC,
							label: "Internal ID"
						})
					]
				});
			} catch (e) {
				log.error(functionName, 'error->' + e.message);
			}
		}

		function map(context) {
			let functionName = 'map';
			try {
				var data = JSON.parse(context.value);
				let customer = data.values['GROUP(internalid.customer)'].value;
				if (_logValidation(customer)) {
					customer = Number(customer);
					let scriptObj = runtime.getCurrentScript();
					let id = scriptObj.getParameter('custscript_8q_trst_stmt_id');
					let lookupData = search.lookupFields({
						type: 'customrecord_8q_cust_statement_parent',
						id: id,
						columns: ['custrecord_8q_custstmt_subsidiary', 'custrecord_8q_custstmt_statement_date', 'custrecord_8q_custstmt_start_date', 'custrecord_8q_custstmt_opentxns', 'custrecord_8q_custstmt_cons_statements', 'custrecord_8q_custstmt_file_type', 'custrecord_8q_custstmt_txntype']
					});
					let stmtDate = lookupData.custrecord_8q_custstmt_statement_date;
					let strtDate = lookupData.custrecord_8q_custstmt_start_date;
					let openTxns = lookupData.custrecord_8q_custstmt_opentxns;
					let fileType = lookupData.custrecord_8q_custstmt_file_type;
					let txnType = lookupData.custrecord_8q_custstmt_txntype;
					let formId=251;
					if(txnType=='Non-Transit'){
						formId=254;
					}
					else if(txnType=='All'){
						formId=256;
					}
					let consolidated = lookupData.custrecord_8q_custstmt_cons_statements;
					let objSubsidiary = lookupData.custrecord_8q_custstmt_subsidiary;
					let subsidiary = objSubsidiary[0].value;
					subsidiary = Number(subsidiary);
					if(txnType!='All'){
						let balanceForward = 0;
					let filterData = [];
            			filterData.push(['accounttype', 'anyof', 'AcctRec']);
            			filterData.push('AND');
						filterData.push(['status', 'noneof', 'CustInvc:B', 'CustInvc:D']);
            			filterData.push('AND');
						filterData.push(['type', 'anyof', 'CustInvc', 'CustCred']);
            			filterData.push('AND');
						filterData.push(['amountremaining', 'notequalto', '0.00']);
            			filterData.push('AND');
						filterData.push(['trandate', 'onorbefore', strtDate]);
            			filterData.push('AND');
						filterData.push(['customer.internalid', 'anyof', customer]);
            			filterData.push('AND');
						if(txnType=='Transit'){
							filterData.push(['custbody_mhi_transit_invoice', 'is', 'T']);
						}
						else{
							filterData.push(['custbody_mhi_transit_invoice', 'is', 'F']);
						}
					let transactionSearchObj = search.create({
						type: "transaction",
						filters: filterData,
						columns: [
							search.createColumn({
								name: "entity",
								summary: "GROUP",
								label: "Name"
							}),
							search.createColumn({
								name: "amountremaining",
								summary: "SUM",
								label: "Amount Remaining"
							})
						]
					});
					transactionSearchObj.run().each(function(result) {
						balanceForward = result.getValue({
							name: "amountremaining",
							summary: "SUM"
						});
						return true;
					});
					record.submitFields({
						type: record.Type.CUSTOMER,
						id: customer,
						values: {
							custentity_8q_balance_forward: balanceForward
						},
						options: {
							enableSourcing: false,
							ignoreMandatoryFields: true
						}
					});
					}
					let fileId = '';
					let printMode = 'PDF';
					if (fileType == 'CSV') {
						printMode = 'HTML'
					}
					let statementFile = render.statement({
						entityId: customer,
						printMode: printMode,
						statementDate: stmtDate,
						startDate: strtDate,
						subsidiaryId: subsidiary,
						formId: formId,
						openTransactionsOnly: openTxns,
						consolidateStatements: consolidated
					});
					if (fileType == 'PDF') {
						statementFile.folder = 130371;
						let d = new Date();
						let text = d.getHours() + '' + d.getMinutes() + '' + d.getSeconds() + '.pdf';
						statementFile.name = customer + '_' + stmtDate + '_' + text;
						fileId = statementFile.save();
					} else {
						let html = statementFile.getContents();
						html = html.substring(html.indexOf('</thead>'), html.length);
						let summaryRow ='';
						if(txnType=='Transit'){
							summaryRow=html.substring(html.indexOf('Amount Due') + 93, html.length);
						}
						else{
							summaryRow=html.substring(html.indexOf('Amount Due') + 98, html.length);
						}
						summaryRow = summaryRow.substring(0, summaryRow.indexOf('</table>') - 11);
						html = html.substring(0, html.indexOf('Amount Due') - 22);
						let i = 0;
						var rowData = 'Date,Invoice/Credit Memo,VIN Number,PO#,Charge,Credits,Balance,';
						rowData = rowData + '\n';
						lineOne = rowData;
						while (html.length > 0) {
							let row = html.substring(html.indexOf('<tr>') + 5, html.indexOf('</tr>'));
							let j = 0;
							let csvRow = '';
							while (_logValidation(row)) {
								let cell = row.substring(row.indexOf('>') + 1, row.indexOf('</td>'));
								row = row.substring(row.indexOf('</td>') + 5, row.length);
								cell = cell.replace(',', '').replace('$', '');
								cell = cell.replace(/\n|\r/g, "");
								rowData = rowData + cell + ',';
								csvRow = csvRow + cell + ',';
								j = j + 1;
								if (j > 50) {
									break; // just to avoid deadlock if at all it goes infinite loop due to any error
								}
							}
							rowData = rowData.substring(0, rowData.length - 1)
							rowData = rowData + '\r\n';
							html = html.substring(html.indexOf('</tr>') + 5, html.length);
							i = i + 1;
							if (i > 1000) {
								break; // just to avoid deadlock if at all it goes infinite loop due to any error
							}
						}
						let chargeTotal = summaryRow.substring(summaryRow.indexOf('>') + 1, summaryRow.indexOf('</th>'));
						chargeTotal = chargeTotal.replace(',', '');
						summaryRow = summaryRow.substring(summaryRow.indexOf('</th>') + 5, summaryRow.length);
						let paymentTotal = summaryRow.substring(summaryRow.indexOf('>') + 1, summaryRow.indexOf('</th>'));
						paymentTotal = paymentTotal.replace(',', '');
						summaryRow = summaryRow.substring(summaryRow.indexOf('</th>') + 5, summaryRow.length);
						let balanceTotal = summaryRow.substring(summaryRow.indexOf('>') + 1, summaryRow.indexOf('</th>'));
						balanceTotal = balanceTotal.replace(',', '');
						let d = new Date();
						let text = d.getHours() + '' + d.getMinutes() + '' + d.getSeconds() + '.csv';
						let fileName = customer + '_' + stmtDate + '_' + text;
						rowData += ',,,,' + chargeTotal + ',' + paymentTotal + ',' + balanceTotal
						var csvFile = file.create({
							name: fileName,
							fileType: file.Type.CSV,
							contents: rowData,
							folder: 130371
						});

						fileId = csvFile.save();

					}
					let fileObj = file.load({
						id: fileId
					});
					var scheme = 'https://';
					var host = url.resolveDomain({
						hostType: url.HostType.APPLICATION
					});
					let fileUrl = scheme + host + fileObj.url;
					let objRec = record.create({
						type: 'customrecord_8q_transit_stmnt_child',
						isDynamic: true
					});
					objRec.setValue('custrecord_8q_ttsc_parent', id);
					objRec.setValue('custrecord_8q_ttsc_customer', customer);
					objRec.setValue('custrecord_8q_ttsc_stmnt_link', fileUrl);
					objRec.save();
				}
			} catch (ex) {
				log.error(functionName, 'exception->' + ex);
			}
		}

		function _logValidation(value) {
			if (value != 'null' && value != '' && value != undefined && value != 'NaN') {
				return true;
			} else {
				return false;
			}
		}

		function summarize(summary) {
			//Grab Map errors
			try {
				let scriptObj = runtime.getCurrentScript();
				let id = scriptObj.getParameter('custscript_8q_trst_stmt_id');
				record.submitFields({
					type: 'customrecord_8q_cust_statement_parent',
					id: id,
					values: {
						'custrecord_8q_custstmt_processed': true
					},
					options: {
						enableSourcing: false,
						ignoreMandatoryFields: true
					}
				});
			} catch (e) {
				log.audit('error on summary', e);
			}
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