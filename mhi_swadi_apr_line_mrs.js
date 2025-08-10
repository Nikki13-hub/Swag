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
		var aSql = `select t.id, t.recordtype, t.createddate, t.cseg1, LISTAGG(tl.linesequencenumber-1,',') lines, LISTAGG(tl.item,',') items from transaction t
		right join transactionline tl on tl.transaction = t.id
		where t.cseg1 is not null and tl.cseg1 is null and tl.accountinglinetype = 'INCOME' and t.recordtype != 'salesorder' and tl.netamount != 0 
		group by t.id, t.recordtype, t.createddate, t.cseg1 order by t.createddate desc`;
      	var results = selectAllRows(aSql);
        log.debug('Execute', results.length + ' record updates.')
		return results;
*/
	}
			
	function map(context) {
/*
			try {
      var data = JSON.parse(context.value);
        var recId = data.id;
		var recType = data.recordtype;
        var recTypeL = recType.toLowerCase();
		var recAPR = data.cseg1;
        log.debug(recId, recType + ' ' + recAPR);
		var cRecord = record.load({
			type: recTypeL,
			id: recId
		});
      }
      catch(d) {log.debug('Load Error', d.message);}
		var recLoc = cRecord.getValue({fieldId: 'location'});
        var numLines = cRecord.getLineCount({
						sublistId: 'item'
					});
		for (var i = 0; i < numLines; i++) {
          try {
          var lineLoc = cRecord.getSublistValue({
          	sublistId: 'item',
            fieldId: 'location',
            line: i
          })||'';
          var lineSeg = cRecord.getSublistValue({
            	sublistId: 'item',
            	fieldId: 'cseg1',
            	line: i
          	})||'';
            log.debug(recId, 'Read: Line ' + i + ' APR ' + lineSeg + ' Loc ' + lineLoc);
          if (lineLoc) {
            
           if (!lineSeg) {
			cRecord.setSublistValue({
				sublistId: 'item',
				fieldId: 'cseg1',
				value: Number(recAPR),
				line: i
			});
               log.debug(recId, 'Set: Line ' + i + ' APR: ' + recAPR);
            }
          }
          }
          catch(e) {
            log.debug(recId, 'Line: ' + i + ' ' + e.message);
          }
          }
       try {
		var recSave = cRecord.save();
		log.debug(recSave, 'Update Complete');
		}
		catch(e) {
			log.debug(recId, 'On save ' + e.message);
		}
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
