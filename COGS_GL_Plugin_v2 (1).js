function isEmpty(value) {
    if (value === null) {
        return true;
    } else if (value === undefined) {
        return true;
    } else if (value === '') {
        return true;
    } else if (value === ' ') {
        return true;
    } else if (value === 'null') {
        return true;
    } else {
        return false;
    }
}

function customizeGlImpact(transaction, standardLines, customLines, book) {
    var stMethodName = 'customizeGLImpact';
    try {
        nlapiLogExecution('DEBUG', stMethodName, ' Start');
        var stEntityId = transaction.getFieldValue('entity');
        var stInvoiceID = transaction.getFieldValue('id');
        var stSubsidiaryId = transaction.getFieldValue('subsidiary');
        var stLocationId = transaction.getFieldValue('location');
		nlapiLogExecution('DEBUG', stMethodName, 'Entity : ' + stEntityId + ' Contract : ' + stInvoiceID + ' Subsidiary : ' + stSubsidiaryId);
        var transType = transaction.getRecordType();
		if (transType == 'creditmemo') {
			if (lpoImport == 'T') {
				var stCreditAccount = 235; // "Revenue"
				var stDebitAccount = 276;  // "Inventory"
			}
			else {
        // NB - these account numbers need to be updated for each account this script is installed into!
				var stCreditAccount = 930;         // "Cost of sales accrual"
				var stDebitAccount = 930;          // "Cost of Goods Sold"
			}
        }

        var linecount = standardLines.getCount();
		if (linecount == 0) return;  // no work to complete
		var transaction_id = Number(transaction.id)||0;
		if (transaction_id != 0) {
        nlapiLogExecution('DEBUG', stMethodName, 'linecount : ' + linecount);
        for (var i = 1; i <= linecount; i++) {
			var line =  standardLines.getLine(i);
			if ( !line.isPosting() ) continue; // not a posting item
			if ( line.getId() == 0 ) continue; // summary lines; ignore
			nlapiLogExecution('DEBUG', i, JSON.stringify(line));
			/*
            var line_item = transaction.getLineItemValue('item', 'item', i);
            var line_item_name = transaction.getLineItemText('item', 'item', i);
			if (line_item_name.includes('NON-INV') {
				var line_amount = 
			var line_item_dept = transaction.getLineItemValue('item', 'department', i);
            var line_item_class = transaction.getLineItemValue('item', 'class', i);
            var line_item_location = transaction.getLineItemValue('item', 'location', i);
			var line_item_segment = transaction.getLineItemValue('item','cseg1',i); // v1.4 
            if (stCreditAccount && stDebitAccount) {
                var objLineDebit = customLines.addNewLine();
                objLineDebit.setAccountId(stDebitAccount);
                objLineDebit.setDebitAmount(extendedAmount);

                var objLineCredit = customLines.addNewLine();
                objLineCredit.setAccountId(stCreditAccount);
                objLineCredit.setCreditAmount(extendedAmount);

                if (isEmpty(line_item_dept) == false) {
                    objLineDebit.setDepartmentId(parseInt(line_item_dept));
                    objLineCredit.setDepartmentId(parseInt(line_item_dept));
                }
				if (isEmpty(line_item_segment) == false) {
					objLineCredit.setSegmentValueId('cseg1', parseInt(line_item_segment));
					objLineDebit.setSegmentValueId('cseg1', parseInt(line_item_segment));
				}
				
                if (isEmpty(line_item_class) == false) {
                    objLineCredit.setClassId(parseInt(line_item_class));
                    objLineDebit.setClassId(parseInt(line_item_class));
                }

                if (isEmpty(line_item_location) == false) {
                    objLineDebit.setLocationId(parseInt(line_item_location));
                    objLineCredit.setLocationId(parseInt(line_item_location));
                }
            }
			*/
        }
		}
	} catch (error) {
        nlapiLogExecution('ERROR', stMethodName, 'ERROR : ' + error.message);
    }
    nlapiLogExecution('DEBUG', stMethodName, 'End');
}