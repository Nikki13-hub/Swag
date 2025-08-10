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
/*
		var aSql = `select id, itemid, itemtype from item where externalid is null and itemtype = 'InvtPart'`;
		return selectAllRows(aSql);
*/
	}
			
	function map(context) {
/*
				var data = JSON.parse(context.value);
		var recId = data.id;
		try {
			var id = record.submitFields({
			 type: record.Type.INVENTORY_ITEM,
			 id: recId,
			 values: {
			 'externalid': data.itemid
			 },
			 options: {
			 enableSourcing: false,
			 ignoreMandatoryFields : true
			 }
			});
		}
		catch(e) {log.debug('Error',e.message);}
*/
	}
	
	function summarize(context) {
//		log.debug('Summarize', context);
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
