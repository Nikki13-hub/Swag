/**
*@NApiVersion 2.1
*@NScriptType MapReduceScript
*/

define(['N/record', 'N/runtime', 'N/query'],
function(record, runtime, query) {
	
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
	
	function getInputData(context) {
		var aSql = `select t.id, t.recordtype, t.createddate, t.cseg1, LISTAGG(tl.linesequencenumber-1,',') lines, LISTAGG(tl.item,',') items from transaction t
		right join transactionline tl on tl.transaction = t.id
		where( tl.location = 28 and t.cseg1 is null) and t.recordtype != 'salesorder' and tl.quantity != 0 
		group by t.id, t.recordtype, t.createddate, t.cseg1`;
		return selectAllRows(aSql);
	}
			
	function map(context) {
      	var data = JSON.parse(context.value);
		var recId = data.id;
		var recType = data.recordtype;
		var recAPR = data.cseg1;
		try {
		var cRecord = record.load({
			type: recType.toLowerCase(),
			id: recId
		});
		var mLoc = Number(cRecord.getValue({fieldId: 'location'}));
		if (mLoc != 28) {
		cRecord.setValue({fieldId: 'location', value: 28});
		}
		var mSeg = Number(cRecord.setValue({fieldId: 'cseg1'}));
		if (mSeg != 103) {
		cRecord.setValue({fieldId: 'cseg1', value: 103});
		}
		var numLines = cRecord.getLineCount({
			sublistId: 'item'
		});
		/*
		for (var i = 0; i < numLines; i++) {
			var lLoc = Number(cRecord.getSublistValue({
				sublistId: 'item',
				fieldId: 'location',
				line: i
			}));
			if (lLoc != 28) {
			cRecord.setSublistValue({
				sublistId: 'item',
				fieldId: 'location',
				value: 28,
				line: i
			});
			}
			var lSeg = Number(cRecord.getSublistValue({
				sublistId: 'item',
				fieldId: 'cseg1',
				line: i
			}));
			if (lSeg != 103) {
			cRecord.setSublistValue({
				sublistId: 'item',
				fieldId: 'cseg1',
				value: 103,
				line: i
			});
			}
		}
		*/
		var recSave = cRecord.save();
		log.debug('Updated', recSave);
		}
		catch(e) {
			log.debug(recId, e.message);
		}
	}
	
	function summarize(context) {
		log.debug('Summarize', context);
	}
	
	return {
		config:{
        retryCount: 3,
        exitOnError: true
		},
		getInputData: getInputData,
		map: map,
		summarize: summarize
	};
});
