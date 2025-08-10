/**
*@NApiVersion 2.1
*@NScriptType MapReduceScript
*/

define(['N/record', 'N/query', 'N/format', 'N/runtime', 'N/file', 'N/search'],
function(record, query, format, runtime, file, search) {

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

	function getInputData() {
		var scriptRec = runtime.getCurrentScript();
		log.debug('Start', scriptRec);
		var fileId = scriptRec.getParameter({name: 'custscript_je_to_post'})||'';
		if (fileId) {
		log.debug('Start', 'Loading JE ' + fileId);
		//var lpoSql = `select linesequencenumber, netamount, creditforeignamount, expenseaccount, BUILTIN.DF(expenseaccount) acct, memo, accountinglinetype, entity from transactionline where  entity is not null and transaction = ${fileId}`;
		var lpoSql = `select entity,  SUM(creditforeignamount) total from transactionline where entity is not null and transaction = ${fileId} group by entity`;
		var lpoData = selectAllRows(lpoSql);
		log.debug('Applying', lpoData.length + ' open payments to invoice transactions.');
		/*
		var postMe = [];
		lpoData.forEach(function(line) {
			try {
			var memoJSON = JSON.parse(line.memo);
			var invId = Number(memoJSON.id);
			var invAmt = Number(line.creditforeignamount);
			var postingLine = {};
			postingLine.id = invId;
			postingLine.amt = invAmt;
			postMe.push(postingLine);
			return true;
			} 
			catch(e) {
				log.debug('Parse error', line.memo);
				return true;
			}
		});
		return postMe;
		}
		return false;
		*/
		return lpoData;
	}
	return false;
	}
		
	function map(context) {
			//var key = Number(context.key);
			var scriptRec = runtime.getCurrentScript();
			var fileId = Number(scriptRec.getParameter({name: 'custscript_je_to_post'}))||'';
			var data = JSON.parse(context.value);
			var entity = Number(data.entity);
			var total = Number(data.total);
			var payment = record.create({
				type: record.Type.CUSTOMER_PAYMENT
			});
			payment.setValue({fieldId: 'customer', value: entity});
			payment.setValue({fieldId: 'payment', value: total});
			payment.setValue({fieldId: 'autoapply', value: true});
			var pmtId = payment.save();
			log.debug('Payment Posted', pmtId);
			var lpoRec = record.create({
				type: 'customrecord_mhi_swag_lpo_data_log'
			})
			lpoRec.setValue({fieldId: 'custrecord_mhi_swag_lpo_je', value: fileId});
			lpoRec.setValue({fieldId: 'custrecord_mhi_swag_lpo_pmt_data', value: pmtId});
			var lpoRecId = lpoRec.save();
			log.debug('Logged', lpoRecId);
			/*
      		var invId = Number(data.id);
			var invAmt = Number(data.amt);
			log.debug(invId, invAmt);
			if (invId && invAmt) {
			try {
			var invApplied = 0;
			var pmtApplied = 0;
			var invDates = search.lookupFields({
				type: search.Type.INVOICE,
				id: invId,
				columns: ['trandate']
			});
			var invDate = invDates[0].value||0;
			log.debug(invId, invDate);
			var objCustPaymtRec = record.transform({
				fromType : record.Type.INVOICE,
				fromId : invId,
				toType : record.Type.CUSTOMER_PAYMENT
			});
			var invApplyLns = objCustPaymtRec.getLineCount('apply');
			for (var i = 0; i < invApplyLns; i++) {
					if (objCustPaymtRec.getSublistValue({sublistId: 'apply', fieldId: 'internalid', line: i}) == invId) {
						objCustPaymtRec.setSublistValue({
							sublistId: 'apply',
							fieldId: 'amount',
							value: objCustPaymtRec.getSublistValue({sublistId: 'apply', fieldId: 'total', line: i}),
							line: i
						});
						objCustPaymtRec.setSublistValue({
							sublistId: 'apply',
							fieldId: 'apply',
							value: true,
							line: i
						});
						invApplied++;
						break;
					}
			}
			var cmApplyLns = objCustPaymtRec.getLineCount('credit');
			for (var i = 0; i < cmApplyLns; i++) {
					if (objCustPaymtRec.getSublistValue({sublistId: 'credit', fieldId: 'internalid', line: i}) == fileId) {
						objCustPaymtRec.setSublistValue({
							sublistId: 'credit',
							fieldId: 'amount',
							value: objCustPaymtRec.getSublistValue({sublistId: 'credit', fieldId: 'total', line: i}),
							line: i
						});
						objCustPaymtRec.setSublistValue({
							sublistId: 'credit',
							fieldId: 'apply',
							value: true,
							line: i
						});
						pmtApplied++;
						break;
					}
			}
			if (pmtApplied > 0 && invApplied > 0) {
				var pmtRec = objCustPaymtRec.save({
					enableSourcing : true,
					ignoreMandatoryFields : true
				});
				log.debug('Posted', pmtRec);
			}
			else {
				log.debug('Error', invApplied + ' ' + pmtApplied + ' : Could not post payment.');
			}
			}
			catch(e) {
				log.debug('Error', e.message);
			}
			}
			else {
				log.debug('Invoice not found in system', data);
			}
			*/
	}
		
	return {
		config:{
        retryCount: 3,
        exitOnError: true
		},
		getInputData: getInputData,
		map: map
	};
});
