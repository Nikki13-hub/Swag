/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

define(['N/query', 'N/runtime', 'N/ui/serverWidget', 'N/redirect', 'N/file', 'N/task'],

function(query, runtime, serverWidget, redirect, file, task) {

function sqlResultsTableGenerate(records) {
	if ( records.length === 0 ) {	
		return '<div><p>No records were found.</p></div>';	
	}
	let thead = '<thead><tr><th>File Name</th><th>File ID</th><th>Line Count</th></tr></thead>';	
	var tbody = '<tbody>';
	records.forEach(function(rec) {
		tbody += '<tr><td>' + rec.file_name + '</td><td>' + rec.file_id + '</td><td>' + rec.line_count + '</td></tr>';
		return true;
	});
	tbody += '</tbody>';	
	let stylesheet = `
		<style type = "text/css"> 
			/* Styled Table */
			/* https://dev.to/dcodeyt/creating-beautiful-html-tables-with-css-428l */
			.styled-table {
				border-collapse: collapse;
				margin: 25px 0;
				font-size: 0.9em;
				font-family: sans-serif;
				min-width: 600px;
				box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
				width: 100%;
			}			
			.styled-table th,
			.styled-table td {
				padding: 6px;
			}
			.styled-table thead tr {
				background-color: #607799;
				color: #ffffff;
				text-align: left;
			}			
			.styled-table tbody tr {
				border-bottom: thin solid #dddddd;
			}

			.styled-table tbody tr:nth-of-type(even) {
				background-color: #f3f3f3;
			}
			.styled-table tbody tr.active-row {
				font-weight: bold;
				color: #009879;
			}	
			.styled-table tbody tr:hover {
				background-color: #ffff99;
			}	
			
		</style>
	`;	
	return `
		
		${stylesheet}
		<link rel="stylesheet" type="text/css" href="https://cdn.datatables.net/1.10.25/css/jquery.dataTables.css">
		<script type="text/javascript" charset="utf8" src="https://cdn.datatables.net/1.10.25/js/jquery.dataTables.js"></script>	
		<div style="margin-top: 6px; border: 1px solid #ccc; padding: 24px;">
			<table id="sqlResultsTable" class="styled-table" style="width: 100%;">
				${thead}
				${tbody}
			</table>
		</div>
		<script>
			window.jQuery = window.$ = jQuery;	
			$('#sqlResultsTable').DataTable({searching: false, paging: false, info: false, ordering: false});
		</script>
	`;		
}

function selectAllRows(sql) {
			try {
				var rows = new Array();	
				var resultSql = 'SELECT MAX(ROWNUM) FROM (' + sql + ' )';
				var totalResult = query.runSuiteQL(resultSql);
				var totalResults = totalResult.results;
				var resultLength = totalResults[0].values;
				var pageBlocks = Math.ceil(parseFloat(resultLength)/5000);
				var paginatedRowBegin = 1;
				var paginatedRowEnd = 5000;						
				for (let i = 0; i < pageBlocks; i++) {
					var paginatedSQL = 'SELECT * FROM ( SELECT ROWNUM AS ROWNUMBER, * FROM (' + sql + ' ) ) WHERE ( ROWNUMBER BETWEEN ' + paginatedRowBegin + ' AND ' + paginatedRowEnd + ')';
					var queryResults = query.runSuiteQL({query: paginatedSQL}).asMappedResults(); 	
					rows = rows.concat( queryResults );	
					paginatedRowBegin = paginatedRowBegin + 5000;
					paginatedRowEnd = paginatedRowEnd + 5000;
				}
			} catch(e) {		
				log.error('SuiteQL - error', e.message);
			}	
			return rows;
}

return {
	    onRequest: function(context) {
			var assistant = serverWidget.createAssistant({
                title: 'LPO / DIO Import Assistant',
                hideNavBar: false
            });
			
			var reportcsv = assistant.addStep({
                id: 'reportcsv',
                label: 'Select CSV'
            });
			var reviewcsv = assistant.addStep({
                id: 'reviewcsv',
                label: 'Review CSV'
            });
			assistant.isNotOrdered = false;
		
		var selectCSV = function(messages) {
			if (!messages) {
				var messages = '';
				var messages = 'CSV files must be less than 10,000 lines.<BR>';
				messages += 'Use CSV splitter located <a href="https://vovsoft.com/download/csv-splitter-portable/" target="_blank">here</a> to easily split files.<BR>';
				messages += 'Processing will take a few minutes after clicking next/finish.<BR>';
			}
				assistant.addFieldGroup({
					id: 'topmemo',
					label: 'System Messages'
				});
				assistant.addFieldGroup({
					id: 'datainfo',
					label: 'Options Select'
				});
				var rmemo = assistant.addField({
					id: 'rmemo',
					type: 'INLINEHTML',
					label: 'Messages',
					container: 'topmemo'
				}).defaultValue = messages;
				var rlpo = assistant.addField({
					id: 'rlpo',
					type: 'select',
					label: 'Import Type',
					container: 'datainfo'
				});
				rlpo.addSelectOption({
					value: 'LPO',
					text: 'GM LPO'
				});
				rlpo.addSelectOption({
					value: 'DIO',
					text: 'Ford DIO'
				});
				rlpo.addSelectOption({
					value: 'ECOM',
					text: 'Ford E-Commerce'
				});
			var rfile = assistant.addField({
				id: 'rfile',
				type: 'file',
				label: 'Select CSV File'
			});
		}
		
		var selectReview = function(jsonFiles, iType) {
			log.debug('json',jsonFiles);
			var jsonInput = JSON.parse(jsonFiles);
			var outputFiles = [];
			var inlineTable = '<table border="1" style="width:100%"><tr><th style="400px"> File Name</th><th style="400px">NS File ID</th><th style="400px">Number of Lines</th></tr>';
			jsonInput.forEach(function(f) {
				outputFiles.push(f.file_id);
				inlineTable += '<tr><td>'+f.file_name+'</td><td>'+f.file_id+'</td><td>'+f.line_count+'</td></tr>';
				return true;
			});
			inlineTable += '</table>';
			assistant.addFieldGroup({
				id: 'topmemo',
				label: 'System Messages'
			});
			var fileId2 = assistant.addField({
						id: 'fileid2',
						type: 'TEXTAREA',
						label: 'CSV File ID',
						container: 'topmemo'
					}).updateDisplayType({
							displayType : serverWidget.FieldDisplayType.INLINE
							}).defaultValue = JSON.stringify(outputFiles);
			var iType2 = assistant.addField({
						id: 'itype2',
						type: 'TEXT',
						label: 'Import Type',
						container: 'topmemo'
					}).updateDisplayType({
							displayType : serverWidget.FieldDisplayType.INLINE
							}).defaultValue = iType;
			assistant.addFieldGroup({
				id: 'fileprocess',
				label: 'CSV Files To Process'
			});
			var fileTable = assistant.addField({
						id: 'filetable',
						type: 'INLINEHTML',
						label: 'table',
						container: 'fileprocess'
					}).updateDisplayType({
							displayType : serverWidget.FieldDisplayType.INLINE
							}).defaultValue = sqlResultsTableGenerate(jsonInput);
		}
		
		var writeReview = function(fileId2, iType2) {
		var fileIds = JSON.parse(fileId2);
		var userObj = runtime.getCurrentUser();
		var userId = userObj.id;
		var userEmail = userObj.email;
		var messages = '';
		try {
			if (fileIds.length > 10) {
				messages += 'More than 10 files have been create.<BR>Please reduce the size of the initial CSV file.<BR>';
			}
			else {
			fileIds.forEach(function(f) {
				var scriptTask = task.create({
					taskType: task.TaskType.SCHEDULED_SCRIPT,
					scriptId: 'customscript_mhi_swadi_lpo_cm_ss',
					params: {
						'custscript_mhi_lpo_cm_file': f,
						'custscript_mhi_lpo_cm_uid': userId,
						'custscript_mhi_lpo_cm_uem': userEmail,
						'custscript_mhi_lpo_cm_type': iType2
					}
				});
				var ssTaskId = scriptTask.submit();
				messages += 'CSV mapping submitted as ' + ssTaskId + '.<BR>';
				return true;
			});
			messages += '<BR><BR> Please wait until you receive a job completion email from:<BR><BR>';
			messages += 'User ID: ' + userId + '<BR>';
			messages += 'User Email: ' + userEmail + '<BR><BR>';
			messages += 'before submitting another import.<BR>';
			}
		}
		catch(ex) {
			log.error('csv processor', ex.message);
			messages += 'Failed to submit CSV CM to invoice linking job.<BR>';
		}
			redirect.toSuitelet({
				scriptId: 'customscript_mhi_swadi_cm_import_sl',
				deploymentId: 'customdeploy_mhi_swadi_cm_import_sl',
				parameters: {'messages': messages}
			});
		}
		
					
 if (context.request.method === 'GET') 
            {
			var params = context.request.parameters;
            selectCSV(params.messages);
            assistant.currentStep = reportcsv;
			var asstStep = assistant.currentStep.stepNumber||0;
            context.response.writePage(assistant);
            } else 
            {
				var params = context.request.parameters;
				if (context.request.parameters.next === 'Finish') {
					var fileId2 = context.request.parameters.fileid2||'';
					var iType2 = context.request.parameters.itype2||'';
					if (fileId2 && iType2) {	
						writeReview(fileId2, iType2);
					}
					else {
						selectCSV();
						assistant.currentStep = reportcsv;
						context.response.writepage(assistant);
					}
				}
                else if (context.request.parameters.cancel) {
                    selectCSV();
					assistant.currentStep = reportcsv;
					context.response.writePage(assistant);
				}
				else if (assistant.currentStep.stepNumber === 1) { 
				//else if (assistant.currentStep === reviewcsv) { 
					if (context.request.files) {
						var csvFile = context.request.files.rfile;
						var iType = context.request.parameters.rlpo||'';
						if (iType === 'LPO') {
						var fileJSON = [];
                        var tick = 0;
						csvFile.lines.iterator().each(function(line) {
							var fileLine = {};
							var u = line.value;
                            var v = u.replace(/\\/g, "");
                            var v = u.replaceAll("/\\","");
							var v = u.replaceAll('"','');
							if (v.includes('Ship To')) {
								return true;
							}
							else {
							var w = v.split(",");
							var w2 = w[20];
							if (w2 === 'MISC CHAR') {
							var x = w[9].split("||");
							for (i = 0; i < x.length; i++) {
								let contents = x[i];
								contents = contents.toLowerCase();
								if (contents.includes('order reference')) {
									y = contents.replace(/\D/g,'');
									fileLine.invoice = y;
									log.debug(w[5],w[24]);
									fileLine.total = -parseFloat(w[5]);
									fileLine.amount = -parseFloat(w[24]);
									fileJSON.push(fileLine);
									tick++;
									break;
								}
							}
							}
							return true;
							}
						});
						}
						if (iType === 'ECOM') {
						var fileJSON = [];
                        var tick = 0;
						csvFile.lines.iterator().each(function(line) {
							if (tick < 1) {
								tick++;
								return true;
							}
							var fileLine = {};
							var u = line.value;
                            var v = u.replace(/\\/g, "");
                            var v = u.replaceAll("/\\","");
							var w = v.split(",");
							var lineInvoice = w[1]||'';
							if (lineInvoice) {
                            fileLine.invoice = lineInvoice;
							var lineType = w[10];
							var lineAmount = Number(w[11]);
							if (lineType === 'CREDIT') {
								fileLine.amount = 0 - lineAmount.toFixed(2);
							}
							else {
								fileLine.amount = lineAmount;
							}
							fileJSON.push(fileLine);
							}
							tick++;
							return true;
						});
						}
						if (iType === 'DIO') {
							var fileJSON = [];
							var tick = 0;
							csvFile.lines.iterator().each(function(line) {
								if (tick < 3) {
									tick++;
									return true;
								}
								var fileLine = {};
								var u = line.value;
								var v = u.replace(/\\/g, "");
								var v = u.replaceAll("/\\","");
								var w = v.split(",");
								fileLine.invoice = w[12];
								var lineAmt = w[11];
								fileLine.amount = lineAmt.replace('$','');
								fileJSON.push(fileLine);
								tick++;
								return true;
							});
						}
                        if (tick > 0) {
							var fileLine = 1;
							var fileCount = 1;
							var jsonFiles = [];
							var tempJson = [];
							for (var l = 0; l < fileJSON.length; l++) {
								tempJson.push(fileJSON[l]);
								if (fileLine === 1000 || l === fileJSON.length-1) {
									var fileObj = file.create({
										name: new Date() + 'json'+fileCount+'.json',
										description: 'LPO CSV Upload File ' + fileCount + ' For: ' + new Date(),
										encoding: file.Encoding.UTF8,
										folder: 36594,
										fileType: file.Type.JSON,
										contents: JSON.stringify(tempJson),
										isOnline: true
									});
									var fileId = fileObj.save();	
									var jsonFields = {};
									jsonFields.file_name = 'json'+fileCount+'.json';
									jsonFields.file_id = fileId;
									jsonFields.line_count = fileLine;
									jsonFiles.push(jsonFields);
									fileLine = 1;
									fileCount++;
									tempJson = [];
								}
								else {fileLine++;}
							}
							selectReview(JSON.stringify(jsonFiles), iType);
							assistant.currentStep = assistant.getNextStep();
							context.response.writePage(assistant);
                        }
                        else if (tick === 0) {
                             selectCSV('CSV File Contains No Credit Lines<BR>');
            				 assistant.currentStep = reportcsv;
           					 context.response.writePage(assistant);
                        }
					}
					else {
						selectCSV();
						assistant.currentStep = reportcsv;
						context.response.writePage(assistant);
					}
				}
				else if (assistant.getLastAction() === serverWidget.AssistantSubmitAction.BACK) {
					selectCSV();
					assistant.currentStep = reportcsv;
					context.response.writePage(assistant);
				}
                else { 
                selectCSV();
                assistant.currentStep = reportcsv;
                context.response.writePage(assistant);
                }
            }
        }
    };
});