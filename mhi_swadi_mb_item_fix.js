/**
*@NApiVersion 2.1
*@NScriptType MapReduceScript
*/

define(['N/record', 'N/search', 'N/query'],
function(record, search, query) {

function updateRecord(rec, type) {
	if (type === 'invoice') {
		var cRecord = record.load({
			type: record.Type.INVOICE,
			id: rec
		});
	}
	else if (type === 'salesorder') {
		var cRecord = record.load({
			type: record.Type.SALES_ORDER,
			id: rec
		});
	}
	else {return true;}
	var invLines = [];
	var iLine = cRecord.findSublistLineWithValue({
		sublistId: 'item',
		fieldId: 'item',
		value: 10213
	});
	if (iLine > 0) {
		invLines.push(iLine);
	}
	var iLine = cRecord.findSublistLineWithValue({
		sublistId: 'item',
		fieldId: 'item',
		value: 53235
	});
	if (iLine > 0) {
		invLines.push(iLine);
	}
	invLines.forEach(function(line) {
		var slAmt = Number(cRecord.getSublistValue({
			sublistId: 'item',
			fieldId: 'amount',
			line: line
		}));
		var slRate = Number(cRecord.getSublistValue({
			sublistId: 'item',
			fieldId: 'rate',
			line: line
		}));
		var slQty = Number(cRecord.getSublistValue({
			sublistId: 'item',
			fieldId: 'quantity',
			line: line
		}));
		cRecord.setSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            value: 63948,
            line: line
        });
        cRecord.setSublistValue({
			sublistId: 'item',
			fieldId: 'quantity',
			value: slQty,
			line: line
		});
		cRecord.setSublistValue({
			sublistId: 'item',
			fieldId: 'rate',
			value: slRate,
			line: line
		});
		cRecord.setSublistValue({
			sublistId: 'item',
			fieldId: 'amount',
			value: slAmt,
			line: line
		});
		return true;
	})
	var iRecSave = cRecord.save();
	return iRecSave;
}

function getInputData(context) {
	return search.create({
	   type: "transaction",
	   filters:
	   [
		  ["mainline","is","F"], 
		  "AND", 
		  ["type","anyof","CustInvc"], 
		  "AND", 
		  ["item","anyof","63948"], 
		  "AND", 
		  ["datecreated","on","5/15/2023 11:59 pm"]
	   ],
	   columns:
	   [
		  search.createColumn({name: "trandate", label: "Date"}),
		  search.createColumn({name: "tranid", label: "Document Number"}),
		  search.createColumn({name: "amount", label: "Amount"}),
		  search.createColumn({name: "line", label: "Line ID"}),
		  search.createColumn({name: "account", label: "Account"}),
		  search.createColumn({name: "createdfrom", label: "Created From"}),
		  search.createColumn({
			 name: "internalid",
			 join: "createdFrom",
			 label: "Internal ID"
		  })
	   ]
	});
}
			
function map(context) {
   	var data = JSON.parse(context.value);
	var recId = data.id;
	try {
		var soId = data.values["createdfrom"].value;
		var soSql = `select * from NextTransactionLink where previousdoc = ${soId} and linktype = 'OrdBill' and nextdoc != ${recId}`;
		var queryResults = query.runSuiteQL({query: soSql}).asMappedResults();
		queryResults.forEach(function(inv) {
			var recType = 'invoice';
			log.debug('Updating',recType + ' ' + inv.nextdoc);
			var recUpdate = updateRecord(inv.nextdoc, recType);
			log.debug('Updated',recType + ' ' + recUpdate);
			return true;
		});
		var recType = 'salesorder';
		log.debug('Updating',recType + ' ' + soId);
		var recUpdate = updateRecord(soId, recType);
        log.debug('Updated',recType + ' ' + recUpdate);
		log.debug('Deleting','invoice ' + recId);
		var delInvoice = record.delete({type: record.Type.INVOICE, id: recId});
		log.debug('Deleted', delInvoice);
	}
	catch(e) {
		log.error(recId, e.message);
	}
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
