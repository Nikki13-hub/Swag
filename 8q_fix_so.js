/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
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
		const startDate = runtime.getCurrentScript().getParameter({name: 'custscript_start_date_fix_so'});
		const endDate = runtime.getCurrentScript().getParameter({name: 'custscript_end_date_fix_so'});
		let dt = new Date(startDate);
		let mo = dt.getMonth() + 1;
		let start = mo+'/'+dt.getDate()+'/'+dt.getFullYear();

		dt = new Date(endDate);
		mo = dt.getMonth() + 1;
		let end = mo+'/'+dt.getDate()+'/'+dt.getFullYear();

		let fltr = search.createFilter({
			name: 'trandate', operator: 'within', values: [start,end]
		});

		let srch = search.load({
			id: 'customsearch5403'
		});

		srch.filters.push(fltr);
		let ct = srch.runPaged().count;
log.audit('l','ct '+ct+', start '+start+' end '+end+' filter '+JSON.stringify(fltr));
		return srch;

	}

	/**
		* Executes when the map entry point is triggered and applies to each key/value pair.
		*
		* @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		* @since 2015.1
		*/
	function map(context) {

		let invId = context.key;
log.error('l','invId '+invId);	
		let rec = record.load({type: 'invoice', id: invId});
		let lineCt = rec.getLineCount({sublistId: 'item'});
		let mount = 63948;
		let disc = 10212;
		let lpoDiscItem = 10212;

		let errors = '';
		let itemCt = 0;
		let lpoCt = 0;
		let items = [];
		let fix = [];
		let itemsTotal = 0;
		let itemsDiscount = 0;
		let lpoPriceLevel = 6;

		let total = Number(rec.getValue({fieldId: 'total'}));
		let discount = Number(rec.getValue({fieldId: 'discounttotal'}));
		let discountItem = rec.getValue({fieldId: 'discountitem'});
		let discountRate = Number(rec.getValue({fieldId: 'discountrate'})) || 0;
		for (let i = 0; i < lineCt; i++) {
			items[i] = {};
			// item is a string
			let item = Number(rec.getSublistValue({sublistId: 'item', fieldId: 'item', line: i}));
			items[i]['item'] = item;
//log.error('l','item '+item+' items '+items[i]['item']);
			if (item === mount) {
				items[i]['mount'] = true;
				continue;
			}
			if (item === disc) {
				items[i]['discamt'] = Number(rec.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i})) || 0;
				items[i]['discline'] = true;
				itemsDiscount += Number(rec.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i}));
				try {
//log.audit('l','type '+type+' recId '+recId+' set disc line '+i);
//					rec.setSublistValue({sublistId: 'item', fieldId: 'amount', value: 0, line: i});
//					rec.setSublistValue({sublistId: 'item', fieldId: 'rate', value: 0, line: i});
				} catch (e) {
//					errors += 'set disc item '+item+' line '+i+'\n';
				}
				continue;
			}
			items[i]['qty'] = Number(rec.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: i}));
			items[i]['amt'] = Number(rec.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i}));
			items[i]['rate'] = Number(rec.getSublistValue({sublistId: 'item', fieldId: 'rate', line: i}));
//log.error('l','amt '+items[i]['amt']);
			itemsTotal += items[i]['amt'];
			items[i]['price'] = Number(rec.getSublistValue({sublistId: 'item', fieldId: 'price', line: i}));
			if (items[i]['price'] === lpoPriceLevel) {
				lpoCt++;
			}
			itemCt++;		
		}
//log.error('l','items.length '+items.length);
//log.error('l','itemCt '+itemCt);
		if (itemCt === 1) {
			context.write({
				key: 'oneItem',
				value: 'ok'
			});
			return true;
		}

		for (let i = 0; i < items.length; i++) {
//log.error('l',i+' '+items[i]['item']);
			if (items[i]['mount'] || items[i]['discline']) {
				continue;
			}
			for (let j = i + 1; j < lineCt; j++) {
				let item = Number(rec.getSublistValue({sublistId: 'item', fieldId: 'item', line: j}));
				if (item === mount || item === disc) {
					continue;
				}
//log.error('l','i '+i+' '+items[i]['item']+' j '+j+' '+item);
				if (item !== items[i]['item']) {
					continue;
				}
				let amt = Number(rec.getSublistValue({sublistId: 'item', fieldId: 'amount', line: j}));
				let qty = Number(rec.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: j}));
//log.audit('l',i+' i amt '+items[i]['amt']+' j '+j+' amt '+amt);
				if (qty === items[i]['qty'] && amt === items[i]['amt']) {
//log.error('l','equal skip');
					continue;
				}
				let rate = Number(rec.getSublistValue({sublistId: 'item', fieldId: 'rate', line: j}));
				fix.push('line '+i+', amt '+items[i]['amt']+', rate '+items[i]['rate']+', qty '+items[i]['qty']+
					'line '+j+', amt '+amt+', rate '+rate+', qty '+qty);
			}
		}
		if (fix.length > 0) {
			context.write({
				key: 'fix',
				value: invId+': total: '+total+', items: '+JSON.stringify(fix)
			});
		} else {
			context.write({
				key: 'ok',
				value: 'ok'
			});
		}
	}

	/**
		* Executes when the reduce entry point is triggered and applies to each group.
		*
		* @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
		* @since 2015.1
		*/
	function reduce(context) {

	}


	/**
		* Executes when the summarize entry point is triggered and applies to the result set.
		*
		* @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
		* @since 2015.1
		*/
	function summarize(summary) {
		let folder = 90911;

		const startDate = runtime.getCurrentScript().getParameter({name: 'custscript_start_date_fix_so'});
		const endDate = runtime.getCurrentScript().getParameter({name: 'custscript_end_date_fix_so'});
		let dt = new Date(startDate);
		let mon = dt.getMonth() + 1;
		let day = dt.getDate();
		if (mon < 10) {
			mon = '0'+mon;
		}
		if (day < 10) {
			day = '0'+day;
		}
		let start = dt.getFullYear()+'-'+mon+'-'+day;

		dt = new Date(endDate);
		mon = dt.getMonth() + 1;
		day = dt.getDate();
		if (mon < 10) {
			mon = '0'+mon;
		}
		if (day < 10) {
			day = '0'+day;
		}
		let end = dt.getFullYear()+'-'+mon+'-'+day;

		dt = new Date();
		let ms = dt.getTime();

		let fix = [];
		summary.output.iterator().each(function(key, value) {
			if (key === 'fix') {
				fix.push(value);
			}
			return true;
		});

		log.audit('l','summarize fix.length '+fix.length);
		if (fix.length > 0) {
			let lines = start+' to '+end+'\n';
			for (let i = 0; i < fix.length; i++) {
				lines += fix[i]+'\n';
			}
			let fileObj = file.create({
				name: 'fix_'+start+'_'+end+'.'+ms+'.txt',
				fileType: file.Type.PLAINTEXT,
				contents: lines,
				folder: folder
			});
			fileObj.save();
		}

	}

	return {
		getInputData: getInputData,
		map: map,
//		reduce: reduce,
		summarize: summarize
	};

});
