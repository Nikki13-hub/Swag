/**
*@NApiVersion 2.1
*@NScriptType MapReduceScript
*/

define(['N/record', 'N/runtime', 'N/search'],
function(record, runtime, search) {
	
	function getInputData(context) {
		return search.create({
		   type: "invoice",
		   filters:
		   [
			  ["subsidiary","anyof","2"], 
			  "AND", 
			  ["account.type","anyof","Income"], 
			  "AND", 
			  ["posting","is","T"], 
			  "AND", 
			  ["type","anyof","CustInvc"], 
			  "AND", 
			  ["location","anyof","13","8","33"], 
			  "AND", 
			  ["formulanumeric: CASE WHEN {cseg1} != {custbody_nsts_send_to_customer.cseg1} THEN 0 ELSE 1 END","equalto","0"]
		   ],
		   columns:
		   [
			  search.createColumn({
				 name: "trandate",
				 summary: "GROUP",
				 label: "Date"
			  }),
			  search.createColumn({
				 name: "internalid",
				 summary: "GROUP",
				 label: "Internal ID"
			  }),
			  search.createColumn({
				 name: "transactionname",
				 summary: "GROUP",
				 label: "Transaction Name"
			  }),
			  search.createColumn({
				 name: "recordtype",
				 summary: "GROUP",
				 label: "Record Type"
			  }),
			  search.createColumn({
				 name: "cseg1",
				 summary: "GROUP",
				 sort: search.Sort.ASC,
				 label: "Area of Primary Responsibility"
			  }),
			  search.createColumn({
				 name: "line.cseg1",
				 summary: "GROUP",
				 label: "Area of Primary Responsibility"
			  }),
			  search.createColumn({
				 name: "cseg1",
				 join: "CUSTBODY_NSTS_SEND_TO_CUSTOMER",
				 summary: "GROUP",
				 label: "Area of Primary Responsibility"
			  })
		   ]
		});
	}
			
	function map(context) {
      	var data = JSON.parse(context.value);
		var recId = data.values['GROUP(internalid)'].value;
		var cAPR = Number(data.values['GROUP(cseg1.CUSTBODY_NSTS_SEND_TO_CUSTOMER)'].value);
		log.debug(recId, cAPR);
			var cRecord = record.load({
				type: 'invoice',
				id: recId
			});
		try {
			var rLoc = Number(cRecord.getValue({fieldId: 'location'}));
			if (rLoc != 33 && cAPR === 102) {
				//cRecord.setValue({fieldId: 'location', value: 33});
			}
			
			cRecord.setValue({fieldId: 'cseg1', value: cAPR});
			var numLines = cRecord.getLineCount({
			  sublistId: 'item'
			});
			for (var i = 0; i < numLines; i++) {
				var cLoc = cRecord.getSublistValue({
					sublistId: 'item',
					fieldId: 'location',
					line: i
				})||'';
				if (cLoc) {
					if (cLoc != 33 && cAPR === 102) {
						//cRecord.setSublistValue({
						//	sublistId: 'item',
						//	fieldId: 'location',
						//	value: 33,
						//	line: i
						//});
					}
				cRecord.setSublistValue({
					sublistId: 'item',
					fieldId: 'cseg1',
					value: Number(cAPR),
					line: i
				});
				}
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
