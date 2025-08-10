/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 
	Purpose : 
*/

define(['N/search','N/record','N/runtime','N/file'],function(search,record,runtime,file) {

	/**
		* Function definition to be after record is saved to the database.
		*
		* @param {Object} context
		* @param {Record} context.newRecord - New record
		* @param {Record} context.oldRecord - Old record
		* @param {string} context.type - Trigger type
		* @Since 2015.2
		*/
	function afterSubmit(context) {
		let rec = context.newRecord;
		let transit = rec.getValue({fieldId: 'custbody_mhi_transit_invoice'});
		if (!transit) {
			return true;
		}
		let ct = rec.getLineCount({sublistId: 'item'});
		let notTransit = false;
		let items = '';
		for (let i = 0; i < ct; i++) {
			let price = rec.getSublistText({sublistId: 'item', fieldId: 'price', line: i});
			if (price !== 'Transit Price') {
				notTransit = true;
				items += rec.getSublistText({sublistId: 'item', fieldId: 'item', line: i})+'\n';
				log.error('l','SO: '+rec.getValue({fieldId: 'tranid'})+', ID '+rec.id+', line '+i+' price '+price);
				
			}
		}
		if (!notTransit) {
			return true;
		}

		let user = runtime.getCurrentUser();
		let content = 'SO: '+rec.getValue({fieldId: 'tranid'})+', ID '+rec.id+'\n';
		content += 'Trigger context: '+runtime.executionContext+'\n';
		content += 'User: '+user.name+'\n';
		content += 'Email: '+user.email+'\n';
		content += 'Role: '+user.roleId+'\n';
		content += 'Center: '+user.roleCenter+'\n';
		content += 'Items: '+items+'\n';

		let dt = new Date();
		let day = dt.getDate();
		let mon = dt.getMonth() + 1;
		if (mon < 10) {
			mon = '0'+mon;
		}
		if (day < 10) {
			day = '0'+day;
		}

		let date = dt.getFullYear()+'-'+mon+'-'+day;

		let fileId = 0;
		search.create({
			type: 'file',
			filters: [
				{name: 'name', operator: 'is', values: ['Transit_Sales_Orders_'+date+'.txt']},
				{name: 'folder', operator: 'anyof', values: [767097]}
			]
		}).run().each(function(res) {
			fileId = res.id;
			return true;
		});
		log.audit('l','got file id '+fileId);
		try {
			let fileObj = {};
			if (fileId) {
				fileObj = file.load({id: fileId});
				content = fileObj.getContents() + '\n'+content; 			
			}
			fileObj = file.create({
				name: 'Transit_Sales_Orders_'+date+'.txt',
				fileType: file.Type.PLAINTEXT,
				contents: content,
				folder: 767097,
			});
			fileId = fileObj.save();
			log.error('l','saved file id '+fileId);
		} catch (e) {
			log.error('l','save file error '+e.message);
		}
		
		return true;
	}

	return {
		afterSubmit: afterSubmit
	};

});
