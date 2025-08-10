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
		var accrualAcct = 930;
        var stEntityId = transaction.getFieldValue('entity');
        var stInvoiceID = transaction.getFieldValue('id');
        var stSubsidiaryId = transaction.getFieldValue('subsidiary');
        var stLocationId = transaction.getFieldValue('location');
		var transitInvoice = transaction.getFieldValue('custbody_mhi_transit_invoice')||'F';
		var transType = transaction.getRecordType();
		nlapiLogExecution('DEBUG','PLUGIN TRIGGER',transType);
		var lpoDiscount = 0;
		var lpoDiscAmt = 0;
		var mntLine = 0;
		var mntAmt = 0;
		for (var i = 1; i <= transaction.getLineItemCount('item'); i++) {
			var line_item = Number(transaction.getLineItemValue('item', 'item', i));
			if (line_item === 10212) {
				var lpoDiscount = i;
				var lpoDiscAmt = Number(transaction.getLineItemValue('item', 'amount', i));
				nlapiLogExecution('DEBUG','Discount found on ' + i, lpoDiscAmt);
			}
			if (line_item === 63948) {
				var mntLine = i;
				var mntAmt = Number(transaction.getLineItemValue('item', 'amount', i));
				nlapiLogExecution('DEBUG','Mount/Balance found on ' + i, mntAmt);
			}
		}
		var linecount = standardLines.getCount();
		if (linecount == 0) return; 
		var transaction_id = Number(transaction.id)||0;
		if (transitInvoice == 'T') {
			var incomeTotal = 0;
			var cogsArray = [];
			var reverseAmount = 0;
			for (var i = 0; i < linecount; i++) {
				var line =  standardLines.getLine(i);
				if ( !line.isPosting() ) continue; 
				if ( line.getId() == 0 ) continue; 
				var taxLineEntry = line.getTaxItemId()||'';
				if (!taxLineEntry) {
					var acctType = nlapiLookupField('account', line.getAccountId(), 'type');
					var acctName = nlapiLookupField('account', line.getAccountId(), 'name');
					var cogsLine = {};
					cogsLine.line = i;
					cogsLine.account = line.getAccountId()||'';
					cogsLine.name = acctName;
					cogsLine.type = acctType;
					cogsLine.classid = line.getClassId()||'';
					cogsLine.subid = line.getSubsidiaryId()||'';
					cogsLine.locationid = line.getLocationId()||'';
					cogsLine.departmentid = line.getDepartmentId()||'';
					cogsLine.amount = parseFloat(line.getDebitAmount())||0 + (parseFloat(line.getCreditAmount())||0 * parseFloat(-1));
					if (line.getAccountId() == 1957) {
						cogsLine.reverse = true;
						reverseAmount += cogsLine.amount;
					}
					else {cogsLine.reverse = false;}
					cogsArray.push(cogsLine);
				}	
			}				
			if (cogsArray && cogsArray.length > 0) {
				nlapiLogExecution('DEBUG','COGS',JSON.stringify(cogsArray));
				for (var i = 0; i < cogsArray.length; i++) {
					var lineAcct = cogsArray[i].account;
					var lineAmt = cogsArray[i].amount;
					if ((lineAcct == 235 || lineAcct == 236) && lineAmt == reverseAmount) {
						var classId = cogsArray[i].classid||'';
						var subsidiaryId = cogsArray[i].subid||'';
						var locationId = cogsArray[i].locationid||'';
						var departmentId = cogsArray[i].departmentid||'';
						if (transType == 'creditmemo') {	
							var objLineDebit = customLines.addNewLine();
							objLineDebit.setAccountId(accrualAcct);
							objLineDebit.setDebitAmount(lineAmt);
							var objLineCredit = customLines.addNewLine();
							objLineCredit.setAccountId(lineAcct);
							objLineCredit.setCreditAmount(lineAmt);
							if (classId) {
								objLine1.setClassId(classId);
								objLine2.setClassId(classId);
							}
							if (locationId) {
								objLine1.setLocationId(locationId);
								objLine2.setLocationId(locationId);
							}
							if (departmentId) {
								objLine1.setDepartmentId(departmentId);
								objLine2.setDepartmentId(departmentId);
							}
						}
						else {
							var objLineDebit = customLines.addNewLine();
							objLineDebit.setAccountId(lineAcct);
							objLineDebit.setDebitAmount(lineAmt);
							var objLineCredit = customLines.addNewLine();
							objLineCredit.setAccountId(accrualAcct);
							objLineCredit.setCreditAmount(lineAmt);
							if (classId) {
								objLine1.setClassId(classId);
								objLine2.setClassId(classId);
							}
							if (locationId) {
								objLine1.setLocationId(locationId);
								objLine2.setLocationId(locationId);
							}
							if (departmentId) {
								objLine1.setDepartmentId(departmentId);
								objLine2.setDepartmentId(departmentId);
							}
						}
					}
				}
			}
			var linecount = customLines.getCount();
			for (var i = 0; i < linecount; i++) {
				nlapiLogExecution('DEBUG','CUSTOM', JSON.stringify(customLines.getLine(i)));
			}
		}
		else {
			nlapiLogExecution('DEBUG','NON TRANSIT','STANDARD');
			var stCreditAccount = 930;         
			var stDebitAccount = 213;          
        	if (transType == 'creditmemo') {
				var stCreditAccount = 213;   
				var stDebitAccount = 930;    
			}
		    var linecount = transaction.getLineItemCount('item');
			var transaction_id = Number(transaction.id)||0;
			if (transaction_id != 0) {
				for (var i = 1; i <= transaction.getLineItemCount('item'); i++) {
					var line_item = transaction.getLineItemValue('item', 'item', i);
					var line_item_costestimate = getCostFromItemLocationConfig(line_item, stLocationId);
					var line_item_quantity = transaction.getLineItemValue('item', 'quantity', i);
					var extendedAmount = 0;
					if (line_item_costestimate) {
						extendedAmount = line_item_quantity * line_item_costestimate;
					}
					var line_item_avg_cost = transaction.getLineItemValue('item', 'averagecost', i)||0; //v1.4
					if (line_item_avg_cost > 0) {
						var cost_test = parseFloat(extendedAmount) - parseFloat(line_item_avg_cost);
						if (cost_test !=0) {
							extendedAmount = line_item_avg_cost * line_item_quantity;
						}
					}
					var line_item_dept = transaction.getLineItemValue('item', 'department', i);
					var line_item_class = transaction.getLineItemValue('item', 'class', i);
					var line_item_location = transaction.getLineItemValue('item', 'location', i);
					var line_item_segment = transaction.getLineItemValue('item','cseg1',i); 
					nlapiLogExecution('DEBUG',transaction_id, stCreditAccount + ' ' + stDebitAccount + ' ' + extendedAmount);
					if (stCreditAccount && stDebitAccount && extendedAmount > 0) {
						
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
				}
			}	
		}
		if (transitInvoice == 'T' && lpoDiscount > 0) {
			nlapiLogExecution('DEBUG','TRANSIT','LPO DISCOUNT');
			var lpoAmount = Number(transaction.getLineItemValue('item','amount', lpoDiscount));
			var glAmount = Math.abs(lpoAmount);
			var stCreditAccount = '';         
			var stDebitAccount = ''; 
			if ((lpoAmount < 0 && transType == 'invoice') || (lpoAmount > 0 && transType == 'creditmemo')) {
				var stCreditAccount = 350;         
				var stDebitAccount = 276;  
			}
			else if ((lpoAmount < 0 && transType == 'creditmemo') ||(lpoAmount > 0 && transType == 'invoice')) {
				var stCreditAccount = 276;         
				var stDebitAccount = 350;  
			}
			if (stCreditAccount && stDebitAccount) {
				var line_item_dept = transaction.getLineItemValue('item', 'department', lpoDiscount);
				var line_item_class = transaction.getLineItemValue('item', 'class', lpoDiscount);
				var line_item_location = transaction.getLineItemValue('item', 'location', lpoDiscount);
				var line_item_segment = transaction.getLineItemValue('item','cseg1', lpoDiscount);
				var objLineDebit = customLines.addNewLine();
				objLineDebit.setAccountId(stDebitAccount);
				objLineDebit.setDebitAmount(glAmount);
				var objLineCredit = customLines.addNewLine();
				objLineCredit.setAccountId(stCreditAccount);
				objLineCredit.setCreditAmount(glAmount);
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
		}
	} catch (error) {
        nlapiLogExecution('ERROR', stMethodName, 'ERROR : ' + error.message);
    }
}

