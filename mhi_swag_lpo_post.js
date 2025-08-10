function postPayment(request,response) {
	if (request.getMethod() == 'GET') {
		var poRef = request.getParameter('poref')||'';
		var amtIn = request.getParameter('amt')||0;
		nlapiLogExecution('DEBUG',poRef,amtIn);
		var pmtAmt = parseFloat(amtIn);
		var record = null;
		var err = new Object();
		var rectype = "creditmemo";
		var paymentapplied = 0;
		try {
			var records = nlapiSearchRecord("invoice",null,
				[
				   ["type","anyof","CustInvc"], 
				   "AND", 
				   ["mainline","is","T"], 
				   "AND", 
				   ["otherrefnum","equalto",poRef]
				], 
				[
				   new nlobjSearchColumn("trandate"), 
				   new nlobjSearchColumn("internalid"), 
				   new nlobjSearchColumn("entity"), 
				   new nlobjSearchColumn("amount"), 
				   new nlobjSearchColumn("amountpaid"), 
				   new nlobjSearchColumn("amountremaining"), 
				   new nlobjSearchColumn("amountremainingisabovezero")
				]
			);
			if (!records){
				nlapiLogExecution('DEBUG', 'No Records Found');
				response.write('no records found');
			};
			var invoiceID = records[0].getId();
			var entity = records[0].getValue("entity");
			var creditmemo = nlapiTransformRecord('invoice', records[0].getId(), 'creditmemo');
			creditmemo.setFieldValue('trandate', nlapiDateToString(new Date()));
			creditmemo.setFieldValue('customer', entity);
			var cmTotal = parseFloat(creditmemo.getFieldValue('total'));
			nlapiLogExecution('debug',cmTotal,pmtAmt);
			if (cmTotal === pmtAmt) {
				paymentapplied = 1;
				var cmID = nlapiSubmitRecord(creditmemo);
				response.write(cmID);
			}
			if (paymentapplied == 0) {
				response.write('No Payment made.  Is the Invoice already Paid?');
			}
			} 
		catch(err){
			var message = (!!err.message)?err.message:"An unexpected error ocurred";
			response.write(message);
		}
	}
	else {response.write('Nothing to do');}
}