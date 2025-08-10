/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 
	Purpose : 
*/
define(['N/search','N/file','N/email'],function(search,file,email) {

	function execute(context) {
		let dt = new Date();
		dt.setDate(dt.getDate()-1);
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
		log.audit('l','fileName Transit_Sales_Orders_'+date+'.txt'+', id '+fileId);	
		let found = '';
		search.create({
			type: 'salesorder',
			filters: [
				{name: 'custbody_mhi_transit_invoice',operator: 'is',values: ['T']},
				{name: 'mainline',operator: 'is',values: ['F']},
				{name: 'pricelevel',operator: 'noneof',values: ['8']},
				{name: 'taxline',operator: 'is',values: ['F']},
				{name: 'shipping',operator: 'is',values: ['F']},
				{name: 'type','join': 'item',operator: 'anyof',values: ['InvtPart']}
			],
			columns: [
				{name: 'internalid'},
				{name: 'tranid'},
				{name: 'total'},
				{name: 'pricelevel'},
				{name: 'trandate'}
			],
		}).run().each(function(res) {
			found += res.getValue({name: 'trandate'})+', '+
				res.getValue({name: 'internalid'})+', '+
				res.getValue({name: 'tranid'})+', '+
				res.getValue({name: 'total'})+', '+
				res.getValue({name: 'pricelevel'})+'<br />';
			return true;
		});
		if (found) {
			found = '<br /><br />Sales Orders with wrong Price Level created or edited an any date:<br />'+found
		}
		let noFile = (fileId) ? '' : ' No File';
		let values = {
			author: 11866,
			recipients: ['mmcdonald@8quanta.com','deweyd@swagoe.com','joeyk@swagoe.com','stacyn@swagoe.com'],
			subject: 'SW SO Transit - wrong Price Level '+date+noFile,
			body: 'Attached file has information about Transit Sales Orders, created or edited '+date+',<br />'+
						'with items not having Price Level of Transit Price.<br /><br />If no file is attached, there were none.'+found
		};			
		if (fileId) {
			try {
				let info = file.load({id: fileId});
				values.attachments = [info];
			} catch (e) {
				log.error('l','load file id '+fileId+', error '+e.message);
			}
			
		}

		/*
		// delete file from day before yesterday
		dt = new Date();
		dt.setDate(dt.getDate()-2);
		day = dt.getDate();
		mo = dt.getMonth() + 1;
		date = mo+'-'+dt.getDate()+'-'+dt.getFullYear();
		fileId = 0;
		search.create({
			type: 'file',
			filters: [
				{name: 'name', operator: 'is', values: ['Transit_Sales_Orders_'+date+'.txt']},
				{name: 'folder', operator: 'anyof', values: [90911]}
			]
		}).run().each(function(res) {
			fileId = res.id;
			return true;
		});
		if (fileId) {
			file.delete({id: fileId});
		}
		*/

		email.send(values);
	}

	return {
		execute: execute
	};

});