function getCostFromItemLocationConfig(itemId, locationId) {
    var logtitle = 'getCostFromItemLocationConfig';
    var stdCostValue = 0;
    try {
        if (!itemId || !locationId) {
            nlapiLogExecution('audit', logtitle, ' Missing input parameters. Returning null');
        } else {
            var costColumn = new nlobjSearchColumn('cost');
            var columns = [costColumn];
            var itemLocationConfig = nlapiSearchRecord("itemlocationconfiguration",null,
                [
                ["item","anyof",itemId], 
                "AND", 
                ["location","anyof", locationId]
                ],
                columns
            );
            if (itemLocationConfig && itemLocationConfig.length > 0) {
                stdCostValue = itemLocationConfig[0].getValue('cost') || 0;
            } else {
                nlapiLogExecution('debug', logtitle, ' | no results in item location configuration all locations.');
				var costColumn = new nlobjSearchColumn('cost',null,'MIN');
				var columns = [costColumn];
				var itemLocationConfig = nlapiSearchRecord("itemlocationconfiguration",null,
					[
						["item","anyof",itemId], 
						"AND",
						["cost","ISNOTEMPTY",""] 
					],
						columns
				);
				if (itemLocationConfig && itemLocationConfig.length > 0) {
					stdCostValue = itemLocationConfig[0].getValue('cost',null,'MIN') || 0;
				}
				else {
					nlapiLogExecution('debug', logtitle, ' | no results in item location configuration all locations checking item master.');
					stdCostValue = nlapiLookupField('item', itemId, 'costestimate') || 0;
					if (stdCostValue === 0) {
						nlapiLogExecution('debug', logtitle, ' | no results in item master setting cost to zero.');
					}
				}
			}
        }
    } catch(error) {
        nlapiLogExecution('error', logtitle, ' | Error: ' + JSON.stringify(error));
    }
    return stdCostValue;
}