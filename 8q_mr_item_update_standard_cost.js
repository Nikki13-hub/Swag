/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 8/28/2023
	Purpose : Update Standard Cost and Default Return Cost on Inventory Locations
*/
define(['N/search','N/record','N/runtime','N/file'],function(search,record,runtime,file) {

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
//		let srch = search.load({id: 'customsearch_8q_item_update_std_cost'});

		let srch = search.create({
			type: 'inventoryitem',
			filters: [
				{name: 'isinactive', operator: 'is', values: ['F']},
				{name: 'internalid', operator: 'is', values: [5740]}
			],
			columns: [
				{name:'salesdescription'},
				{name:'custitem_nsps_source'},
			]
		});		

		log.error('l','ct '+srch.runPaged().count);
		return srch;

	}

	/**
		* Executes when the map entry point is triggered and applies to each key/value pair.
		*
		* @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		* @since 2015.1
		*/
	function map(context) {
		let itemId = context.key;
		let value = JSON.parse(context.value);
		let result = value.values;
		let itemSource = result.custitem_nsps_source.value;
		let itemSourceText = result.custitem_nsps_source.text;
		let itemDescription = result.salesdescription;

		let locations = [];
		search.create({
			type: 'inventoryitem',
			filters: [
				{name: 'internalid', operator: 'is', values: [itemId]},
				{name:'isinactive',join:'inventoryLocation', operator: 'is', values: ['F']}
			],
			columns: [
				{name:'inventorylocation'},
			]
		}).run().each(function(res) {
			locations.push(res.getValue({name: 'inventorylocation'}));
			return true;
		});

		// From custom list Source Code
		// 900 internal ID is 104
		// 910 internal ID is 126
		// If itemSource is 900 and Item description does NOT contain "wheel"
		//	make the itemSource 910
		if (itemSource == '104') {
			if (!itemDescription.match('wheel') ) {
				itemSource = '126';
				itemSourceText = '910';
			}
		}
try {
//log.error('l','map itemId '+itemId+' itemSource '+itemSource+' itemSourceText '+itemSourceText);

		context.write({
			key: itemId,
			value: {
				locations: JSON.stringify(locations),
				itemSource: itemSource,
				itemSourceText: itemSourceText,
			}
		});
		return true;	
} catch (e) {
	log.error('l','map error '+e.message);
	context.write({
		key:'error',
		value: 'map error '+e.message
	});
	return true;
	
}


	}

	/**
		* Executes when the reduce entry point is triggered and applies to each group.
		*
		* @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
		* @since 2015.1
		*/
	function reduce(context) {
//log.error('l','reduce context '+JSON.stringify(context));
		let itemId = context.key;
		log.audit('l','reduce itemId '+itemId);
		if (itemId === 'error') {
			context.write({
				key:'error',
				value: 'map error '+e.message
			});
			return true;
		}
		let result = JSON.parse(context.values[0]);
		let itemSource = result.itemSource;
		let itemSourceText = result.itemSourceText;

		let adiCost = 0;
		let dealerCost = 0;
try {
		search.create({
			type: 'customrecord_nsps_price_tape',
			filters: [{name: 'custrecord_nsps_linked_item_name', operator: 'is', values: [itemId]}],
			columns: [
			  search.createColumn({
				 name: 'created',
				 sort: search.Sort.DESC
			  }),
				{name: 'custrecord_nsps_adi_cost'},
				{name: 'custrecord_nsps_dealer_cost'},
			]
		}).run().each(function(res) {
			adiCost = Number(res.getValue({name: 'custrecord_nsps_adi_cost'}));
			dealerCost = Number(res.getValue({name: 'custrecord_nsps_dealer_cost'}));
//log.error('l','adiCost '+adiCost+' dealerCost '+dealerCost);
		});

		// Pref location 620 is id 108
		if (itemSource !== '108' && dealerCost !== 0) {
			let adiCostDiscount = adiDiscount(itemSourceText);
//log.error('l','disc '+adiCostDiscount);
			adiCost = Number(dealerCost*(1-adiCostDiscount/100));
		}
		if (isEmpty(adiCost) || adiCost == 0) {
			// Since the purpose is to update Standard Cost on Item Location Configuration using adiCost,
			//  if there is none, skip this item
			write.context({
				key: 'skip',
				value: 'itemId '+itemId+' no adiCost'
			});
			return true;
		}

		adiCost = round(adiCost,2);
log.error('l','adiCost '+adiCost);
} catch (e) {
	log.error('l','adicost lookup err '+e.message);
	context.write({
		key:'error',
		value: 'adicost lookup error '+e.message
	});
	return true;
}

log.error('l','adiCost '+adiCost);
		let locations = JSON.parse(result.locations);
		for (let i = 0; i < locations.length; i++) {
log.error('l','location '+locations[i]);
try {
			let locConfigId = 0;
			search.create({
				type:'itemlocationconfiguration',
				filters:[
					{name:'item',operator:'anyof',values:[itemId]},
					{name:'location',operator:'is',values:[locations[i]]}
				]
			}).run().each(function(res) {
				locConfigId = res.id;
			});
			let recLocationConfig = {};
log.error('l','locConfigId '+locConfigId);
			if (locConfigId) {
				recLocationConfig = record.load({
					type: record.Type.ITEM_LOCATION_CONFIGURATION,
					id: locConfigId,
					isDynamic: true
				});

			} else {

				recLocationConfig = record.create({
					type: record.Type.ITEM_LOCATION_CONFIGURATION,
					isDynamic: true,
					defaultValues: {
						location: locations[i],
						item: itemId,
					}
				});
			}

			recLocationConfig.setValue({
				fieldId: 'cost',
				value: adiCost
			});

			recLocationConfig.setValue({
				fieldId: 'defaultreturncost',
				value: adiCost
			});
//log.error('l','set adiCost '+adiCost+' location '+locations[i]);

			try {
//				locConfigId = recLocationConfig.save();
//log.error('l','save id '+locConfigId);
			} catch (e) {
				log.error('l','save Loc '+locations[i]+' Config, err: '+e.message);
				context.write({
					key: 'error',
					value: 'save Loc '+locations[i]+' Config, err: '+e.message
				});
			}
} catch (e) {
	log.error('l','reduce err loc '+locations[i]+', '+e.message);
	context.write({
		key: 'error',
		value: 'reduce error loc config update '+locations[i]+', '+e.message
	});
	return true;
}
		}
		context.write({
			key: 'processed',
			value: 'ok'
		});

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
		let skip = [];
		summary.output.iterator().each(function(key, value) {
			if (key === 'error') {
				errors.push(value);
			} else if (key === 'skip') {
				skip.push(value);
			} else if (key === 'processed') {
				proc++
			}
			return true;
		});
		log.debug('l','errors '+errors.length);
		log.debug('l','proc '+proc);
		log.debug('l','skip '+skip.length);
return true;
		if (errors.length > 0) {
			let errs = '';
			for (let i = 0; i < errors.length; i++) {
				errs += errors[i]+'\n';
				log.debug('l','errs '+errs);
			}
			let fileObj = file.create({
				name: 'update_std_cost_errors.txt',
				fileType: file.Type.PLAINTEXT,
				contents: errs,
				folder: 90911
			});
			fileObj.save();
		}
	}

	function sourceId(itemSource) {
		let codes = {
			'501': 101,
			'505': 102,
			'515': 103,
			'900': 104,
			'800': 105,
			'601': 106,
			'605': 107,
			'620': 108,
			'615': 109,
			'610': 110,
			'520': 111,
			'520': 112,
			'520': 113,
			'519': 114,
			'520': 115,
			'550': 116,
			'551': 117,
			'552': 118,
			'612': 119,
			'614': 120,
			'613': 121,
			'613': 122,
			'613': 123,
			'510': 124,
			'606': 125,
			'910': 126
		}
		return codes[itemSource];

	}
	function adiDiscount(itemSource) {
try {
		let id = sourceId(itemSource);

		let discount = '';
		search.create({
			type: 'customrecord_nsps_item_source',
			filters: [
				{name: 'custrecord_nsps_item_source', operator: 'is', values: [id]}
			],
			columns: [
				{name: 'custrecord_nsps_adi_cost_disc_percent'}
			]
		}).run().each(function(res) {
			discount = res.getValue({name: 'custrecord_nsps_adi_cost_disc_percent'}).replace(/[^\d\.]/g,'');
		});
		
		return discount;
} catch (e) {
	return 0;
}
	}

	function isEmpty(value) {
		if (value == null) {
			return true;
		}
		if (value == undefined) {
			return true;
		}
		if (value == 'undefined') {
			return true;
		}
		if (value == '') {
			return true;
		}
		return false;
	}

	function round(a,b) {
		return Math.round(a * 10 ** b) / 10 ** b;
	}
	

	return {
		getInputData: getInputData,
		map: map,
		reduce: reduce,
		summarize: summarize
	};

});
