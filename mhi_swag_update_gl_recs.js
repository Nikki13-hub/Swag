/**
*@NApiVersion 2.1
*@NScriptType MapReduceScript
*/

define(['N/record', 'N/search', 'N/query'],
function(record, search, query) {
// Currently this search is updating records without any custom GL lines.
	function selectAllRows( sql, queryParams = new Array() ) {
		try {	
			var moreRows = true;	
			var rows = new Array();						
			var paginatedRowBegin = 1;
			var paginatedRowEnd = 5000;						
			do {			
				var paginatedSQL = 'SELECT * FROM ( SELECT ROWNUM AS ROWNUMBER, * FROM (' + sql + ' ) ) WHERE ( ROWNUMBER BETWEEN ' + paginatedRowBegin + ' AND ' + paginatedRowEnd + ')';
				var queryResults = query.runSuiteQL( { query: paginatedSQL, params: queryParams } ).asMappedResults(); 	
				rows = rows.concat( queryResults );	
				if ( queryResults.length < 5000 ) { moreRows = false; }
				paginatedRowBegin = paginatedRowBegin + 5000;
			} while ( moreRows );
		} catch( e ) {		
			log.error( { title: 'selectAllRows - error', details: { 'sql': sql, 'queryParams': queryParams, 'error': e } } );
		}	
		return rows;
}
	
	function getInputData() {
		/*
		var sql = `select t.id, t.tranid, t.type, 
		LISTAGG(CASE WHEN tl.iscustomglline = 'T' THEN tl.iscustomglline END)  
			within group (order by t.id) as cgl from transactionline tl
			join transaction t on t.id = tl.transaction where t.createddate > '05/01/2023' and t.type in('CustInvc','CustCred')
			group by t.id, t.tranid, t.type`;
		var results = selectAllRows(sql);
		var fixResults = [];
		results.forEach(function(line) {
			let hasCGL = line.cgl||'';
			if (!hasCGL) {
				fixResults.push(line);
			}
			return true;
		});
		*/
		var transactionSearchObj = search.create({
		   type: "transaction",
		   filters:
		   [
			  ["type","anyof","CustInvc","CustCred"], 
			  "AND", 
			  ["mainline","is","F"], 
			  "AND", 
			  ["location","anyof","33","13","8","28","9"], 
			  "AND", 
			  ["trandate","onorafter","lastmonthtodate"], 
			  "AND", 
			  ["subsidiary","anyof","2"], 
			  "AND", 
			  ["custbody_nsts_send_to_customer.partner","anyof","@ALL@"]//, 
			  //"AND", 
			  //["internalidnumber","equalto","9564166"]
		   ],
		   columns:
		   [
			  search.createColumn({
				 name: "internalid",
				 summary: "GROUP",
				 label: "Internal ID"
			  }),
			  search.createColumn({
				 name: "type",
				 summary: "GROUP",
				 label: "Type"
			  }),
			  search.createColumn({
				 name: "trandate",
				 summary: "GROUP",
				 label: "Date"
			  }),
			  search.createColumn({
				 name: "tranid",
				 summary: "GROUP",
				 sort: search.Sort.ASC,
				 label: "Document Number"
			  }),
			  search.createColumn({
				 name: "amount",
				 summary: "SUM",
				 label: "Amount"
			  }),
			  search.createColumn({
				 name: "customscript",
				 summary: "MAX",
				 label: "Custom Script"
			  }),
			  search.createColumn({
				 name: "formulatext1",
				 summary: "MAX",
				 formula: "NS_CONCAT({customgl})",
				 label: "Formula (Text)"
			  }),
			  search.createColumn({
				 name: "formulanumeric1",
				 summary: "MAX",
				 formula: "CASE WHEN NS_CONCAT({customscript}) IS NULL THEN 1 ELSE 0 END",
				 sort: search.Sort.DESC,
				 label: "Formula (Numeric)"
			  })
		   ]
		});
		var fixResults = [];
		var pagedData = transactionSearchObj.runPaged({pageSize: 1000});
		pagedData.pageRanges.forEach(function(pageRange) {
			var cPage = pagedData.fetch({index: pageRange.index});
			cPage.data.forEach(function(result) {
				let cogsRow = Number(result.getValue({name: 'formulanumeric1', summary: 'MAX'}))||0;
				if (cogsRow > 0) {
					let fixRow = {};
					fixRow.type = result.getValue({name: 'type', summary: 'GROUP'});
					fixRow.id = result.getValue({name: 'internalid', summary: 'GROUP'});
					fixResults.push(fixRow);
				}
			});
		});
		log.debug('Records Missing Cogs', fixResults.length);
		return fixResults;
    }
	
	function map(context) {
		var data = JSON.parse(context.value);
		try {
			var recordId = data.id;
            var recordTypeID = data.type;
			var recordTypeID = recordTypeID.toLowerCase();
			var recordType = '';
			if (recordTypeID === 'custinvc') {
				recordType = 'invoice';
			}
			else if (recordTypeID === 'custcred') {
				recordType = 'creditmemo';
			}
			if (recordType) {
				var rec = record.load({type: recordType, id: recordId});
				var recSave = rec.save();	
				log.debug(context.key, recordType + ' ' + recSave);
			}
        }
		catch(e) {log.debug('Error', e.message);}
	}
	
	return {
		getInputData: getInputData,
		map: map
	};
});
