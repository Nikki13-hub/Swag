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
		var aSql = `select createddate, previousdoc, '[' || invoices || ']' invoices, nextcount from (
		select t.createddate, n.previousdoc, LISTAGG(n.nextdoc,',') as invoices, COUNT(n.nextdoc) nextcount from NextTransactionLink n
		join transactionline tl on tl.transaction = n.previousdoc and tl.item = 63948
		join transaction t on t.id = tl.transaction
		where n.linktype = 'OrdBill' group by n.previousdoc, t.createddate order by t.createddate)
		where nextcount > 1 and createddate > '03/31/2023' order by createddate desc`;
      	var results = selectAllRows(aSql);
		log.debug('Execute', results.length + ' record updates.')
		return results;
	}
			
	function map(context) {
		try {
			var data = JSON.parse(context.value);
            //var recLine = '[' + data.invoices + ']';
			var records = JSON.parse(data.invoices);
			var delRec = Math.max(records);
			var delRecId = record.delete({type: 'invoice', id: delRec});
			log.debug('Deleted',delRecId);
		}
		catch(d) {log.debug('Load Error', d.message);}
	}
	
	return {
		config:{
        retryCount: 1,
        exitOnError: true
		},
		getInputData: getInputData,
		map: map
	};
});
