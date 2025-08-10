//BALANCE SHEET SUITELET
// Timothy Sayles timothy.sayles@myersholum.com
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
				var form_FS = nlapiCreateForm('Balance Sheet');
				form_FS.addFieldGroup('custpage_save', 'Message');		
				form_FS.addField('custpage_period','text','Press CONTINUE to run report.', null, 'custpage_save').setLayoutType('startrow');
				form_FS.getField('custpage_period').setDisplayType('inline');
				form_FS.addFieldGroup('custpage_logo', 'Select as of Date (EOM)');		
				var startDate = form_FS.addField('custpage_medate','date','End Date', null, 'custpage_logo');
				startDate.setMandatory(true);
				form_FS.addSubmitButton('Continue');
				response.writePage(form_FS);
	}
	
		else {
				var glAccountTop = ['Bank','AcctRec','OthCurrAsset','FixedAsset','OthAsset'];
				var glAccountBottom = ['AcctPay','CredCard','OthCurrLiab','LongTermLiab','Equity','NonPosting','DeferRevenue','DeferExpense','UnbilledRec'];
				
				var startDate = request.getParameter('custpage_medate');
				var startDateS = nlapiStringToDate(startDate);
				nlapiLogExecution('DEBUG','Start Date Passed: ',startDate);
				var startDateS = nlapiStringToDate(startDate);
				var startMonth = startDateS.getMonth();
				if (startMonth == 1) {
					var startYear = startDateS;
				}
				else {
				var startYear = moveDate(startDateS,(1-startMonth));
				}
				var nextDate = moveDate(startDateS, 2);
				var priorDate = moveDate(startDateS, -0);
				var prior2Date = moveDate(startDateS, -1);
				var prior3Date = moveDate(startDateS, -2);
				var dat = new Array();
				dat[0] = new nlobjSearchColumn("internalid");
				dat[1] = new nlobjSearchColumn("enddate"); 
				var periodSearch = nlapiSearchRecord("accountingperiod",null,
				[
				["enddate","on",startDate], 
				"AND", 
				["isquarter","is","F"], 
				"AND", 
				["isyear","is","F"]
				], 
				dat
				);
				var period2Search = nlapiSearchRecord("accountingperiod",null,
				[
				["enddate","on",priorDate], 
				"AND", 
				["isquarter","is","F"], 
				"AND", 
				["isyear","is","F"]
				], 
				dat
				);
				var period3Search = nlapiSearchRecord("accountingperiod",null,
				[
				["enddate","on",prior2Date], 
				"AND", 
				["isquarter","is","F"], 
				"AND", 
				["isyear","is","F"]
				], 
				dat
				);
				var period4Search = nlapiSearchRecord("accountingperiod",null,
				[
				["enddate","on",prior3Date], 
				"AND", 
				["isquarter","is","F"], 
				"AND", 
				["isyear","is","F"]
				], 
				dat
				);
								
				var colNI = new Array();
			colNI[0] = new nlobjSearchColumn("formulacurrency",null,"SUM").setFormula("NVL({debitamount},0)-NVL({creditamount},0)");
			
			var niSearch = nlapiSearchRecord("transaction",null,
			[
				["account.type","anyof","Income","COGS","Expense","OthIncome","OthExpense"], 
				"AND", 
				["posting","is","T"], 
				"AND", 
				["account.internalid","noneof","@NONE@"], 
				"AND", 
				["accountingperiod.enddate","within",startYear,startDate]
				], 
				colNI
			);
			var ni1Search = nlapiSearchRecord("transaction",null,
			[
				["account.type","anyof","Income","COGS","Expense","OthIncome","OthExpense"], 
				"AND", 
				["posting","is","T"], 
				"AND", 
				["account.internalid","noneof","@NONE@"], 
				"AND", 
				["accountingperiod.enddate","within",startYear,priorDate]
				], 
				colNI
			);
			var ni2Search = nlapiSearchRecord("transaction",null,
			[
				["account.type","anyof","Income","COGS","Expense","OthIncome","OthExpense"], 
				"AND", 
				["posting","is","T"], 
				"AND", 
				["account.internalid","noneof","@NONE@"], 
				"AND", 
				["accountingperiod.enddate","within",startYear,prior2Date]
				], 
				colNI
			);
			var ni3Search = nlapiSearchRecord("transaction",null,
			[
				["account.type","anyof","Income","COGS","Expense","OthIncome","OthExpense"], 
				"AND", 
				["posting","is","T"], 
				"AND", 
				["account.internalid","noneof","@NONE@"], 
				"AND", 
				["accountingperiod.enddate","within",startYear,prior3Date]
				], 
				colNI
			);

			var netIncome = niSearch[0].getValue(colNI[0]);
			var netIncome1 = ni1Search[0].getValue(colNI[0]);
			var netIncome2 = ni2Search[0].getValue(colNI[0]);
			var netIncome3 = ni3Search[0].getValue(colNI[0]);
			
			var colre = new Array();
				colre[0] = new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("CASE WHEN {accountingperiod.internalid} <= "+ period4Search[0].getValue(dat[0]) +" THEN NVL({debitamount},0)-NVL({creditamount},0) ELSE 0 END"); 
				colre[1] = new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("CASE WHEN {accountingperiod.internalid} <= "+ period3Search[0].getValue(dat[0]) +" THEN NVL({debitamount},0)-NVL({creditamount},0) ELSE 0 END"); 
				colre[2] = new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("CASE WHEN {accountingperiod.internalid} <= "+ period2Search[0].getValue(dat[0]) +" THEN NVL({debitamount},0)-NVL({creditamount},0) ELSE 0 END");
				colre[3] = new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("CASE WHEN {accountingperiod.internalid} <= "+ periodSearch[0].getValue(dat[0]) +" THEN NVL({debitamount},0)-NVL({creditamount},0) ELSE 0 END");
				
			
			var reSearch = nlapiSearchRecord("transaction",null,
			[["accounttype","anyof","Income","COGS","Expense","OthIncome","OthExpense"],"AND",["posting","is","T"], 
			"AND",["account.internalidnumber","isnotempty",""]], colre);
						
			var retCol = new Array();
						retCol[0] = new nlobjSearchColumn("formulacurrency",null,"SUM").setFormula("NVL({debitamount},0)-NVL({creditamount},0)");
						var retSearch = nlapiSearchRecord("transaction",null,
							[
							["account.type","anyof","Income","COGS","Expense","OthIncome","OthExpense"], 
							"AND", 
							["posting","is","T"], 
							"AND", 
							["account.internalid","noneof","@NONE@"], 
							"AND", 
							["accountingperiod.enddate","onorbefore",nextDate]
							], 
							retCol
							);
							
			var col = new Array();
				col[0] = new nlobjSearchColumn("formulatext",null,"GROUP").setFormula("CASE WHEN {accounttype} IN ('Bank', 'Accounts Receivable', 'Other Asset', 'Other Current Asset', 'Fixed Asset', 'Deferred Expense', 'Accounts Payable', 'Other Current Liability', 'Deferred Revenue', 'Equity', 'Non Posting', 'Unbilled Receivable') THEN 'Balance Sheet' WHEN {accounttype} IN ('Income', 'Cost of Goods Sold', 'Expense', 'Other Income', 'Other Expense') THEN 'Income Statement' ELSE 'Balance Sheet' END");//.setSort(false);
				col[1] = new nlobjSearchColumn("formulatext",null,"GROUP").setFormula("CASE WHEN {accountingperiod.internalid} <= "+ periodSearch[0].getValue(dat[0]) +" THEN CASE WHEN {accounttype} IN ('Income', 'Cost of Goods Sold', 'Expense', 'Other Expense', 'Other Income') THEN 'None' ELSE {account.number} END ELSE {account.number} END").setSort(false);
				col[2] = new nlobjSearchColumn("account",null,"GROUP");
				col[3] = new nlobjSearchColumn("accounttype",null,"GROUP");
				col[4] = new nlobjSearchColumn("formulatext",null,"GROUP").setFormula("CASE WHEN {accountingperiod.internalid} <= "+ periodSearch[0].getValue(dat[0]) +" THEN CASE WHEN {accounttype} IN ('Income', 'Cost of Goods Sold', 'Expense', 'Other Expense', 'Other Income') THEN 'Retained Earnings' ELSE {account.name} END ELSE {account.name} END");//.setSort(false);
				col[5] = new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("CASE WHEN {accountingperiod.internalid} <= "+ period4Search[0].getValue(dat[0]) +" THEN NVL({debitamount},0)-NVL({creditamount},0) ELSE 0 END"); 
				col[6] = new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("CASE WHEN {accountingperiod.internalid} <= "+ period3Search[0].getValue(dat[0]) +" THEN NVL({debitamount},0)-NVL({creditamount},0) ELSE 0 END"); 
				col[7] = new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("CASE WHEN {accountingperiod.internalid} <= "+ period2Search[0].getValue(dat[0]) +" THEN NVL({debitamount},0)-NVL({creditamount},0) ELSE 0 END");
				col[8] = new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("CASE WHEN {accountingperiod.internalid} <= "+ periodSearch[0].getValue(dat[0]) +" THEN NVL({debitamount},0)-NVL({creditamount},0) ELSE 0 END");
				col[9] = new nlobjSearchColumn("description","account","GROUP");
				col[10] = new nlobjSearchColumn("formulanumeric",null,"SUM").setFormula("CASE WHEN TRUNC({accountingperiod.enddate}, 'Y') < '"+ periodSearch[0].getValue(dat[1]) +"' THEN NVL({debitamount},0)-NVL({creditamount},0) ELSE 0 END");
				
			//START OF FORM
				var form_SS = nlapiCreateForm('Balance Sheet With Lookback');
				form_SS.addFieldGroup('custpage_logo', 'As of ' + periodSearch[0].getValue(dat[1]));		
				form_SS.addField('custpage_image','inlinehtml',null, null, 'custpage_logo');
				var img = "<HTML><IMG SRC=https://6827316.app.netsuite.com/core/media/media.nl?id=772660&c=6827316&h=miotCP0iSFBgdSYV2z3939peMbHNqers6FrKIiyITLDghuJw></HTML>";
				form_SS.setFieldValues({custpage_image:img});
				//CREATING THE BALANCE SHEET TAB
				form_SS.addSubTab('custpage_acct_tab', 'Balance Sheet');
				var BAList = form_SS.addSubList('custpage_bank_list','list','Bank Accounts', 'custpage_acct_tab');
          				BAList.addField('custpage_class','text','Classification').setDisplaySize('20');
                        BAList.addField('custpage_type','text','Type').setDisplaySize('20');
						BAList.addField('custpage_number','text','Number').setDisplaySize('10');
                        BAList.addField('custpage_account','text','Description').setDisplaySize('40');
                        BAList.addField('custpage_acc','text','Account').setDisplaySize('10');
						BAList.addField('custpage_priortwo','currency',prior3Date);
						BAList.addField('custpage_priorone','currency',prior2Date);
                        BAList.addField('custpage_prior','currency',priorDate);
						BAList.addField('custpage_current','currency',startDate);
						BAList.addField('custpage_vamount','currency','Curr Mo Variance').setDisplaySize('10');
						BAList.addField('custpage_vpamount','percent','Curr Mo Var %').setDisplaySize('5');
						BAList.addField('custpage_r3amount','currency','Rolling 3mo Var').setDisplaySize('10');
						BAList.addField('custpage_r3pamount','percent','Rolling 3mo Var %').setDisplaySize('5');
				//BUILDING THE BALANCE SHEET
				//ASSETS
				for (var iAC = 0; iAC<glAccountTop.length; iAC++) {
				var custpage_acctName = glAccountTop[iAC];
				var custpage_accName = glAccountTop[iAC].toLowerCase();
				var custom1 = "var thisSearch=nlapiSearchRecord(\"transaction\",null,[[\"accounttype\",\"anyof\",\"" + custpage_acctName + "\"],\"AND\",[\"posting\",\"is\",\"T\"], \"AND\",[\"account.internalidnumber\",\"isnotempty\",\"\"], \"AND\",[\"account.number\",\"isnot\",\"3100\"]], col)";
				eval(custom1);
				if (custpage_accName == 'bank') {
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
				for (var iLZ=0; iLZ<thisSearch.length; iLZ++) {
	        		 	BAList.setLineItemValue('custpage_class',iLP+1,thisSearch[iLZ].getValue(col[0]));
                   		BAList.setLineItemValue('custpage_number',iLP+1,thisSearch[iLZ].getValue(col[1]));
					 	BAList.setLineItemValue('custpage_account',iLP+1,thisSearch[iLZ].getValue(col[9]));
					 	BAList.setLineItemValue('custpage_type',iLP+1,thisSearch[iLZ].getValue(col[3]));
						BAList.setLineItemValue('custpage_acc',iLP+1,thisSearch[iLZ].getValue(col[4]));
						BAList.setLineItemValue('custpage_priortwo',iLP+1,thisSearch[iLZ].getValue(col[5]));
						fTotalP3 += parseFloat(thisSearch[iLZ].getValue(col[5]));
						BAList.setLineItemValue('custpage_priorone',iLP+1,thisSearch[iLZ].getValue(col[6]));
						fTotalP2 += parseFloat(thisSearch[iLZ].getValue(col[6]));
						BAList.setLineItemValue('custpage_prior',iLP+1,thisSearch[iLZ].getValue(col[7]));
						fTotalP += parseFloat(thisSearch[iLZ].getValue(col[7]));
						BAList.setLineItemValue('custpage_current',iLP+1,thisSearch[iLZ].getValue(col[8]));
						fTotal += parseFloat(thisSearch[iLZ].getValue(col[8]));
						var r3avg = 0;
						r3avg = +((((parseFloat(thisSearch[iLZ].getValue(col[5]))+parseFloat(thisSearch[iLZ].getValue(col[6]))+parseFloat(thisSearch[iLZ].getValue(col[7])))/3)).toFixed(2));
						var r3total = 0;
						r3total = +((thisSearch[iLZ].getValue(col[8])-((parseFloat(thisSearch[iLZ].getValue(col[5]))+parseFloat(thisSearch[iLZ].getValue(col[6]))+parseFloat(thisSearch[iLZ].getValue(col[7])))/3)).toFixed(2));
						var r3at = 0;
						r3at = +(((r3total/r3avg)*100).toFixed(2));
						r3at = +r3at || 0;
						BAList.setLineItemValue('custpage_r3amount',iLP+1,r3total);
						if (r3avg != 0) {
						BAList.setLineItemValue('custpage_r3pamount',iLP+1,r3at);
						}
									var bankPer = 0;
									if (thisSearch[iLZ].getValue(col[7]) != 0) {
									bankPer = +((((thisSearch[iLZ].getValue(col[8])-thisSearch[iLZ].getValue(col[7]))/thisSearch[iLZ].getValue(col[7]))*100).toFixed(2));
									bankPer = +bankPer || 0;
									BAList.setLineItemValue('custpage_vpamount',iLP+1,bankPer+'%');
									}
									if (thisSearch[iLZ].getValue(col[7]) == 0 && thisSearch[iLZ].getValue(col[8]) != 0) {
									BAList.setLineItemValue('custpage_vpamount',iLP+1,'100%');	
									}
									var bankDif = 0;
									bankDif = +((thisSearch[iLZ].getValue(col[8])-thisSearch[iLZ].getValue(col[7])).toFixed(2));
									BAList.setLineItemValue('custpage_vamount',iLP+1,bankDif);
						var tempNumber = thisSearch[iLZ].getValue(col[1]);
						iLP = iLP+1;
						}
						BAList.setLineItemValue('custpage_notes',iLP+1,'********');
						BAList.setLineItemValue('custpage_class',iLP+1,'****************');
						BAList.setLineItemValue('custpage_account',iLP+1,'****************');
						BAList.setLineItemValue('custpage_current',iLP+1,fTotal);
						fTotalR += fTotal;
						BAList.setLineItemValue('custpage_prior',iLP+1,fTotalP);
						fTotalPR += fTotalP;
						BAList.setLineItemValue('custpage_priorone',iLP+1,fTotalP2);
						fTotalPR2 += fTotalP2;
						BAList.setLineItemValue('custpage_priortwo',iLP+1,fTotalP3);
						fTotalPR3 += fTotalP3;
						BAList.setLineItemValue('custpage_acc',iLP+1,'Total ' + thisSearch[0].getValue(col[3]));
						iLP = iLP+1;
					}
				}
			//TOTALS
			BAList.setLineItemValue('custpage_notes',iLP+1,'********');
			BAList.setLineItemValue('custpage_class',iLP+1,'****************');
			BAList.setLineItemValue('custpage_account',iLP+1,'****************');
			BAList.setLineItemValue('custpage_current',iLP+1,fTotalR);
			BAList.setLineItemValue('custpage_prior',iLP+1,fTotalPR);
			BAList.setLineItemValue('custpage_priorone',iLP+1,fTotalPR2);
			BAList.setLineItemValue('custpage_priortwo',iLP+1,fTotalPR3);
			BAList.setLineItemValue('custpage_acc',iLP+1,'Total Assets');
			var totalAsset = fTotalR;
			var totalAsset1 = fTotalPR;
			var totalAsset2 = fTotalPR2;
			var totalAsset3 = fTotalPR3;
			iLP = iLP + 1;
			//LIABILTIES AND EQUITY
			for (var iAC = 0; iAC<glAccountBottom.length; iAC++) {
				var custpage_acctName = glAccountBottom[iAC];
				var custpage_accName = glAccountBottom[iAC].toLowerCase();
				var custom1 = "var thisSearch=nlapiSearchRecord(\"transaction\",null,[[\"accounttype\",\"anyof\",\"" + custpage_acctName + "\"],\"AND\",[\"posting\",\"is\",\"T\"], \"AND\",[\"account.internalidnumber\",\"isnotempty\",\"\"], \"AND\",[\"account.number\",\"isnot\",\"3100\"]], col)";
				eval(custom1);
				if (custpage_accName == 'AcctPay') {
					var iLP = iLP + 1;
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
				for (var iLZ=0; iLZ<thisSearch.length; iLZ++) {
	        		 	BAList.setLineItemValue('custpage_class',iLP+1,thisSearch[iLZ].getValue(col[0]));
                   		BAList.setLineItemValue('custpage_number',iLP+1,thisSearch[iLZ].getValue(col[1]));
					 	BAList.setLineItemValue('custpage_account',iLP+1,thisSearch[iLZ].getValue(col[9]));
					 	BAList.setLineItemValue('custpage_type',iLP+1,thisSearch[iLZ].getValue(col[3]));
						BAList.setLineItemValue('custpage_acc',iLP+1,thisSearch[iLZ].getValue(col[4]));
						BAList.setLineItemValue('custpage_priortwo',iLP+1,thisSearch[iLZ].getValue(col[5]));
						fTotalP3 += parseFloat(thisSearch[iLZ].getValue(col[5]));
						BAList.setLineItemValue('custpage_priorone',iLP+1,thisSearch[iLZ].getValue(col[6]));
						fTotalP2 += parseFloat(thisSearch[iLZ].getValue(col[6]));
						BAList.setLineItemValue('custpage_prior',iLP+1,thisSearch[iLZ].getValue(col[7]));
						fTotalP += parseFloat(thisSearch[iLZ].getValue(col[7]));
						BAList.setLineItemValue('custpage_current',iLP+1,thisSearch[iLZ].getValue(col[8]));
						fTotal += parseFloat(thisSearch[iLZ].getValue(col[8]));
						var r3avg = 0;
						r3avg = +((((parseFloat(thisSearch[iLZ].getValue(col[5]))+parseFloat(thisSearch[iLZ].getValue(col[6]))+parseFloat(thisSearch[iLZ].getValue(col[7])))/3)).toFixed(2));
						var r3total = 0;
						r3total = +((thisSearch[iLZ].getValue(col[8])-((parseFloat(thisSearch[iLZ].getValue(col[5]))+parseFloat(thisSearch[iLZ].getValue(col[6]))+parseFloat(thisSearch[iLZ].getValue(col[7])))/3)).toFixed(2));
						var r3at = 0;
						r3at = +(((r3total/r3avg)*100).toFixed(2));
						r3at = +r3at || 0;
						BAList.setLineItemValue('custpage_r3amount',iLP+1,r3total);
						if (r3avg != 0) {
						BAList.setLineItemValue('custpage_r3pamount',iLP+1,r3at);
						}
									var bankPer = 0;
									if (thisSearch[iLZ].getValue(col[7]) != 0) {
									bankPer = +((((thisSearch[iLZ].getValue(col[8])-thisSearch[iLZ].getValue(col[7]))/thisSearch[iLZ].getValue(col[7]))*100).toFixed(2));
									bankPer = +bankPer || 0;
									BAList.setLineItemValue('custpage_vpamount',iLP+1,bankPer+'%');
									}
									if (thisSearch[iLZ].getValue(col[7]) == 0 && thisSearch[iLZ].getValue(col[8]) != 0) {
									BAList.setLineItemValue('custpage_vpamount',iLP+1,'100%');	
									}
									var bankDif = 0;
									bankDif = +((thisSearch[iLZ].getValue(col[8])-thisSearch[iLZ].getValue(col[7])).toFixed(2));
									BAList.setLineItemValue('custpage_vamount',iLP+1,bankDif);
						var tempNumber = thisSearch[iLZ].getValue(col[1]);
						iLP = iLP+1;
						}
						if (thisSearch[0].getValue(col[3]) != 'Equity') {
						BAList.setLineItemValue('custpage_notes',iLP+1,'********');
						BAList.setLineItemValue('custpage_class',iLP+1,'****************');
						BAList.setLineItemValue('custpage_account',iLP+1,'****************');
						BAList.setLineItemValue('custpage_current',iLP+1,fTotal);
						fTotalR += fTotal;
						BAList.setLineItemValue('custpage_prior',iLP+1,fTotalP);
						fTotalPR += fTotalP;
						BAList.setLineItemValue('custpage_priorone',iLP+1,fTotalP2);
						fTotalPR2 += fTotalP2;
						BAList.setLineItemValue('custpage_priortwo',iLP+1,fTotalP3);
						fTotalPR3 += fTotalP3;
						BAList.setLineItemValue('custpage_acc',iLP+1,'Total ' + thisSearch[0].getValue(col[3]));
						iLP = iLP+1;
						}
						else {
						BAList.setLineItemValue('custpage_notes',iLP+1,'********');
						BAList.setLineItemValue('custpage_class',iLP+1,'Balance Sheet');
						BAList.setLineItemValue('custpage_type',iLP+1,'Equity');
						BAList.setLineItemValue('custpage_number',iLP+1,'31100'); //CHANGE TO MATCH YOUR EQUITY GL NUMBER
						BAList.setLineItemValue('custpage_account',iLP+1,'- None -');
						BAList.setLineItemValue('custpage_current',iLP+1,retSearch[0].getValue(retCol[0]));
						BAList.setLineItemValue('custpage_prior',iLP+1,reSearch[0].getValue(colre[3]));
						BAList.setLineItemValue('custpage_priorone',iLP+1,reSearch[0].getValue(colre[2]));
						BAList.setLineItemValue('custpage_priortwo',iLP+1,reSearch[0].getValue(colre[1]));
						BAList.setLineItemValue('custpage_acc',iLP+1,'Retained Earnings');	
						var reLine = iLP+1;
						iLP = iLP+1;	
						BAList.setLineItemValue('custpage_notes',iLP+1,'********');
						BAList.setLineItemValue('custpage_class',iLP+1,'Balance Sheet');
						BAList.setLineItemValue('custpage_type',iLP+1,'Equity');
						BAList.setLineItemValue('custpage_account',iLP+1,'- None -');
						var netIncomeLn = iLP+1;
						BAList.setLineItemValue('custpage_acc',iLP+1,'Net Income');
						iLP = iLP+1;
						BAList.setLineItemValue('custpage_notes',iLP+1,'********');
						BAList.setLineItemValue('custpage_class',iLP+1,'****************');
						BAList.setLineItemValue('custpage_account',iLP+1,'****************');
						}
					}
				}
			BAList.setLineItemValue('custpage_current',netIncomeLn, netIncome);
			BAList.setLineItemValue('custpage_prior',netIncomeLn, netIncome1);
			BAList.setLineItemValue('custpage_priorone',netIncomeLn, netIncome2);
			BAList.setLineItemValue('custpage_priortwo',netIncomeLn, netIncome3);
			BAList.setLineItemValue('custpage_notes',iLP+1,'********');
			BAList.setLineItemValue('custpage_class',iLP+1,'****************');
			BAList.setLineItemValue('custpage_account',iLP+1,'****************');
			BAList.setLineItemValue('custpage_current',iLP+1,totalAsset);
			BAList.setLineItemValue('custpage_prior',iLP+1,totalAsset1);
			BAList.setLineItemValue('custpage_priorone',iLP+1,totalAsset2);
			BAList.setLineItemValue('custpage_priortwo',iLP+1,totalAsset3);
			BAList.setLineItemValue('custpage_acc',iLP+1,'Total Liabilities and Equity');	
		form_SS.addField('custpage_fs','inlinehtml',null, null, 'custpage_footer');
		var html = "<HTML><CENTER>T.S. Myers Holum, Inc.</CENTER></HTML>";
		form_SS.setFieldValues({custpage_fs:html});
		//FINALIZE THE FORM AND DISPLAY
		response.writePage(form_SS);
	}
}