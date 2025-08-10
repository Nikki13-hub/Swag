/**
*@NApiVersion 2.1
*@NScriptType MapReduceScript
*/

define(['N/record', 'N/runtime', 'N/search'],
function(record, runtime, search) {
	
	function getInputData(context) {
/*
		return search.create({
   type: "invoice",
   filters:
   [
      ["type","anyof","CustInvc"], 
      "AND", 
      ["mainline","is","T"], 
      "AND", 
      ["trandate","within","thisyear"], 
      "AND", 
      ["subsidiary","anyof","2"], 
      "AND", 
      ["cseg1","anyof","@NONE@"], 
      "AND", 
      ["customer.cseg1","noneof","@NONE@"]
   ],
   columns:
   [
      search.createColumn({
         name: "trandate",
         sort: search.Sort.ASC,
         label: "Date"
      }),
      search.createColumn({name: "internalid", label: "Internal ID"}),
      search.createColumn({name: "tranid", label: "Document Number"}),
      search.createColumn({name: "transactionname", label: "Transaction Name"}),
      search.createColumn({
         name: "altname",
         join: "customer",
         label: "Name"
      }),
      search.createColumn({
         name: "cseg1",
         join: "customer",
         label: "Area of Primary Responsibility"
      })
   ]
});
*/
	}
			
	function map(context) {
/*
				var data = JSON.parse(context.value);
		var recId = data.values['internalid'].value;
		var cAPR = Number(data.values['cseg1.customer'].value);
			var cRecord = record.load({
				type: 'invoice',
				id: recId
			});
		try {
			cRecord.setValue({fieldId: 'cseg1', value: cAPR});
			var recSave = cRecord.save();
		}
		catch(e) {
			log.debug(recId, e.message);
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
