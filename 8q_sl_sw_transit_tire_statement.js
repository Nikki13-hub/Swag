/** 
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
/*
	Auther : Radhakrishnan
	Date : 10 Feb 2022
	Purpose : Suitelet page to generate customer invoice statement
*/
define(['N/record', 'N/ui/serverWidget', 'N/search', 'N/render', 'N/format', 'N/runtime', 'N/redirect', 'N/task', 'N/file'],
	function(record, serverWidget, search, render, format, runtime, redirect, task, file) {
		function onRequest(context) {
			try {
				if (context.request.method == 'GET') {
					// create a form 
					let form = serverWidget.createForm({
						title: 'Print Statements',
						hideNavBar: false
					});
					let objCustomer = form.addField({
						id: 'custpage_customer',
						label: 'Customer',
						type: serverWidget.FieldType.SELECT,
						source: 'Customer'
					});
					objCustomer.updateDisplayType({
						displayType: serverWidget.FieldDisplayType.DISABLED
					});
					let objAllCustomer= form.addField({
						id: 'custpage_chk_allcustomers',
						label: 'All Customers',
						type: serverWidget.FieldType.CHECKBOX
					});
					objAllCustomer.defaultValue='T';
					//objCustomer.isMandatory = true;
					let objSubsidiary = form.addField({
						id: 'custpage_subsidiary',
						label: 'Subsidiary',
						type: serverWidget.FieldType.SELECT,
						source: 'Subsidiary'
					});
					objSubsidiary.isMandatory = true;
					let user = runtime.getCurrentUser();
					objSubsidiary.defaultValue = user.subsidiary;
					objSubsidiary.defaultValue = 2;
					let objFromDate = form.addField({
						id: 'custpage_statement_date',
						label: 'Statement Date',
						type: serverWidget.FieldType.DATE
					});
					objFromDate.isMandatory = true;
					let date = new Date();
					objFromDate.defaultValue = format.format({
						value: date,
						type: format.Type.DATE
					});
					// To date filter
					let objToDate = form.addField({
						id: 'custpage_start_date',
						label: 'Start Date',
						type: serverWidget.FieldType.DATE
					});
					date.setMonth(date.getMonth() - 1);
					objToDate.defaultValue = format.format({
						value: date,
						type: format.Type.DATE
					});
					let objOpen = form.addField({
						id: 'custpage_chk_open',
						label: 'Show Only Open Transactions',
						type: serverWidget.FieldType.CHECKBOX
					});
					objOpen.defaultValue = 'T';
					let objConsolidated = form.addField({
						id: 'custpage_chk_consolidated',
						label: 'Consolidated Statements',
						type: serverWidget.FieldType.CHECKBOX
					});
					objConsolidated.defaultValue = 'T';
					objPrint = form.addField({
						id: 'custpage_filetype',
						type: serverWidget.FieldType.RADIO,
						label: 'PDF',
						source: 'PDF'
					}).updateLayoutType({
						layoutType: serverWidget.FieldLayoutType.STARTROW
					});
					form.addField({
						id: 'custpage_filetype',
						type: serverWidget.FieldType.RADIO,
						label: 'CSV',
						source: 'CSV'
					}).updateLayoutType({
						layoutType: serverWidget.FieldLayoutType.MIDROW
					});
					objPrint.defaultValue = 'PDF';
					let objTxnType=form.addField({
						id: 'custpage_txntype',
						type: serverWidget.FieldType.RADIO,
						label: 'Transit',
						source: 'Transit'
					}).updateLayoutType({
						layoutType: serverWidget.FieldLayoutType.STARTROW
					});
					form.addField({
						id: 'custpage_txntype',
						type: serverWidget.FieldType.RADIO,
						label: 'Non-Transit',
						source: 'Non-Transit'
					}).updateLayoutType({
						layoutType: serverWidget.FieldLayoutType.MIDROW
					});
					form.addField({
						id: 'custpage_txntype',
						type: serverWidget.FieldType.RADIO,
						label: 'All',
						source: 'All'
					}).updateLayoutType({
						layoutType: serverWidget.FieldLayoutType.MIDROW
					});
					objTxnType.defaultValue = 'Transit';
					//objToDate.isMandatory = true;
					form.addSubmitButton({
						label: 'Submit'
					});
					form.clientScriptFileId = 3709534;
					context.response.writePage(form);
				} // END OF GET
				else {
					let stmtDate = context.request.parameters.custpage_statement_date;
					let strtDate = context.request.parameters.custpage_start_date;
					let customer = Number(context.request.parameters.custpage_customer);
					let subsidiary = Number(context.request.parameters.custpage_subsidiary);
					let openTxns = (context.request.parameters.custpage_chk_open === 'T');
					let consolidated = (context.request.parameters.custpage_chk_consolidated === 'T');
					let fileType = context.request.parameters.custpage_filetype;
					let txnType = context.request.parameters.custpage_txntype;
					let formId=251;
					if(txnType=='Non-Transit'){
						formId=254;
					}
					else if(txnType=='All'){
						formId=256;
					}
					if (!_logValidation(strtDate)) {
						let date = new Date(strtDate);
						date.setMonth(date.getMonth() - 1);
						strtDate = format.format({
							value: date,
							type: format.Type.DATE
						});
					}
					if (customer != 0) {
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
						let printMode = 'PDF';
						if (fileType == 'CSV') {
							printMode = 'HTML'
						}
						let transactionFile = render.statement({
							entityId: customer,
							printMode: printMode,
							statementDate: stmtDate,
							startDate: strtDate,
							subsidiaryId: subsidiary,
							formId: formId,
							openTransactionsOnly: openTxns,
							consolidateStatements: consolidated
						});
						if (fileType == 'CSV') {
							let html = transactionFile.getContents();
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
								if (i > 3000) {
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
								contents: rowData
							});

							//csvFile.save();
							context.response.writeFile(csvFile, true);
						} else {
							context.response.writeFile(transactionFile, true);
						}

					} else {
						stmtDate = new Date(stmtDate);

						strtDate = new Date(strtDate);

						let objRec = record.create({
							type: 'customrecord_8q_cust_statement_parent',
							isDynamic: true
						});
						objRec.setValue('custrecord_8q_custstmt_subsidiary', subsidiary);
						objRec.setValue('custrecord_8q_custstmt_statement_date', stmtDate);
						objRec.setValue('custrecord_8q_custstmt_start_date', strtDate);
						objRec.setValue('custrecord_8q_custstmt_opentxns', openTxns);
						objRec.setValue('custrecord_8q_custstmt_cons_statements', consolidated);
						objRec.setValue('custrecord_8q_custstmt_file_type', fileType);
						objRec.setValue('custrecord_8q_custstmt_txntype', txnType);
						let id = objRec.save();

						const myTask = task.create({
							taskType: task.TaskType.MAP_REDUCE,
							scriptId: 'customscript_8q_mr_sw_generate_tire_stmt',
							params: {
								custscript_8q_trst_stmt_id: id
							}
						});
						const taskId = myTask.submit();
						redirect.toRecord({
							type: 'customrecord_8q_cust_statement_parent',
							id: id
						});
					}
				}
			} catch (_e) {

				log.error("error details", _e);

			}
		}

		function _logValidation(value) {
			if (value != 'null' && value != '' && value != undefined && value != 'NaN') {
				return true;
			} else {
				return false;
			}
		}
		return {
			onRequest: onRequest
		};
	});