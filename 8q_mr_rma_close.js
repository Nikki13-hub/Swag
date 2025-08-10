/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record','N/file','N/search'],function(record,file,search) {

	function getInputData() {

		let fileObj = file.load({id: '2877525'});
		let content = fileObj.getContents();
		let lines = content.split('\n');
		return lines;
	}

	/**
		* Executes when the map entry point is triggered and applies to each key/value pair.
		*
		* @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		* @since 2015.1
		*/
	function map(context) {
//		context {"type":"mapreduce.MapContext","isRestarted":false,"executionNo":1,"key":"2005","value":"9008139"}
//		let values = JSON.parse(context);
		let id = context.value;
		log.error('l','id '+id);
		let rma = search.lookupFields({
			type: 'returnauthorization',
			id: id,
			columns: ['status']
		});
		let orig = id+','+rma.status[0].text+',';
		if (rma.status[0].value !== 'closed') {
			try {
				record.submitFields({
					type: 'returnauthorization',
					id: id,
					values: {status: 'closed'}
				});
				rma = search.lookupFields({
					type: 'returnauthorization',
					id: id,
					columns: ['status']
				});
				orig += rma.status[0].text;
			} catch (e) {
				orig += e.message;
			}
		}
		context.write({
			key: 'ok',
			value: orig
		});

	}

	function summarize(summary) {
		let content = '';
		summary.output.iterator().each(function(key, value) {
			content += '\n'+value;
			return true;
		});
		let file2 = file.create({
			name: 'end_status.csv',
			fileType: file.Type.PLAINTEXT,
			contents: 'ID,Original Status,New Status'+content,
			folder: 90767
		});
		file2.save();

	}

	return {
		getInputData: getInputData,
		map: map,
//		reduce: reduce,
		summarize: summarize
	};

});
