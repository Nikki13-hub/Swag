/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 4/18/2024
	Purpose : Set year/month and accounting period to set periods before which users cannot edit transactions
*/

define(['N/ui/serverWidget','N/search','N/record'],
function(serverWidget,search,record) {

	/**
		* Definition of the Suitelet script trigger point.
		*
		* @param {Object} context
		* @param {ServerRequest} context.request - Encapsulation of the incoming request
		* @param {ServerResponse} context.response - Encapsulation of the Suitelet response
		* @Since 2015.2
		*/
	function onRequest(context) {

		if (context.request.method === 'GET') {
			createPage(context);

		//-------- end GET --------//
		} else {
			record.submitFields({
				type: 'customrecord_8q_upc_settings',
				id: 1,
				values: {
					custrecord_8q_upc_user_closed_period: context.request.parameters.custpage_period,
					custrecord_8q_upc_user_closed_year: context.request.parameters.custpage_year,
					custrecord_8q_upc_user_closed_month: context.request.parameters.custpage_month
				}
			});
			createPage(context);
		}

		function createPage(context) {
			
			let opts = search.lookupFields({
				type: 'customrecord_8q_upc_settings',
				id: 1,
				columns: [
					'custrecord_8q_upc_user_closed_period',
					'custrecord_8q_upc_user_closed_year',
					'custrecord_8q_upc_user_closed_month'
				]
			});
			if (opts.custrecord_8q_upc_user_closed_period === undefined) {
				let rec = record.create({type: 'customrecord_8q_upc_settings'});
				rec.setValue({fieldId: 'custrecord_8q_upc_user_closed_period', value: 1});
				let id = rec.save();
				log.error('l','id '+id);
			}
			let form = serverWidget.createForm({
				title: 'Set User Periods Closed'
			});

			form.addFieldGroup({
				id : 'fieldgroupid',
				label : 'Make Selections'
			});
			
			let field = form.addField({
				id: 'custpage_instr',
				type: serverWidget.FieldType.INLINEHTML,
				label: 'instr'
			});
			field.updateLayoutType({
				layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
			});
			field.defaultValue = '<div style="font-size:13px;width:500px; color:#6f6f6f;">'+
				'Non-Administrator users will not be able to edit, delete, nor create transactions '+
				'where the Posting Period is on or before the period selected, or the transaction date '+
				'is on or before the year and month selected.</div>'
			
			field = form.addField({
				id: 'custpage_period',
				type: serverWidget.FieldType.SELECT,
				label: 'Posting Period',
				container: 'fieldgroupid'
			});
			field.updateLayoutType({
				layoutType: serverWidget.FieldLayoutType.STARTROW
			});
			field.helpText = '<p>Select the period before which non-Administrator users may not edit/delete/create transactions.</p>';

			let date = new Date().getTime();
			let startYear = '';
			let endYear = '';
			let startDateCol = search.createColumn({name:'startdate', sort: search.Sort.ASC});
			search.create({
				type:'accountingperiod',
				filters:[
					{name:'closed',operator:'is',values:['F']},
					{name:'isquarter',operator:'is',values:['F']},
					{name:'isyear',operator:'is',values:['F']}
				],
				columns:[
					{name:'periodname'},
					{name:'internalid'},
					startDateCol,
					{name:'enddate'}
				]
			}).run().each(function(res) {
				let startDate = new Date(res.getValue({name: 'startdate'})).getTime();
				if (!startYear) {
					res.getValue({name: 'startdate'}).match(/(\d+)$/);
					startYear = Number(RegExp.$1);
				}
				res.getValue({name: 'enddate'}).match(/(\d+)$/);
				endYear = Number(RegExp.$1);
				field.addSelectOption({
					value: res.getValue({name: 'internalid'}),
					text: res.getValue({name: 'periodname'}),
					isSelected: opts.custrecord_8q_upc_user_closed_period == res.getValue({name: 'internalid'})
				});
				return true;
			});
			field = form.addField({
				id: 'custpage_year',
				type: serverWidget.FieldType.SELECT,
				label: 'Year',
				container: 'fieldgroupid'
			});
			field.updateLayoutType({
				layoutType: serverWidget.FieldLayoutType.MIDROW
			});
			field.helpText = '<p>Select the year for the month before which non-Administrator users may not edit/delete/create transactions.</p>';
			for (let i = startYear; i <= endYear; i++) {
				field.addSelectOption({
					value: i,
					text: i,
					isSelected: Number(opts.custrecord_8q_upc_user_closed_year) === i
				});
			}

			let months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
			field = form.addField({
				id: 'custpage_month',
				type: serverWidget.FieldType.SELECT,
				label: 'Month',
				container: 'fieldgroupid'
			});
			field.updateLayoutType({
				layoutType: serverWidget.FieldLayoutType.ENDROW
			});
			field.helpText = '<p>Select the month of selected Year before which non-Administrator users may not edit/delete/create transactions.</p>';
			for (let i = 0; i < months.length; i++) {
				field.addSelectOption({
					value: i,
					text: months[i],
					isSelected: Number(opts.custrecord_8q_upc_user_closed_month) === i
				});
			}

			form.addSubmitButton();
			context.response.writePage(form);
			return true;

		}
	}

	return {
		onRequest: onRequest
	};

});
