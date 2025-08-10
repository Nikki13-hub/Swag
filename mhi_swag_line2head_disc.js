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
		var aSql = `select t.id, t.type,
		t.trandate, t.tranid, tl.item, tl.linesequencenumber, tl.linesequencenumber-1 line, ntl.nextdoc from transactionline tl
		join transaction t on t.id = tl.transaction  
		join NextTransactionLink ntl on ntl.previousdoc = t.id and ntl.linktype = 'OrdBill' 
		where tl.item = 10212 and t.type in ('SalesOrd') and t.trandate >= TO_DATE( BUILTIN.RELATIVE_RANGES( 'TM', 'START' ), 'mm/dd/yyyy' ) and t.trandate <= TO_DATE( BUILTIN.RELATIVE_RANGES( 'TM', 'END' ), 'mm/dd/yyyy' )
		order by t.trandate`;
      	var results = selectAllRows(aSql);
		log.debug('Execute', results.length + ' record updates.')
		return results;
	}
			
	function map(context) {
		try {
			var data = JSON.parse(context.value);
			var recId = data.id;
			log.debug(data.tranid, data.id);
			var recType = data.type;
			var recTypeL = recType.toLowerCase();
			var cRecord = record.load({
				type: 'salesorder',
				id: recId
			});
		}
		catch(d) {log.debug('Load Error', d.message);}
		try {
		var discLine = cRecord.findSublistLineWithValue({
			sublistId: 'item',
			fieldId: 'item',
			value: data.item
		})||0;
		log.debug('Discount Line ' + data.line, discLine);
		if (discLine > 0) {
			var discAmount = cRecord.getSublistValue({
				sublistId: 'item',
				fieldId: 'amount',
				line: data.line
			});
			cRecord.setSublistValue({
				sublistId: 'item',
				fieldId: 'rate',
				line: discLine,
				value: 0
			});
			cRecord.setSublistValue({
				sublistId: 'item',
				fieldId: 'amount',
				line: discLine,
				value: 0
			});
			//cRecord.removeLine({
			//	sublistId: 'item',
			//	line: data.line
			//});
			cRecord.setValue({fieldId: 'discountitem', value: data.item});
			cRecord.setValue({fieldId: 'discountrate', value: Number(discAmount)});
			var cRecSave = cRecord.save();
			log.debug('updated ' + recType, cRecSave);
			var invRec = data.nextdoc||0;
			if (invRec > 0) {
				var iRecord = record.load({
					type: 'invoice',
					id: invRec
				});
				var iDiscLine = iRecord.findSublistLineWithValue({
					sublistId: 'item',
					fieldId: 'item',
					value: data.item
				})||0;
				if (iDiscLine > 0) {
					var iDiscAmount = iRecord.getSublistValue({
						sublistId: 'item',
						fieldId: 'amount',
						line: data.line
					});
					iRecord.setSublistValue({
						sublistId: 'item',
						fieldId: 'rate',
						line: iDiscLine,
						value: 0
					});
					iRecord.setSublistValue({
						sublistId: 'item',
						fieldId: 'amount',
						line: iDiscLine,
						value: 0
					});
					//iRecord.removeLine({
					//	sublistId: 'item',
					//	line: data.line
					//});
					iRecord.setValue({fieldId: 'discountitem', value: data.item});
					iRecord.setValue({fieldId: 'discountrate', value: Number(iDiscAmount)});
					var iRecSave = iRecord.save();
					log.debug('updated invoice', iRecSave);
				}
			}
		}
	} catch(e) {log.debug('Error', e.message);}
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
