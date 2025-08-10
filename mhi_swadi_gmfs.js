/**
 *@NApiVersion 2.1
 *@NModuleScope Public
 *@NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/redirect', 'N/file', 'N/https', 'N/query', 'N/encode', 'N/crypto/certificate', 'N/search', 'N/util'],
    function(serverWidget, redirect, file, https, query, encode, cert, search, util) {
		
		function onRequest(context) {
            if (context.request.method === 'GET') {
				try {
				var form = serverWidget.createForm({
                    title : 'Google Sheet Financial Statement Export'
                });
				form.clientScriptModulePath = 'SuiteScripts/gmfsFormBehavior.js';
				var messages = context.request.parameters.custparam_message||'';
				var fieldgroup1 = form.addFieldGroup({
					id : 'fieldgroupid1',
					label : 'Links'
				});
				var glink = '\'https://docs.google.com/spreadsheets/d/1EeW8NQQGlbQlgMF1mJvoC81ASqR6OCTT_oq4BUg5-04/edit?usp=sharing\', \'_blank\'';
				var messageText = '<BR><button title="Google Sheet" onclick=" window.open('+glink+'); return false;">Open Google Sheet</button>';
				form.addField({
                    id : 'custpage_startmessages',
                    type : serverWidget.FieldType.INLINEHTML,
                    label : 'Messages',
                    align : serverWidget.LayoutJustification.RIGHT,
					container: 'fieldgroupid1'
                }).defaultValue = messageText;
				var fieldgroup2 = form.addFieldGroup({
					id : 'fieldgroupid2',
					label : 'Report Date Selection'
				});
				var startdate = form.addField({
                    id : 'custpage_startdate',
                    type : serverWidget.FieldType.DATE,
                    label : 'START DATE',
					container: 'fieldgroupid2',
                    align : serverWidget.LayoutJustification.RIGHT
                });
                var enddate = form.addField({
                    id : 'custpage_enddate',
                    type : serverWidget.FieldType.DATE,
                    label : 'END DATE',
					container: 'fieldgroupid2',
                    align : serverWidget.LayoutJustification.RIGHT
                });
				var fieldgroup3 = form.addFieldGroup({
					id : 'fieldgroupid3',
					label: 'Subsidiary Selection'
				});
				form.addField({
					id : 'custpage_locations',
					type : serverWidget.FieldType.SELECT,
					label: 'SUBIDIARY',
					container : 'fieldgroupid3',
					//source : 'subsidiary',
					align : serverWidget.LayoutJustification.RIGHT
				});
				form.addSubmitButton({
					label : 'Submit'
				});
				context.response.writePage(form);
				}
				catch(e) {log.debug('Error','Error',e.message);}
			}
			else {
				log.debug('GMFS', 'Start');
				var marray = ["January","February","March","April","May","June","July","August","September","October","November","December"];
				var reportLocations = Number(context.request.parameters.custpage_locations);
				var sqlArray = [];
				var searchArray = [];
				if (reportLocations == '0') {
					var sql = `select id, fullname from subsidiary where parent is not null and iselimination = 'F' order by id`;
					var subs = query.runSuiteQL({query: sql}).asMappedResults();
					var runArray = [];
					subs.forEach(function(s) {
						let a = s.id;
						sqlArray.push(Number(s.id));
						searchArray.push(a.toString());
						return true;
					});
				}
				else {
					sqlArray.push(reportLocations);
					searchArray.push(reportLocations.toString());
				}
				var searchLocations = searchArray.join(',');
				var sqlLocations = '(' + sqlArray.join(',') + ')';
				var startDate = context.request.parameters.custpage_startdate;
				var endDate = context.request.parameters.custpage_enddate;
				var startDateNS = new Date(startDate);
				var endDateNS = new Date(endDate);
				var startMo = marray[startDateNS.getMonth()];
				var startDay = startDateNS.getDate();
				var startYear = startDateNS.getFullYear();
				var endMo = marray[endDateNS.getMonth()];
				var endDay = endDateNS.getDate();
				var endYear = endDateNS.getFullYear();
				var sSql = `select id, parent from accountingperiod where parent is not null and isquarter = 'F' and isposting = 'T' and isadjust = 'F' and isyear = 'F' and startdate = '${startDate}'`;
				var sPeriod = query.runSuiteQL({query: sSql}).asMappedResults(); 
				var eSql = `select id from accountingperiod where parent is not null and isquarter = 'F' and isposting = 'T' and isadjust = 'F' and isyear = 'F' and enddate = '${endDate}'`;
				var ePeriod = query.runSuiteQL({query: eSql}).asMappedResults(); 
				if ((ePeriod && ePeriod.length > 0) && (sPeriod && sPeriod.length > 0)) {
				var sPer = Number(sPeriod[0].id);
				var soPer = Number(sPeriod[0].parent);
				var ePer = Number(ePeriod[0].id);
				var nPer = ePer - sPer;
				var niLines = [];
				//if (sPer === ePer) {
					log.debug('Run', 'Net Income');
					var epSql = `select MAX(id) id from accountingperiod where parent = ${soPer} and id <= ${ePer}`;
					var epPeriod = query.runSuiteQL({query: epSql}).asMappedResults();
					var epPer = Number(epPeriod[0].id);
					var niSql = `SELECT GMFSDate, SUM(NetIncome) NetIncome FROM (
					SELECT 
					to_number(to_char(AccountingPeriod.StartDate, 'mm') + 52) GMFSDate,
					SUM( COALESCE( TransactionAccountingLine.Credit, 0 ) - COALESCE( TransactionAccountingLine.Debit, 0 ) ) AS NetIncome
					FROM 
					Transaction	
					INNER JOIN TransactionAccountingLine ON ( TransactionAccountingLine.Transaction = Transaction.ID )
					INNER JOIN Account ON ( Account.ID = TransactionAccountingLine.Account )
					INNER JOIN AccountingPeriod ON ( AccountingPeriod.ID = Transaction.PostingPeriod )	
					INNER JOIN (SELECT Transaction, MAX(Subsidiary) Subsidiary FROM TransactionLine GROUP BY Transaction) TL ON TL.Transaction = TransactionAccountingLine.Transaction
					WHERE
					( Transaction.PostingPeriod BETWEEN ${soPer} AND ${epPer} ) 
					AND ( Transaction.Posting = 'T' )
					AND ( Account.AcctType IN ( 'Income', 'COGS', 'Expense', 'OthIncome' ) )
					AND (TL.Subsidiary in ${sqlLocations} )
					GROUP BY to_char(AccountingPeriod.StartDate, 'mm')  
					UNION
					SELECT GMFSDate, NetIncome FROM (
					SELECT 53 as GMFSDate, 0 as NetIncome
					UNION
					SELECT 54 as GMFSDate, 0 as NetIncome
					UNION
					SELECT 55 as GMFSDate, 0 as NetIncome
					UNION
					SELECT 56 as GMFSDate, 0 as NetIncome
					UNION
					SELECT 57 as GMFSDate, 0 as NetIncome
					UNION
					SELECT 58 as GMFSDate, 0 as NetIncome
					UNION
					SELECT 59 as GMFSDate, 0 as NetIncome
					UNION
					SELECT 60 as GMFSDate, 0 as NetIncome
					UNION
					SELECT 61 as GMFSDate, 0 as NetIncome
					UNION
					SELECT 62 as GMFSDate, 0 as NetIncome
					UNION
					SELECT 63 as GMFSDate, 0 as NetIncome
					UNION
					SELECT 64 as GMFSDate, 0 as NetIncome
					)) GROUP BY GMFSDate ORDER BY GMFSDate`;
					var pgOneNI = query.runSuiteQL({query: niSql}).asMappedResults(); 
					pgOneNI.forEach(function(result) {
						let valueItem = [];
						valueItem.push(result.netincome);
						niLines.push(valueItem);
						return true;
					});
				//}
				var ySql = `select a3.id, a3.startdate from accountingperiod a1
					right join accountingperiod a2 on a2.id = a1.parent
					right join accountingperiod a3 on a3.id = a2.parent
					where a1.id = ${ePer}`;
				var yPeriod = query.runSuiteQL({query: ySql}).asMappedResults();	
				var yPer = Number(yPeriod[0].id);
				var bsSearch = search.create({
				   type: "transaction",
				   filters:
				   [
					  ["accountingperiod.internalidnumber","lessthanorequalto",ePer], 
					  "AND", 
					  ["posting","is","T"], 
					  "AND", 
					  ["subsidiary","anyof",searchLocations]
				   ],
				   columns:
				   [
					  search.createColumn({
						 name: "formulatext",
						 summary: "GROUP",
						 formula: "REGEXP_REPLACE({account.number},'[^0-9]+','')",
						 label: "Formula (Text)"
					  }),
					  search.createColumn({
						 name: "accounttype",
						 summary: "GROUP",
						 label: "Account Type"
					  }),
					  search.createColumn({
						 name: "account",
						 summary: "GROUP",
						 label: "Account"
					  }),
					  search.createColumn({
						 name: "amount",
						 summary: "SUM",
						 label: "Amount"
					  }),
					  search.createColumn({
						 name: "number",
						 join: "account",
						 summary: "GROUP",
						 label: "Number"
					  })
				   ]
				});
				var bsLines = [];
				bsSearch.run().each(function(result){
						let valueItem = [];
						valueItem.push(result.getValue(bsSearch.columns[0]));
						valueItem.push(result.getValue(bsSearch.columns[1]));
						valueItem.push(result.getText(bsSearch.columns[2]));
						valueItem.push(Number(result.getValue(bsSearch.columns[3])));
						valueItem.push(result.getValue(bsSearch.columns[4]));
						bsLines.push(valueItem);
				   return true;
				});
				log.debug('Run', 'Balance Sheet');
				var isSearch = search.create({
				   type: "transaction",
				   filters:
				   [
					  ["accountingperiod.internalidnumber","between",sPer,ePer],
					  "AND", 
					  ["posting","is","T"], 
					  "AND", 
					  ["subsidiary","anyof",searchLocations]
				   ],
				   columns:
				   [
					  search.createColumn({
						 name: "formulatext",
						 summary: "GROUP",
						 formula: "REGEXP_REPLACE({account.number},'[^0-9]+','')",
						 label: "Formula (Text)"
					  }),
					  search.createColumn({
						 name: "accounttype",
						 summary: "GROUP",
						 label: "Account Type"
					  }),
					  search.createColumn({
						 name: "account",
						 summary: "GROUP",
						 label: "Account"
					  }),
					  search.createColumn({
						 name: "amount",
						 summary: "SUM",
						 label: "Amount"
					  }),
					  search.createColumn({
						 name: "number",
						 join: "account",
						 summary: "GROUP",
						 label: "Number"
					  })
				   ]
				});
				var isLines = [];
				isSearch.run().each(function(result){
						let valueItem = [];
						valueItem.push(result.getValue(isSearch.columns[0]));
						valueItem.push(result.getValue(isSearch.columns[1]));
						valueItem.push(result.getText(isSearch.columns[2]));
						valueItem.push(Number(result.getValue(isSearch.columns[3])));
						valueItem.push(result.getValue(isSearch.columns[4]));
						isLines.push(valueItem);
				   return true;
				});
				log.debug('Run', 'YTD Income Statement');
				var ismSearch = search.create({
				   type: "transaction",
				   filters:
				   [
					  ["accountingperiod.internalidnumber","equalto",ePer],
					  "AND", 
					  ["posting","is","T"], 
					  "AND", 
					  ["subsidiary","anyof",searchLocations]
				   ],
				   columns:
				   [
					  search.createColumn({
						 name: "formulatext",
						 summary: "GROUP",
						 formula: "REGEXP_REPLACE({account.number},'[^0-9]+','')",
						 label: "Formula (Text)"
					  }),
					  search.createColumn({
						 name: "accounttype",
						 summary: "GROUP",
						 label: "Account Type"
					  }),
					  search.createColumn({
						 name: "account",
						 summary: "GROUP",
						 label: "Account"
					  }),
					  search.createColumn({
						 name: "amount",
						 summary: "SUM",
						 label: "Amount"
					  }),
					  search.createColumn({
						 name: "number",
						 join: "account",
						 summary: "GROUP",
						 label: "Number"
					  })
				   ]
				});
				var ismLines = [];
				ismSearch.run().each(function(result){
						let valueItem = [];
						valueItem.push(result.getValue(ismSearch.columns[0]));
						valueItem.push(result.getValue(ismSearch.columns[1]));
						valueItem.push(result.getText(ismSearch.columns[2]));
						valueItem.push(Number(result.getValue(ismSearch.columns[3])));
						valueItem.push(result.getValue(ismSearch.columns[4]));
						ismLines.push(valueItem);
				   return true;
				});
				log.debug('Run', 'MTD Income Statement');
				
				var arSql = `SELECT  AccountSubsidiaryMap.subsidiary AS subsidiary,
					SUM( CASE WHEN ( TRUNC( TO_DATE('${endDate}','MM/DD/YYYY') ) - TO_DATE(TO_CHAR(Transaction.TranDate)) ) < 1 
					THEN COALESCE( TransactionAccountingLine.AmountUnpaid, 0 ) - COALESCE( TransactionAccountingLine.PaymentAmountUnused, 0 )
					ELSE 0 END ) AS Current,
					SUM( CASE WHEN ( TRUNC( TO_DATE('${endDate}','MM/DD/YYYY') ) - TO_DATE(TO_CHAR(Transaction.TranDate)) ) BETWEEN 1 AND 30 THEN 
					COALESCE( TransactionAccountingLine.AmountUnpaid, 0 ) - COALESCE( TransactionAccountingLine.PaymentAmountUnused, 0 )
					ELSE 0 END ) AS Balance30,
					SUM( CASE WHEN ( TRUNC( TO_DATE('${endDate}','MM/DD/YYYY') ) - TO_DATE(TO_CHAR(Transaction.TranDate)) ) BETWEEN 31 AND 60 THEN 
					COALESCE( TransactionAccountingLine.AmountUnpaid, 0 ) - COALESCE( TransactionAccountingLine.PaymentAmountUnused, 0 )
					ELSE 0 END ) AS Balance60,	
					SUM( CASE WHEN ( TRUNC( TO_DATE('${endDate}','MM/DD/YYYY') ) - TO_DATE(TO_CHAR(Transaction.TranDate)) ) BETWEEN 61 AND 90
					THEN COALESCE( TransactionAccountingLine.AmountUnpaid, 0 ) - COALESCE( TransactionAccountingLine.PaymentAmountUnused, 0 )
					ELSE 0 END ) AS Balance90,		
					SUM( CASE WHEN ( TRUNC( TO_DATE('${endDate}','MM/DD/YYYY') ) - TO_DATE(TO_CHAR(Transaction.TranDate)) ) > 90 THEN 
					COALESCE( TransactionAccountingLine.AmountUnpaid, 0 ) - COALESCE( TransactionAccountingLine.PaymentAmountUnused, 0 )
					ELSE 0 END ) AS Balance90Plus,		
					SUM ( COALESCE( TransactionAccountingLine.AmountUnpaid, 0 ) - COALESCE( TransactionAccountingLine.PaymentAmountUnused, 0 ) ) AS Total
					from Transaction
					INNER JOIN Customer on ( Customer.ID = Transaction.Entity )
					INNER JOIN TransactionAccountingLine ON ( TransactionAccountingLine.Transaction = Transaction.ID )
					INNER JOIN Account on ( Account.id = TransactionAccountingLine.account )
					INNER JOIN AccountSubsidiaryMap on (Account.id = AccountSubsidiaryMap.account)
					WHERE
					(Transaction.TranDate <= '${endDate}')
					AND ( Transaction.Posting = 'T' )
					AND ( Transaction.Voided = 'F' )
					and ((TransactionAccountingLine.AmountUnpaid <> 0 )
					OR ( TransactionAccountingLine.PaymentAmountUnused <> 0 ))
					AND (AccountSubsidiaryMap.subsidiary in ${sqlLocations})  GROUP BY AccountSubsidiaryMap.subsidiary`;
					  
				try {
					var arData = {};
					var arLines = [];
					let ar = [];
						ar.push('subsidiary');
						ar.push('current');
						ar.push('balance30');
						ar.push('balance60');
						ar.push('balance90');
						ar.push('90plus');
						ar.push('total');
						arLines.push(ar);
					log.debug('Run', 'Start AR');
					var resultIterator = query.runSuiteQLPaged({
						query: arSql,
						pageSize: 1000,
						customScriptId: 'arSuiteQL'
					}).iterator()
					resultIterator.each(function(page) {
						var pageIterator = page.value.data.iterator();
						pageIterator.each(function(row) {
							arLines.push(row.value.values);
							return true;
						});
						return true;
					});
					log.debug('Run', 'End AR Lines: ' + arLines.length);
					arData.values = arLines;		
				} catch(e) {		
					log.error('SuiteQL', e.message);
				}
				var jwtHeader = encode.convert({
					 string: JSON.stringify({
						typ:'JWT',
						alg:'RS256'
					 }),
					 inputEncoding: encode.Encoding.UTF_8,
					 outputEncoding: encode.Encoding.BASE_64_URL_SAFE
				  }).replace(/=+$/, '');
				var timestamp = Math.round(new Date().getTime()/1000);
				var timestampEnd = timestamp + 3600;
				const emailAddress = 'swadigmfs@gmfs-368916.iam.gserviceaccount.com';
				const accessScope = 'https://www.googleapis.com/auth/spreadsheets';
				const tokenEndpoint = 'https://oauth2.googleapis.com/token';
				var jwtPayload = {
					"iss": emailAddress,
					"scope": accessScope,
					"aud": tokenEndpoint,
					"exp": timestampEnd,
					"iat": timestamp
				};
				var jwtBody = encode.convert({
					 string: JSON.stringify(jwtPayload),
					 inputEncoding: encode.Encoding.UTF_8,
					 outputEncoding: encode.Encoding.BASE_64_URL_SAFE
					 }).replace(/=+$/, '');
				var jwtSigner = cert.createSigner({
					 certId:'custcertificate8', 
					 algorithm: cert.HashAlg.SHA256
				  });
				jwtSigner.update(jwtHeader +'.'+ jwtBody);
				var jwtSig = jwtSigner.sign({
					 outputEncoding:encode.Encoding.BASE_64_URL_SAFE
				  }).replace(/=+$/, '');
				var signedToken = [jwtHeader, jwtBody, jwtSig].join('.');	 
				const gsAuthUrl = 'https://oauth2.googleapis.com/token?grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=';
				var authHeaders = new Array();
				authHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
				var gsAuthRequest = https.post({
					url: gsAuthUrl + signedToken,
					headers: authHeaders
				});
				var gsAuthCode = gsAuthRequest.code;
				log.debug('Auth', gsAuthCode);
				if (gsAuthCode === 200) {
					var gsAuthResponse = JSON.parse(gsAuthRequest.body);
					var gsAuthToken = gsAuthResponse.access_token;
					const GS_URL = 'https://content-sheets.googleapis.com/v4/spreadsheets/';
					const googleBookId1 = '1EeW8NQQGlbQlgMF1mJvoC81ASqR6OCTT_oq4BUg5-04';
					const googleBookId2 = '1DbG2VQu-KS9KHRDNE98KMioNKD1cTL3Cfq3s3zAzWvw';
					const API_KEY = '8bb7386e73a979bf48467aeae2dbe6cc54261fc5';
					const AUTH_TOKEN = 'Bearer ' + gsAuthToken;
					var requestHeaders = new Array();
					requestHeaders['Authorization'] = AUTH_TOKEN;
					requestHeaders['access_token'] = API_KEY;
					var googleResultRangeB = 'Page1!R8C5:R8C7';
					var bLines = [];
					bLines.push(endMo);
					bLines.push(endDay);
					bLines.push(endYear);
					var requestBodyB = {};
					var mainValuesB = [];
					mainValuesB.push(bLines);
					requestBodyB.values = mainValuesB;
					var gsPutDate1=https.put({
						url: GS_URL + googleBookId1 + '/values/' + googleResultRangeB + '?includeValuesInResponse=false&valueInputOption=RAW&alt=json',
						headers: requestHeaders,
						body: JSON.stringify(requestBodyB)
					});
					log.debug('End', gsPutDate1.code);
					var googleResultRangeE = 'Page1!R7C5:R7C7';
					var eLines = [];
					eLines.push(startMo);
					eLines.push(startDay);
					eLines.push(startYear);
					var requestBodyE = {};
					var mainValuesE = [];
					mainValuesE.push(eLines);
					requestBodyE.values = mainValuesE;
					var gsPutDate2=https.put({
						url: GS_URL + googleBookId1 + '/values/' + googleResultRangeE + '?includeValuesInResponse=false&valueInputOption=RAW&alt=json',
						headers: requestHeaders,
						body: JSON.stringify(requestBodyE)
					});
					log.debug('Start', gsPutDate2.code);
					var googleResultRangeE = 'Page1!R55C20:R55C20';
					var eLines = [];
					eLines.push(nPer);
					var requestBodyE = {};
					var mainValuesE = [];
					mainValuesE.push(eLines);
					requestBodyE.values = mainValuesE;
					var gsPutDate3=https.put({
						url: GS_URL + googleBookId1 + '/values/' + googleResultRangeE + '?includeValuesInResponse=false&valueInputOption=RAW&alt=json',
						headers: requestHeaders,
						body: JSON.stringify(requestBodyE)
					});
					log.debug('Start', gsPutDate3.code);
					var arBalanceLength = arLines.length + 20;
					var arResultRange = 'AR!R1C1:R' + arBalanceLength + 'C7';
					arData.range = arResultRange;
					if (niLines.length > 0) {
						var requestData0 = {};
						var gsSheetLength0 = bsLines.length + 100;
						var googleResultRange0 = 'Page1!R53C14:R64C14';
						requestData0.range = googleResultRange0;
						requestData0.values = niLines;
					}
					var requestData1 = {};
					var gsSheetLength1 = bsLines.length + 100;
					var googleResultRange1 = 'DATA1!R1C1:R' + gsSheetLength1 + 'C5';
					requestData1.range = googleResultRange1;
					requestData1.values = bsLines;
					var requestData2 = {};
					var gsSheetLength2 = isLines.length + 100;
					var googleResultRange2 = 'DATA2!R1C1:R' + gsSheetLength2 + 'C5';
					requestData2.range = googleResultRange2;
					requestData2.values = isLines;
					var requestData3 = {};
					var gsSheetLength3 = ismLines.length + 100;
					var googleResultRange3 = 'DATA3!R1C1:R' + gsSheetLength3 + 'C5';
					requestData3.range = googleResultRange3;
					requestData3.values = ismLines;
					var rData = [];
					if (niLines.length > 0) {
						rData.push(requestData0);
					}
					rData.push(requestData1);
					rData.push(requestData2);
					rData.push(requestData3);
					rData.push(arData);
					var requestBody = {};
					requestBody.valueInputOption = "RAW";
					requestBody.data = rData;
					requestBody.includeValuesInResponse = false;
					try {
						var gsClearItem0=https.post({
							url: GS_URL + googleBookId1 + '/values/Page1!N53:N64:clear',
							headers: requestHeaders
						});
						var gsClearItem1=https.post({
							url: GS_URL + googleBookId1 + '/values/DATA1!A:E:clear',
							headers: requestHeaders
						}); 
						var gsClearItem2=https.post({
							url: GS_URL + googleBookId1 + '/values/DATA2!A:E:clear',
							headers: requestHeaders
						}); 
						var gsClearItem3=https.post({
							url: GS_URL + googleBookId1 + '/values/DATA3!A:E:clear',
							headers: requestHeaders
						}); 
						var gsClearItem4=https.post({
							url: GS_URL + googleBookId1 + '/values/AR!A:Q:clear',
							headers: requestHeaders
						}); 
						var clear0 = gsClearItem0.code;
						var clear1 = gsClearItem1.code;
						var clear2 = gsClearItem2.code;
						var clear3 = gsClearItem3.code;
						var clear4 = gsClearItem4.code;
						log.debug('Clear Sheets', clear0 + ' ' + clear1 + ' ' + clear2 + ' ' + clear3 + ' ' + clear4);
						if (clear0 === 200 && clear1 === 200 && clear2 === 200 && clear3 === 200 && clear4 === 200) {
						var gsPostItem=https.post({
							url: GS_URL + googleBookId1 + '/values:batchUpdate?alt=json',
							headers: requestHeaders,
							body: JSON.stringify(requestBody)
						}); 
						var post1 = gsPostItem.code;
						log.debug('Data Post', post1);
						if (post1 === 200) {
							redirect.toSuitelet({
								scriptId: 'customscript_mhi_swadi_gm_fs',
								deploymentId: 'customdeploy_mhi_swadi_gm_fs',
								parameters: {'custparam_message':'true'}
							});
						}
							else {
								var message = gsPost1 + ': Error sending data to Google Sheets API';
								context.response.write(message);
							}
						}
						else {
							var message = 'Error clearing data from Google Sheets API';
							context.response.write(message);
						}
					}
					catch(e) {
						log.error('GAPI Error', e.message);
						context.response.write(e.message);
					}
				}
				else {
					var message = 'Error obtaining key from Google Sheets API';
					context.response.write(message);
				}
				}
				else {
					var message = 'Error obtaining valid accounting period codes';
					context.response.write(message);
				}
			}
		}

        return {
            onRequest: onRequest
        };
    });