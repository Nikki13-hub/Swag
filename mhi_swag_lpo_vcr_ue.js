function userEvent_beforeSave(type, form, request)
{
	if(type == 'create' || type == 'edit') {
		try {
			var company = nlapiGetFieldValue('customer')||'';
			var externalId = nlapiGetFieldValue('externalid')||'';
			var poRef = nlapiGetFieldValue('pnrefnum')||'';
			var lpoImport = nlapiGetFieldValue('memo')||'';
			nlapiLogExecution('DEBUG',externalId,'Company:' + company + ' PO:' + poRef + ' LPO:' + lpoImport);
			if (poRef && lpoImport.length == 10) {
				var pmtAmt = nlapiGetFieldValue('payment');
				var pmtSub = nlapiGetFieldValue('subsidiary');
				var offEntity = nlapiLookupField('customer', company, 'custentity_mhi_swag_import_vendor')||'';
				if (offEntity) {
					var custLoc = nlapiGetFieldValue('custentity_nsps_customer_default_loc')||'';
					var vendCredit = nlapiCreateRecord('vendorcredit',{entity: offEntity});
					vendCredit.setFieldValue('tranid', externalId);
					vendCredit.setFieldValue('subsidiary', pmtSub);
					vendCredit.setFieldValue('location', custLoc);
					//vendCredit.selectNewLineItem('expense');
					vendCredit.setCurrentLineItemValue('expense', 'account', 122);
					vendCredit.setCurrentLineItemValue('expense', 'amount', pmtAmt);
					vendCredit.commitLineItem('expense');
					var vendCrId = nlapiSaveRecord(vendCredit);
				}
			}
		}
		catch(e) {nlapiLogExecution('ERROR','Script Error', e.message);}
	}
}