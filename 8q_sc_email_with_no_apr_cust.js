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
define(['N/search','N/record','N/email','N/runtime','N/url','N/file'],function(search,record,email,runtime,url,file) {

	function execute(context) {
		const senderId = runtime.getCurrentScript().getParameter({name: 'custscript_8q_no_apr_email_from'});
		const recipientId = runtime.getCurrentScript().getParameter({name: 'custscript_8q_no_apr_email_to'});
		if (!senderId || !recipientId) {
			return true;
		}
		let list = '';
		let ct = 0;
		let sent = 1;
		search.create({
			type: 'customer',
			filters: [
				{name: 'cseg1', operator: 'anyof', values: ['@NONE@']}
			],
			columns: [
				{name: 'entityid'},
				{name: 'companyname'}
			]
		}).run().each(function(res) {
			let custURL = url.resolveRecord({
				recordType: 'customer',
				recordId: res.id,
				isEditMode: true
			});

			let name = res.getValue({name: 'companyname'});
			if (name) {
				name = ' - '+name;
			}
			
			list += '<a href="https://6827316.app.netsuite.com'+custURL+'">'+res.getValue({name: 'entityid'})+name+'</a><br />';
			ct++;
			if (ct > 49) {
				sendEmail(list,senderId,recipientId,sent);
				sent++;
				ct = 0;
				list = '';
			}
			return true;
		});
		if (list) {
			sendEmail(list,senderId,recipientId,sent);
		}
	}

	function sendEmail(list,senderId,recipientId,sent) {
		try {
			email.send({
				author: senderId,
				recipients: recipientId,
				subject: 'Customers without APR - '+sent,
				body: 'Below is a list of Customers without an Area of Prime Responsibility. There are 50 per email so the email is not '+
					'too large. They are in the body of the email so they may be links.<br /><br />'+list,
			});
			log.error('l','sent '+sent);
		} catch (e) {
			log.error('l','email error '+e.message);
		}
	}

	return {
		execute: execute
	};

});
