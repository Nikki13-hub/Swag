/** 
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript 
 */ 

define(['N/task', 'N/file', 'N/runtime', 'N/record', 'N/query', 'N/email'],  

function(task, file, runtime, record, query, email) { 

	function randomString() {  
		var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";  
		var string_length = 10;  
		var randomstring = '';  
		for (var i=0; i<string_length; i++) {  
			var rnum = Math.floor(Math.random() * chars.length);  
			randomstring += chars.substring(rnum,rnum+1);  
		}
		return randomstring;
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
				log.debug('Query','Processing ' + i + '/' + pageBlocks);
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

	function convertToCSV(objArray) {
		var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
		var stringKeys = JSON.stringify(Object.keys(objArray[0]));
		var stringKeys = stringKeys.replace('[','');
		var str = stringKeys.replace(']','\r\n');
		for (var i = 0; i < array.length; i++) {
			var line = '';
			for (var index in array[i]) {
				if (line != '') line += ','
				line += array[i][index];
			}	
			str += line + '\r\n';
		}
		return str;
	}
	
	function execute(context) { 
		var scriptObj = runtime.getCurrentScript();
		var fileId = parseInt(scriptObj.getParameter({name: 'custscript_mhi_lpo_cm_file'}));
		var userId = Number(scriptObj.getParameter({name: 'custscript_mhi_lpo_cm_uid'}))||8581;
		var userEmail = scriptObj.getParameter({name: 'custscript_mhi_lpo_cm_uem'})||'timothy.sayles@myersholum.com';
		var importType = scriptObj.getParameter({name: 'custscript_mhi_lpo_cm_type'})||'';
		log.debug('Start','Type: ' + importType + ' File: ' + fileId);
		var jsonFile = file.load({id: fileId});
		var fileJSON = JSON.parse(jsonFile.getContents());
		var rJSON = [];
		for (var l = 0; l < fileJSON.length; l++) {
			var lpoInvoice = Number(fileJSON[l].invoice);
			var lpoAmount = parseFloat(fileJSON[l].amount)||0;
			var rLINE = {};
			rLINE.invoice = lpoInvoice;
			rLINE.amount = lpoAmount;
			rJSON.push(rLINE);
		}
		var results = [];
		var errors = [];
		var je = [];
		var scriptCount = 1;
		var isql = `select t.otherrefnum po, t.tranid invid, t.tranid externalid, t.entity customer, MAX(tl.location) location,  
		'['||LISTAGG('{"item":'||tl.item||',"quantity":'||-tl.quantity||',"payment":'||-tl.foreignamount||',"rate":'||NVL(tl.rateamount,tl.rate)||'}',',')||']' itemline,  
		t.id apply, 
		sum(-tl.netamount) payment, 
		t.foreignamountunpaid amt,
		case when (sum(-tl.netamount) - t.foreignamountunpaid) = 0 then 'T' else 'F' end equal
		 from transaction t 
		join transactionline tl on tl.transaction = t.id
		where t.type = 'CustInvc' and  t.otherrefnum is not null and t.foreignamountunpaid != 0 and tl.mainline = 'F' and tl.taxline = 'F' and tl.accountinglinetype = 'INCOME'
		and BUILTIN.DF(t.entity) like '%`+importType+`%' and t.id = 925184
		group by t.otherrefnum, t.id, 'CM'||t.id, t.entity, t.tranid, t.foreignamountunpaid`;
		var queryResults = selectAllRows(isql);	
		var execLength = rJSON.length + scriptCount;
		log.debug('Open Invoices', queryResults.length);
		var importBatch = randomString();
		try {
		for (var r = 0; r < rJSON.length; r++) {
			var po = rJSON[r].invoice;
			var poString = po.toString();
			var amt = parseFloat(rJSON[r].amount);
			var pass = 0;
			for (var q = 0; q < queryResults.length; q++) {
				var qRef = queryResults[q].po;
				var qRefS = qRef.toString();
				var nsAmount = parseFloat(queryResults[q].amt);
				if (qRefS === poString && nsAmount === amt) {
					var resultLineApply = {};
					resultLineApply.externalid = queryResults[q].externalid;
					resultLineApply.customer = queryResults[q].customer;
					resultLineApply.location = queryResults[q].location;
					resultLineApply.apply = queryResults[q].apply;
					resultLineApply.payment = parseFloat(queryResults[q].payment);
					resultLineApply.po = queryResults[q].po;
					resultLineApply.memo = importBatch;
					je.push(resultLineApply);
					pass = 1;
					break;
				}
			}
			if (pass === 0) {
				errors.push(rJSON[r]);
			}
		}
		} catch (e) {log.error('Script Error', e.message);}
		const res2 = Array.from(je.reduce(
		  (m, {customer, amount}) => m.set(customer, (m.get(customer) || 0) + amount), new Map
		), ([customer, amount]) => ({customer, amount}));
		var fileObj1 = file.create({
			name: importBatch + '.json',
			fileType: file.Type.JSON,
			contents: JSON.stringify(je),
			encoding: file.Encoding.UTF8,
			folder: 34331,
			isOnline: true
		});
		var fileID1 = fileObj1.save();
		try {
			var csvFile = convertToCSV(je);
		}
		catch(e) {log.error('CSV error', e.message);}
		var fileObj2 = file.create({
			name: importBatch + '.csv',
			fileType: file.Type.CSV,
			contents: csvFile,
			encoding: file.Encoding.UTF8,
			folder: 34331,
			isOnline: true
		});
		var fileID2 = fileObj2.save();
		if (errors.length === 0) {
			var errorLine = {};
			errorLine.message = 'No errors';
			errors.push(errorLine);
		}
		var fileObj3 = file.create({
			name: 'errors' + importBatch + '.json',
			fileType: file.Type.JSON,
			contents: JSON.stringify(errors),
			encoding: file.Encoding.UTF8,
			folder: 34331,
			isOnline: true
		});
		var fileID3 = fileObj3.save();
		if (fileID2) {
		var scriptTask = task.create({taskType: task.TaskType.CSV_IMPORT});
		scriptTask.mappingId = 432;
		var f1 = file.load(fileID1);
		var f2 = file.load(fileID2);
		var f3 = file.load(fileID3);
		scriptTask.importFile = f2;
		//var csvImportTaskId = scriptTask.submit();
		//log.debug('Import Set', csvImportTaskId);
		var pRecId = 'No Journal Entry Created';
		var res2Total = 0;
		res2.forEach(function(r) {
			body += 'Customer: ' + r.customer + ' Amount: ' + r.amount + '<BR>';
			res2Total += r.amt;
			return true;
		});
		var body = 'Import batch ' + importBatch + ' has completed.<BR>'
		body += '<BR><BR>Reference files attached.';
		var subject = 'Successful Import Complete';
		if (results.length === 0) {
			subject = 'CSV Import FAILED';
		}
		/*
		email.send({
			 author: userId,
			 recipients: userEmail,
			 subject: 'Import Complete',
			 body: body,
			 attachments: [f1,f2,f3],
		});
		*/
		}
		log.debug('End', fileId);
   } 

    return { 
     execute: execute 
    }; 

}); 