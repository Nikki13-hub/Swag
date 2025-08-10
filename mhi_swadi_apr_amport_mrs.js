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
		var aSql = `select t.id, t.recordtype, t.createddate, t.cseg1, tl.location, t.shippingaddress, s.addressee from transaction t
		right join transactionline tl on tl.transaction = t.id
		right join transactionShippingAddress s on s.nkey = t.shippingaddress
		where tl.mainline='T' and lower(s.addressee) like '%amport%' and t.recordtype = 'invoice' and t.cseg1 != 102 order by t.createddate desc`;
		return selectAllRows(aSql);
	}
			
	function map(context) {
      	var data = JSON.parse(context.value);
		var recId = data.id;
		var recType = data.recordtype;
        var recLoc = data.location;
		var recAPR = 102;
		try {
		var cRecord = record.load({
			type: record.Type.INVOICE,
			id: recId
		});
        var oRecLoc = Number(cRecord.getValue({fieldId: 'location'}))||0;
        if (oRecLoc != 33) {
          cRecord.setValue({
            fieldId: 'location',
            value: 33
          });
        }
		cRecord.setValue({
			fieldId: 'cseg1',
			value: Number(recAPR)
		});
		var numLines = cRecord.getLineCount({
		  sublistId: 'item'
		});
		for (var i = 0; i < numLines; i++) {
          var slLoc = Number(cRecord.getSublistValue({
            sublistId: 'item',
            fieldId: 'location',
            line: i
          }))||0;
          if (slLoc != 33) {
            cRecord.setSublistValue({
              sublistId: 'item',
              fieldId: 'location',
              value: 33,
              line: i
            });
          }
			cRecord.setSublistValue({
				sublistId: 'item',
				fieldId: 'cseg1',
				value: Number(recAPR),
				line: i
			});
		}
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
