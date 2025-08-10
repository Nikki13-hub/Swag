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
		return search.load('customsearch_8q_item_rct_no_dept_or_ckbx');
	}

	/** 
		* Executes when the map entry point is triggered and applies to each key/value pair.
		*
		* @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		* @since 2015.1
		*/
		
	function map(context) { 
		context.write({
			key: context.key,
			value: ''
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
		log.error('l','id '+context.key);
		let rec = record.load({type: 'itemreceipt', id: context.key});
		let ct = rec.getLineCount({sublistId: 'item'});
		for (let i = 0; i < ct; i++) {
			let itemId = rec.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
			let item = search.lookupFields({
				type: 'inventoryitem',
				id: itemId,
				columns: ['department']
			});
			if (item.department.length > 0) {
				let deptId = item.department[0].value;
				let depText = item.department[0].text;
				rec.setSublistValue({sublistId: 'item', fieldId: 'department', value: deptId, line: i});
				if (depText === 'Ford') {
					rec.setSublistValue({
						sublistId: 'item',
						fieldId: 'custcol_8q_ford_check_box',
						value: true,
						line: i
					});
				} else if (depText === 'GM') {
					rec.setSublistValue({
						sublistId: 'item',
						fieldId: 'custcol_8q_gm_check_box',
						value: true,
						line: i
					});
				} else if (depText === 'Custom Koncepts') {
					rec.setSublistValue({
						sublistId: 'item',
						fieldId: 'custcol_8q_custom_k_box',
						value: true,
						line: i
					});
				} else if (depText === 'Grills') {
					rec.setSublistValue({
						sublistId: 'item',
						fieldId: 'custcol_8q_grills_box',
						value: true,
						line: i
					});
				}
			}
		}
		try {
			let id = rec.save({ignoreMandatoryFields: true});
			context.write({
				key: context.key,
				value: ''
			});
			return true;
			
		} catch (e) {
			log.error('l',context.key+' dept '+depText+', save error '+e.message);
			context.write({
				key: context.key,
				value: 'error save '+e.message
			});
			return true;
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
		let errors = '';
		summary.output.iterator().each(function(key, value) {
			if (value) {
				if (value.match(/^error/)) {
					errors += key+' error '+value+'\n';
				}
			}
			return true;
		});
		if (errors) {
			let fileObj = file.create({
				name: 'item_rcpt_errors.txt',
				fileType: file.Type.PLAINTEXT,
				contents: errors,
				folder: 90911
			});
			let fileId = fileObj.save();
			fileObj = file.load({
				id: fileId
			});
			email.send({
					author: -5,
					recipients: 'fred@8quanta.com',
					attachments: [fileObj],
					subject: 'Item Receipt Errors',
					body: 'errors'
			});
		}
		return true;	
	}

	return {
		getInputData: getInputData,
		map: map,
		reduce: reduce,
		summarize: summarize
	};

});
