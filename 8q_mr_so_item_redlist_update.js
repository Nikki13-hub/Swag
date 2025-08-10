/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 8/20/2023
	Purpose : Update Item Commit on Sales Orders when an Item is saved, based on Red List check. Called by 8q_ue_item_redlist_update.js
*/
define(['N/search','N/record','N/runtime','N/cache'],function(search,record,runtime,cache) {

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

		const itemId = runtime.getCurrentScript().getParameter({name: 'custscript_8q_item_id'});
		if (!itemId) {
			return '';
		}

		let srch = search.create({
			type:'salesorder',
			filters:[
				{name:'internalid',join:'item',operator:'anyof',values:[itemId]},
				{name:'status',operator:'anyof',values:['SalesOrd:D','SalesOrd:A','SalesOrd:E','SalesOrd:B']},
				{name:'formulanumeric',operator:'greaterthan',values:['0'],formula:'{quantity} - {quantityshiprecv}'}
			],
			columns:[
				{name:'entity'},
				{name:'lineuniquekey'},
				{name:'internalid',join:'item'},
				{name:'custitem_nsps_red_list',join:'item'}
			]
		});
		log.debug('l','ct '+srch.runPaged().count);
		return srch;

	}

	/**
		* Executes when the map entry point is triggered and applies to each key/value pair.
		*
		* @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		* @since 2015.1
		*/
	function map(context) {
		let result = JSON.parse(context.value);
		let values = result.values;
		let soId = context.key;
		let lineKey = values['lineuniquekey'];
		let itemId = values['internalid.item'].value;
		let redList = values['custitem_nsps_red_list.item'];
		let entityId = Number(values['entity'].value);
		
		let redListIds = getRedListCommitIds();		
		
		context.write({
			key: soId,
			value: {
				entityId: entityId,
				redListIds: JSON.stringify(redListIds),
				itemId: itemId,
				lineKey: lineKey,
				redList: redList
			}
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
		let soId = context.key;
		let result = context.values;
		let values = JSON.parse(result[0]);
		let itemId = values.itemId;
		let entityId = values.entityId;
		let redListIds = JSON.parse(values.redListIds);
		if (redListIds.indexOf(entityId) !== -1) {
			context.write({
				key: 'redlist',
				value: JSON.stringify({soId:soId,itemId:itemId})
			});
			return true;
		}
		try {
			let rec = record.load({type: 'salesorder', id: soId});
			for (let i = 0; i < result.length; i++) {
				values = JSON.parse(result[i]);
				let lineKey = values.lineKey;
				let redList = values.redList;
				let line = rec.findSublistLineWithValue({
					sublistId: 'item',
					fieldId: 'lineuniquekey',
					value: lineKey
				});
				let commit = (redList === 'T') ? 3 : 1;
				rec.setSublistValue({sublistId: 'item', fieldId: 'commitinventory', value: commit, line: line});
			}
			rec.save({ignoreMandatoryFields: true});
			context.write({
				key: 'processed',
				value: JSON.stringify({soId:soId,itemId:itemId})
			});
		} catch (e) {
			log.debug('l','error: '+e.message);
			context.write({
				key: 'error',
				value: JSON.stringify({soId:soId,itemId:itemId,error:e.message})
			});
		}

	}


	/**
		* Executes when the summarize entry point is triggered and applies to the result set.
		*
		* @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
		* @since 2015.1
		*/
	function summarize(summary) {
		let errors = [];
		let proc = 0;
		let redlist = 0;
		let itemId = 0;
		summary.output.iterator().each(function(key, value) {
			if (key === 'error') {
				errors.push(value);
				log.debug('l','error '+value);
				let val = JSON.parse(value);
				itemId = val.itemId;
			} else if (key === 'processed') {
				let val = JSON.parse(value);
				itemId = val.itemId;
				proc++
			} else if (key === 'redlist') {
				let val = JSON.parse(value);
				itemId = val.itemId;
				redlist++
			}
			return true;
		});
		log.debug('l','itemId '+itemId);
		log.debug('l','errors '+errors.length);
		log.debug('l','proc '+proc);
		log.debug('l','redlist '+redlist);

		let dt = new Date();
		let mon = dt.getMonth() + 1;
		let start = dt.getFullYear()+'-'+mon+'-'+dt.getDate();
		let errs = '';
		if (errors.length > 0) {
			errs = 'Item Internal ID: '+itemId+'\n';
			for (let i = 0; i < errors.length; i++) {
				let val = JSON.parse(errors[i]);
				errs += 'Sales Order Internal ID: '+val.soId+', error: '+val.error+'\n';
			}
			log.debug('l','errs '+errs);
		}
		return true;
	}

	function getRedListCommitIds() {
		// This is the internal id for 1256 GENERAL MOTORS CORP-LPO
		return [1776];
		/* This has a permissions issue with the preferences record
		let ids = search.lookupFields({
			type: 'customrecord_ns_customization_pref',
			id: 1,
			columns: ['custrecord_8q_redlist_commit_customers']
		}).custrecord_8q_redlist_commit_customers;

		// ids [{"value":"1776","text":"1256 GENERAL MOTORS CORP-LPO"},{"value":"3003","text":"1256 GENERAL MOTORS CORP-RIM ORDERS"}]
		let idAry = [];
		for (let i = 0; i < ids.length; i++) {
			idAry.push(Number(ids[i].value));
		}
		return idAry;
		*/
	
	}

	return {
		getInputData: getInputData,
		map: map,
		reduce: reduce,
		summarize: summarize
	};

});
