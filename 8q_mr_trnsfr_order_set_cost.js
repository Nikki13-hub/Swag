/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 6/4/2024
	Purpose : Update cost on "to" Item Location Configuration
*/
define(['N/search','N/record','N/runtime'],function(search,record,runtime) {

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

		let scriptObj = runtime.getCurrentScript();
		let recId = scriptObj.getParameter('custscript_8q_mr_cost_update_rec_id');
		let recType = scriptObj.getParameter('custscript_8q_mr_cost_update_rec_type');
if (!recId || !recType) {
	return [];
}
		// transferorder and inventorytransfer use subsidiary
		let rec = {};
		try {
			rec = record.load({type: recType, id: recId});
		} catch (e) {
			log.error('l','record does not exist recType '+recType+' recId '+recId);
			return [];
		}

		let subsidiaryField = (recType === 'intercompanytransferorder') ? 'tosubsidiary' : 'subsidiary';
		let subsidiaryId = rec.getValue({fieldId: subsidiaryField});

		// To Location
		let toLocation = rec.getValue({fieldId: 'transferlocation'});
		// From Location
		let fromLocation = rec.getValue({fieldId: 'location'});

		let sublistId = (recType === 'inventorytransfer') ? 'inventory' : 'item';
		let itemCt = rec.getLineCount({sublistId: sublistId});
		let results = [];
		for (let i = 0; i < itemCt; i++) {
			let itemId = rec.getSublistValue({sublistId: sublistId, fieldId: 'item', line: i});
			results.push({itemId: itemId, fromLocation: fromLocation, toLocation: toLocation, subsidiaryId: subsidiaryId});
		}
		return results;

	}

	/**
		* Executes when the map entry point is triggered and applies to each key/value pair.
		*
		* @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		* @since 2015.1
		*/
	function map(context) {
		/*
		{"type":"mapreduce.MapContext","isRestarted":false,"executionNo":1,"key":"0","value":"{\"itemId\":\"5909\",\"fromLocation\":\"49\",\"toLocation\":\"50\"}"}
		*/
		let value = JSON.parse(context.value);
		let itemId = value.itemId;
		let fromLocation = value.fromLocation;
		let toLocation = value.toLocation;
		let subsidiaryId = value.subsidiaryId;

		try {
			let locConfig = getLocConfigId(itemId,fromLocation);
			let fromLocConfigId = locConfig.locConfigId;
			let fromCost = locConfig.cost
			locConfig = getLocConfigId(itemId,toLocation);
			let toLocConfigId = locConfig.locConfigId;
			let recLocationConfig = {};
			if (toLocConfigId) {

				// 5 units
				record.submitFields({
					type: record.Type.ITEM_LOCATION_CONFIGURATION,
					id: toLocConfigId,
					values: {cost: fromCost}
				});

			} else {

				// 5 units
				recLocationConfig = record.create({
					type: record.Type.ITEM_LOCATION_CONFIGURATION,
					isDynamic: true,
					defaultValues: {
						location: toLocation,
						item: itemId,
					}
				});
				recLocationConfig.setValue({
					fieldId: 'cost',
					value: fromCost
				});

				// 10 units
				toLocConfigId = recLocationConfig.save();
			}

			context.write({
				key: itemId,
				value: {subsidiaryId: subsidiaryId, locationId: toLocation, cost: fromCost}
			});

		} catch (e) {
			context.write({
				key: itemId,
				value: {error: e.message}
			});

		}
		return true;
	}

	/**
		* Executes when the reduce entry point is triggered and applies to each group.
		*
		* @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
		* @since 2015.1
		*/
	function reduce(context) {
		/*
		{"type":"mapreduce.ReduceContext","isRestarted":false,"executionNo":1,"key":"5909","values":["{\"subsidiaryId\":\"5\",\"locationId\":\"50\",\"cost\":\"112.80\"}"]}
		*/
		let itemId = context.key;
		let values = JSON.parse(context.values[0]);
		if (values.error) {
			context.write({
				key: itemId,
				value: {error: 'map error '+values.error}
			});
			return true;
		}
		let subsidiaryId = values.subsidiaryId;
		let locationId = values.locationId;
		let cost = values.cost;

		try {
			// Create the record
			// 10 units - transaction
			let revaluationRec = record.create({
				type: record.Type.INVENTORY_COST_REVALUATION,
			});

			revaluationRec.setValue({
				fieldId: 'subsidiary',
				value: subsidiaryId
			});

			revaluationRec.setValue({
				fieldId: 'item',
				value: itemId
			});

			revaluationRec.setValue({
				fieldId: 'location',
				value: locationId
			});

			revaluationRec.setSublistValue({
				sublistId: 'costcomponent',
				fieldId: 'cost',
				line: 0,
				value: cost
			});

/*
Done automatically
			revaluationRec.setValue({
				fieldId: 'account',
				value: '1'
			});

			revaluationRec.setSublistValue({
				sublistId: 'costcomponent',
				fieldId: 'componentitem',
				line: 1,
				value: componentItemId1         // Some inventory item
			});

			revaluationRec.setSublistValue({
				sublistId: 'costcomponent',
				fieldId: 'quantity',
				line: 1,
				value: '3'
			});
*/
			// 20 units - transaction
			let revalId = revaluationRec.save();
			log.audit('l','revalId '+revalId);
			context.write({
				key: itemId,
				value: {revalId: revalId}
			});

		} catch (e) {
			context.write({
				key: itemId,
				value: {error: e.message}
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
		summary.output.iterator().each(function(key, value) {
			let val = JSON.parse(value);
			if (val.error) {
				log.error('l',key+': error '+val.error);
			}

			return true;
		});

	}

	function getLocConfigId(itemId,locationId) {
		let locConfigId = 0;
		let cost = 0;
		// 0 units
		search.create({
			type:'itemlocationconfiguration',
			filters:[
				{name:'item',operator:'anyof',values:[itemId]},
				{name:'location',operator:'is',values:[locationId]}
			],
			columns: [{name: 'cost'}]
		}).run().each(function(res) {
			locConfigId = res.id;
			cost = res.getValue({name: 'cost'});
		});
		return {locConfigId: locConfigId, cost: cost};
	}

	return {
		getInputData: getInputData,
		map: map,
		reduce: reduce,
		summarize: summarize
	};

});
