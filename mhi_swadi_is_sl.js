//suitelet
function removeNonNumeric(str){
 return (str || '').replace(/\D/g, '').replace(/\D/g, '');
}
function roundDown(number, decimals) {
    decimals = decimals || 0;
    return ( Math.floor( number * Math.pow(10, decimals) ) / Math.pow(10, decimals) );
}
function moveDate(dates, months) {
	var tempDate = new Date(dates.getFullYear(), dates.getMonth() + months, 0);
	return ( nlapiDateToString(tempDate) );
}
function mainApp(request, response){
	var context = nlapiGetContext();
	
	if (request.getMethod() == 'GET') {
				if (!request.getParameter('DATE')) {
                var form_FS = nlapiCreateForm('Income Statement');
				form_FS.addFieldGroup('custpage_logo', 'Select as of Date (EOM)');	
				form_FS.addField('custpage_begindate','date','Begin Date', null, 'custpage_logo');				
				form_FS.addField('custpage_startdate','date','End Date', null, 'custpage_logo');
				form_FS.addSubmitButton('Run');
				response.writePage(form_FS);
				}
				else {
				var form_FS = nlapiCreateForm('Income Statement');
				var startDate = request.getParameter('DATE');
				form_FS.addFieldGroup('custpage_save', 'Message');		
				form_FS.addField('custpage_period','text','Press CONTINUE to return to report.', null, 'custpage_save').setLayoutType('startrow');
				form_FS.getField('custpage_period').setDisplayType('inline');
				form_FS.addFieldGroup('custpage_logo', 'Select as of Date (EOM)');	
				form_FS.addField('custpage_begindate','date','Begin Date', null, 'custpage_logo').setDefaultValue(beginDate);
				form_FS.getField('custpage_begindate').setDisplayType('hidden');
				form_FS.addField('custpage_startdate','date','End Date', null, 'custpage_logo').setDefaultValue(startDate);
				form_FS.getField('custpage_startdate').setDisplayType('hidden');
				form_FS.addSubmitButton('Continue');
				response.writePage(form_FS);
				}
	}
	
		else {
				//GET MONTH AND PRIOR MONTH DATES
				
				if (!request.getParameter('DATE')) {
				var beginDate = request.getParameter('custpage_begindate');
				var startDate = request.getParameter('custpage_startdate');
				}
				else {
				var beginDate = request.getParameter('BDATE');
				var startDate = request.getParameter('SDATE');
				}
				var dat = new Array();
				dat[0] = new nlobjSearchColumn("internalid");
				dat[1] = new nlobjSearchColumn("enddate"); 
				nlapiLogExecution('debug','Dates',beginDate + ' ' + startDate);		
				var periodSearch = startDate + ' 12:00 am';
				var period2Search = beginDate + ' 11:59 pm';
				
				//SELECT APR'S FROM TABLE
				var customrecord_cseg1Search = nlapiSearchRecord("customrecord_cseg1",null,
					[
					], 
					[
						new nlobjSearchColumn("internalid"), 
						new nlobjSearchColumn("name").setSort(false)
					]
				);
				//SEARCHES - FOR LOOP THROUGH ALL THE BALANCE SHEET ACCOUNT GROUPS 
				var glAccountTop = ['Income','COGS','Expense','OthIncome','OthExpense'];
				var colIndex = 0;
				var col = new Array();
				col[colIndex] = new nlobjSearchColumn("formulatext",null,"GROUP").setFormula("'Income Statement'");//.setSort(false);
				colIndex++;
				col[colIndex] = new nlobjSearchColumn("formulatext",null,"GROUP").setFormula("CASE WHEN {accounttype} IN ('Income', 'Cost of Goods Sold', 'Expense', 'Other Expense', 'Other Income') THEN {account.number} ELSE {account.number} END").setSort(false);
				colIndex++;
				col[colIndex] = new nlobjSearchColumn("account",null,"GROUP");
				colIndex++;
				col[colIndex] = new nlobjSearchColumn("accounttype",null,"GROUP");
				colIndex++;
				col[colIndex] = new nlobjSearchColumn("formulatext",null,"GROUP").setFormula("CASE WHEN {accounttype} IN ('Income', 'Cost of Goods Sold', 'Expense', 'Other Expense', 'Other Income') THEN {account.name} ELSE {account.name} END");
				colIndex++;
				col[colIndex] = new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("CASE WHEN {cseg1} IS NULL THEN NVL({debitamount},0)-NVL({creditamount},0) ELSE 0 END"); 
				colIndex++;
				col[colIndex] = new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("NVL({debitamount},0)-NVL({creditamount},0)");
				colIndex++;
				for (var a = 0; a < customrecord_cseg1Search.length; a++) {
				col[colIndex] = new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("CASE WHEN {cseg1} = '"+ customrecord_cseg1Search[a].getValue('id') +"' THEN NVL({debitamount},0)-NVL({creditamount},0) ELSE 0 END"); 
				colIndex++;
				}
				
				//START OF FORM
				var form_SS = nlapiCreateForm('Financial Statements');
								
				form_SS.addFieldGroup('custpage_logo', 'For transactions between ' + beginDate + ' and ' + startDate);		
				
				form_SS.addField('custpage_image','inlinehtml',null, null, 'custpage_logo');
				var img = "<HTML><BR><BR><font size=\"6\"><STRONG>Southwest ADI</STROING></font><BR><BR></HTML>"; 
				form_SS.setFieldValues({custpage_image:img});
				
				//CREATING THE BALANCE SHEET TAB
				form_SS.addSubTab('custpage_acct_tab', 'Income Statement');
				var BAList = form_SS.addSubList('custpage_bank_list','list','Bank Accounts', 'custpage_acct_tab');
          				BAList.addField('custpage_class','text','Classification').setDisplaySize('20');
                        BAList.addField('custpage_type','text','Type').setDisplaySize('20');
						BAList.addField('custpage_number','text','Number').setDisplaySize('10');
                        BAList.addField('custpage_acc','text','Account').setDisplaySize('10');
						BAList.addField('custpage_unassigned', 'currency', 'Unassigned');
						for (var a = 0; a < customrecord_cseg1Search.length; a++) {
							var colname = 'custpage_apr_' + a;
							BAList.addField(colname, 'currency', customrecord_cseg1Search[a].getValue('name'));
						};
						BAList.addField('custpage_current','currency','Ending ' + startDate);
						
				
				//CREATING THE INCOME STATEMENT TAB
				form_SS.addSubTab('custpage_is_tab', 'Income Statement');
				
				//BUILDING THE BALANCE SHEET
				
				//ASSETS
				for (var iAC = 0; iAC<glAccountTop.length; iAC++) {
				var custpage_acctName = glAccountTop[iAC];
				var custpage_accName = glAccountTop[iAC].toLowerCase();
				var custom1 = "var thisSearch=nlapiSearchRecord(\"transaction\",null,[[\"datecreated\",\"within\",\""+ period2Search +"\",\""+ periodSearch +"\"],\"AND\",[\"accounttype\",\"anyof\",\"" + custpage_acctName + "\"],\"AND\",[\"posting\",\"is\",\"T\"], \"AND\",[\"account.internalidnumber\",\"isnotempty\",\"\"], \"AND\",[\"account.number\",\"isnot\",\"3100\"]], col)";
				eval(custom1);
				if (custpage_accName == 'income') {
					var iLP = 0;
					var fTotalR = 0;
					var fTotalPR = 0;
					var fTotalPR2 = 0;
					var fTotalPR3 = 0;
				}
				
				if (thisSearch != null && thisSearch.length > 0) {	
				var fTotal = 0;
				var fTotalP = 0;
				var fTotalP2 = 0;
				var fTotalP3 = 0;	
				nlapiLogExecution('debug','Results',JSON.stringify(thisSearch));
				for (var iLZ=0; iLZ<thisSearch.length; iLZ++) {
	        		 	BAList.setLineItemValue('custpage_class',iLP+1,thisSearch[iLZ].getValue(col[0]));
						BAList.setLineItemValue('custpage_account',iLP+1,thisSearch[iLZ].getValue(col[2]));
                   		BAList.setLineItemValue('custpage_number',iLP+1,thisSearch[iLZ].getValue(col[1]));
						BAList.setLineItemValue('custpage_type',iLP+1,thisSearch[iLZ].getValue(col[3]));
					 	BAList.setLineItemValue('custpage_acc',iLP+1,thisSearch[iLZ].getValue(col[4]));
						BAList.setLineItemValue('custpage_unassigned',iLP+1,thisSearch[iLZ].getValue(col[5]));
						BAList.setLineItemValue('custpage_current',iLP+1,thisSearch[iLZ].getValue(col[6]));
						var colIndex = 7;
						for (var a = 0; a < customrecord_cseg1Search.length; a++) {
							var colname = 'custpage_apr_' + a;
							BAList.setLineItemValue(colname,iLP+1,thisSearch[iLZ].getValue(col[colIndex]));
							colIndex++;
						}
						/*
						BAList.setLineItemValue('custpage_notes',iLP+1,'********');
						BAList.setLineItemValue('custpage_class',iLP+1,'****************');
						BAList.setLineItemValue('custpage_account',iLP+1,'****************');
						BAList.setLineItemValue('custpage_current',iLP+1,fTotal);
						fTotalR += fTotal;
						BAList.setLineItemValue('custpage_acc',iLP+1,'Total ' + thisSearch[0].getValue(col[3]));
						iLP++;
						*/
						iLP++;
					}
				}
				}
		
			//TOTALS
			/*
			BAList.setLineItemValue('custpage_notes',iLP+1,'********');
			BAList.setLineItemValue('custpage_class',iLP+1,'****************');
			BAList.setLineItemValue('custpage_account',iLP+1,'****************');
			BAList.setLineItemValue('custpage_current',iLP+1,Math.abs(fTotalR));
			BAList.setLineItemValue('custpage_acc',iLP+1,'Net Income');
			var totalAsset = fTotalR;
			var totalAsset1 = fTotalPR;
			var totalAsset2 = fTotalPR2;
			var totalAsset3 = fTotalPR3;
			iLP++;
	*/
	
			
			//TOTALS
			
		//FINALIZE THE FORM AND DISPLAY
		response.writePage(form_SS);

	}
}