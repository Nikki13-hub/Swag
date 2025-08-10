/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 
	Purpose : 
*/
define(['N/search','N/record','N/runtime','N/file','N/email'],function(search,record,runtime,file,email) {

	/**
		* Marks the beginning of the Map/Reduce process and generates input data.
		*
		* @typedef {Object} ObjectRef
		* @property {number} id - Internal ID of the record instance
		* @property {string} type - Record type id
		*
		* @return {Array|Object|Search|RecordRef} inputSummary
		* @since 2015.1
		*/
	function getInputData() {
/*		
		let srch = search.create({
			type: 'Transaction',
			filters: [
				{name: 'type',operator: 'anyof',values: ['SalesOrd','ItemShip']},
				{name: 'mainline',operator: 'is',values: ['F']},
				{name: 'line.cseg1',operator: 'anyof',values: ['@NONE@'],isor: true,leftparens: 1},
				{name: 'department',operator: 'anyof',values: ['@NONE@'],rightparens: 1},
				{name: 'mainline',operator: 'is',values: ['F']},
				{name: 'shipping',operator: 'is',values: ['F']},
				{name: 'taxline',operator: 'is',values: ['F']},
				{name: 'type',join: 'createdfrom',operator: 'noneof',values: ['TrnfrOrd']},
				{name: 'trandate',operator: 'within',values: ['thisfiscalquartertodate']}
			]
		});
*/
		let srch = search.load({id: 'customsearch_8q_tran_code_no_apr_or_dept'});
		let ct = srch.runPaged().count;
		log.error('l','ct '+ct);
		return srch;

		let allResults = getAllResults(srch);
		log.error('l','all length '+allResults.length);
		return allResults;
	}

	/**
		* Executes when the map entry point is triggered and applies to each key/value pair.
		*
		* @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		* @since 2015.1
		*/
	function map(context) {
		let value = JSON.parse(context.value);
		/*
		{"type":"mapreduce.MapContext","isRestarted":false,"executionNo":1,"key":"0","value":"{\"recordType\":\"salesorder\",\"id\":\"19065874\",\"values\":{}}"}
		*/
//log.error('l','reduce id '+value.id+', type '+value.recordType);
		context.write({
			key: value.id,
			value: value.recordType
		});
		return true;
		

	}

	/**
		* Executes when the reduce entry point is triggered and applies to each group.
		*
		* @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
		* @since 2015.1
		*/
	function reduce(context) {
		let tranId = context.key;
		let recType = context.values[0];
		try {
			let rec = record.load({
				type: recType,
				id: tranId
			});
			let tranName = rec.getValue({fieldId: 'tranid'});
			let apr = 0;
			let deptUpdate = 0;
			let noDept = '';
			let noDeptCt = 0;
			let aprUpdate = 0;
			let noAPR = '';
			let noAPRCt = 0;
			let errors = '';
			let entity = Number(rec.getValue({fieldId: 'entity'}));
			let entityName = rec.getText({fieldId: 'entity'});
			
			if (rec.getValue({fieldId: 'custbody_nsts_send_to_customer'}) ) {
				entity = rec.getValue({fieldId: 'custbody_nsts_send_to_customer'});
				entityName = rec.getText({fieldId: 'custbody_nsts_send_to_customer'});
			}
			let getAPR = search.lookupFields({
				type: 'entity',
				id: entity,
				columns: ['cseg1','custentity_nsps_customer_default_loc']
			});
			if (getAPR.cseg1 !== null && getAPR.cseg1.length > 0) {
				apr = Number(getAPR.cseg1[0].value);
			} else {
				noARP += entityName+',';
				noAPRCt++;
			}
			let locationText = '';
			if (recType === 'salesorder') {
				locationText = rec.getText({fieldId: 'location'});
			} else {
				let getLoc = search.lookupFields({
					type: recType,
					id: rec.getValue({fieldId: 'createdfrom'}),
					columns: ['location']
				});
				if (getLoc.location != null && getLoc.location.length > 0) {
					locationText = getLoc.location[0].text;
				}
			}
			let konceptsGrillsDept = 0;
			if (locationText.match(/Koncepts/i)) {
				apr = 103;
				konceptsGrillsDept = 8;
			} else if (locationText.match(/Grills/i)) {
				apr = 104;
				konceptsGrillsDept = 9;
			}
			let ct = rec.getLineCount({sublistId: 'item'});
			for (let i = 0; i < ct; i++) {
				let department = 0;
				let lineDept = '';
				let lineAPR = '';
				let setAPR = apr;
				try {
					// need to check item inventory location as well as header location
					// But do this for each line
					let invtLocationText = rec.getSublistText({sublistId: 'item', fieldId: 'inventorylocation', line: i});
					if (isEmpty(invtLocationText) ) {
						invtLocationText = rec.getSublistText({sublistId: 'item', fieldId: 'custcol_8q_inv_fulfillment_location', line: i});
					}
					if (!isEmpty(invtLocationText) ) {
						if (invtLocationText.match(/Koncepts/i)) {
							setAPR = 103;
							department = 8;
						} else if (invtLocationText.match(/Grills/i)) {
							setAPR = 104;
							department = 9;
						}
					}
					lineDept = rec.getSublistValue({sublistId: 'item', fieldId: 'department', line: i});
					lineAPR = rec.getSublistValue({sublistId: 'item', fieldId: 'cseg1', line: i});
					if (!lineDept) {
						if (konceptsGrillsDept) {
							department = konceptsGrillsDept;
					} else if (department === 0) {
							let item = rec.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
							let getDEPT = search.lookupFields({
								type: 'item',
								id: item,
								columns: ['department']
							});
							if (getDEPT.department != null && getDEPT.department.length > 0) {
								department = getDEPT.department[0].value;
							} else {
								noDeptCt++;
								noDept += rec.getSublistText({sublistId: 'item', fieldId: 'item', line: i})+', ';
							}
						}
					}
log.error('l','recType '+recType+', tranId '+tranId+' line '+i+' of '+ct+', lineDept '+lineDept+', department '+department+', lineAPR '+lineAPR+', setAPR '+setAPR);
					if (!lineDept && department) {
						rec.setSublistValue({sublistId: 'item', fieldId: 'department', value: department, line: i});
						deptUpdate++;
					}
					if (!lineAPR && !isEmpty(setAPR) && setAPR !== 0) {
						rec.setSublistValue({sublistId: 'item', fieldId: 'cseg1', value: setAPR, line: i});
						aprUpdate++;
					}
				} catch (e) {
					errors += 'tranId '+tranId+' line '+i+' of '+ct+', lineDept '+lineDept+', department '+department+', lineAPR '+lineAPR+', setAPR '+setAPR+', error: '+e.message;
				}
			}
			if (errors) {
				context.write({
					key: tranId,
					value: {tranName: tranName, error: errors}
				});
				return true;
			}
			rec.save();
			context.write({
				key: tranId,
				value: {
					aprUpdate: aprUpdate,
					noAPR: noAPR,
					noAPRCt: noAPRCt,
					deptUpdate: deptUpdate,
					noDept: noDept,
					noDeptCt: noDeptCt,
					tranName: tranName
				}
			});
			return true;

		} catch (e) {
			log.error('l','reduce error tranId '+tranId+', tranName '+tranName+', error '+e.message);
			context.write({
				key: tranId,
				value: {tranName: tranName, error: e.message}
			});
		}

		return true;
	}


	/**
		* Executes when the summarize entry point is triggered and applies to the result set.
		*
		* @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
		* @since 2015.1
		*/
	function summarize(summary) {
		try {
			let stRuntimeEnv = runtime.envType;
			let folders = {SANDBOX:90911, PRODUCTION: 90911};
			let folder = folders[stRuntimeEnv];
			let proc = 0;
			let trans = 0;
			let deptUpdate = 0;
			let aprUpdate = 0;
			let errors = [];
			let updated = [];
			let noAPR = [];
			let noAPRCt = 0;
			let noDept = [];
			let noDeptCt = 0;
			summary.output.iterator().each(function(key, value) {
				trans++;
				let vals = JSON.parse(value)
				if (vals.error) {
					errors.push(vals.tranName+' ID '+key+', '+vals.error);
				} else {
					if (vals.aprUpdate) {
						aprUpdate++;
						updated.push(vals.tranName+' ID '+key+', apr '+vals.aprUpdate);
					}
					if (vals.deptUpdate) {
						deptUpdate++;
						updated.push(vals.tranName+' ID '+key+', dept '+vals.deptUpdate);
					}
					if (vals.noDept) {
						noDeptCt += vals.noDeptCt;
						noDept.push(vals.tranName+' ID '+key+', '+vals.noDept.replace(/, $/,''));
					}
					if (vals.noAPR) {
						noAPRCt += vals.noAPRCt;
						noAPR.push(vals.tranName+' ID '+key+', '+vals.noAPR.replace(/, $/,''));
					}
					proc++
				}
				return true;
			});
			log.error('l','errors '+errors.length);
			log.error('l','noDept '+noDept.length);
			log.error('l','noDeptCt '+noDeptCt);
			log.error('l','proc '+proc);
			log.error('l','aprUpdate '+aprUpdate);
			log.error('l','deptUpdate '+deptUpdate);

			let dt = new Date();
			dt.setDate(dt.getDate()-1);
			let day = dt.getDate();
			let mo = dt.getMonth() + 1;
			let date = mo+'-'+dt.getDate()+'-'+dt.getFullYear();

			let fileAttach = [];
			let errorAttach = {};
			let updateAttach = {};
			let noDeptAttach = {};
			let errFileId = 0;
			let updFileId = 0;
			let noDeptFileId = 0;
			let noAPRFileId = 0;
			if (errors.length > 0) {
				let errs = '';
				for (let i = 0; i < errors.length; i++) {
					errs += errors[i]+'\n';
				}
				let fileObj = file.create({
					name: 'missing_so_apr_dept_errors.txt',
					fileType: file.Type.PLAINTEXT,
					contents: errs,
					folder: folder
				});
				errFileId = fileObj.save();
				errorAttach = file.load({id: errFileId});
			}

			if (updated.length > 0) {
				let updates = '';
				for (let i = 0; i < updated.length; i++) {
					updates += updated[i]+'\n';
				}
				let fileObj = file.create({
					name: 'missing_so_apr_dept_updated.txt',
					fileType: file.Type.PLAINTEXT,
					contents: updates,
					folder: folder
				});
				updFileId = fileObj.save();
				updateAttach = file.load({id: updFileId});
			}

			if (noDept.length > 0) {
				let items = '';
				for (let i = 0; i < noDept.length; i++) {
					items += noDept[i]+'\n';
				}
				let fileObj = file.create({
					name: 'missing_so_apr_dept_no_dept.txt',
					fileType: file.Type.PLAINTEXT,
					contents: items,
					folder: folder
				});
				noDeptFileId = fileObj.save();
				noDeptAttach = file.load({id: noDeptFileId});
			}

			if (noAPR.length > 0) {
				let items = '';
				for (let i = 0; i < noAPR.length; i++) {
					items += noAPR[i]+'\n';
				}
				let fileObj = file.create({
					name: 'missing_so_apr_dept_no_apr.txt',
					fileType: file.Type.PLAINTEXT,
					contents: items,
					folder: folder
				});
				noAPRFileId = fileObj.save();
				noAPRAttach = file.load({id: noAPRFileId});
			}

			let values = {
				author: 11866,
				recipients: ['mmcdonald@8quanta.com','joeyk@swagoe.com','deweyd@swagoe.com','stacyn@swagoe.com'],
				subject: 'SW SO Missing APR/Dept complete '+date,
				body: 'M/R script for sales order update line APR and Dept is done.'+
					'<br />'+date+'.'+
					'<br />If there were errors, they are in attached file missing_so_apr_dept_errors.txt.'+
					'<br />If there were items with no department, they are in attached file missing_so_apr_dept_no_dept.txt.'+
					'<br />If there were Customers with no APR, they are in attached file missing_so_apr_dept_no_apr.txt.'+
					'<br />Transactions updated are in attached file missing_so_apr_dept_updated.txt.'+
					'<br />Number of transactions checked: '+trans+
					'<br />Number of errors: '+errors.length+
					'<br />Number of transactions with no error: '+proc+
					'<br />Number of transactions with items with no department: '+noDept.length+
					'<br />Number of items with no department: '+noDeptCt+
					'<br />Number of lines with department added: '+deptUpdate+
					'<br />Number of lines with APR added: '+aprUpdate+
					'<br />Number of transactions with customers with no APR: '+noAPR.length+
					'<br />Number of customers with no APR: '+noAPRCt
			}
			if (errFileId) {
				fileAttach.push(errorAttach);
			}
			if (updFileId) {
				fileAttach.push(updateAttach);
			}
			if (noDeptFileId) {
				fileAttach.push(noDeptAttach);
			}
			if (noAPRFileId) {
				fileAttach.push(noAPRAttach);
			}
			if (fileAttach.length > 0) {
				values['attachments'] = fileAttach;
			}

			email.send(values);
			log.error('l','sent email');
			

			if (errFileId) {
				file.delete({id: errFileId});
			}
			if (updFileId) {
				file.delete({id: updFileId});
			}
			if (noDeptFileId) {
				file.delete({id: noDeptFileId});
			}
			if (noAPRFileId) {
				file.delete({id: noAPRFileId});
			}
		} catch (e) {
			log.error('l','summarize error '+e.message);
		}

		return true;

	}

	function getAllResults(objSearch, maxResults) {
		var intPageSize = 1000;
		// limit page size if the maximum is less than 1000
		if (maxResults && maxResults < 1000) {
				intPageSize = maxResults;
		}
		var objResultSet = objSearch.runPaged({
				pageSize: intPageSize
		});
		var arrReturnSearchResults = [];
		var j = objResultSet.pageRanges.length;
		// retrieve the correct number of pages. page count = maximum / 1000
		if (j && maxResults) {
				j = Math.min(Math.ceil(maxResults / intPageSize), j);
		}
		for (var i = 0; i < j; i++) {
				var objResultSlice = objResultSet.fetch({
						index: objResultSet.pageRanges[i].index
				});
				arrReturnSearchResults = arrReturnSearchResults.concat(objResultSlice.data);
		}
		if (maxResults) {
				return arrReturnSearchResults.slice(0, maxResults);
		} else {
				return arrReturnSearchResults;
		}
	}

	function isEmpty(stValue) {
	 return ((stValue === '' || stValue == null || stValue == 'null' || stValue == undefined || stValue == 'undefined')
		 || (stValue.constructor === Array && stValue.length == 0)
		 || (stValue.constructor === Object && (function(v){for(let k in v)return false;return true;})(stValue)));
	};

	return {
		getInputData: getInputData,
		map: map,
		reduce: reduce,
		summarize: summarize
	};

});
