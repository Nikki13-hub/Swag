/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 4/8/2024
	Purpose : Make sure item has standard cost at from location
*/
define(['N/search','N/ui/dialog','N/url','N/record'],function(search,dialog,url,record) {

	let fromLocationId = 0;
	let fromLocationName = '';
	function pageInit(context) {
		let rec = context.currentRecord;
		fromLocationId = rec.getValue({fieldId: 'location'});
		fromLocationName = rec.getText({fieldId: 'location'});
		return true;
	}
	/**
		* Function to be executed when field is changed.
		*
		* @param {Object} context
		* @param {Record} context.currentRecord - Current form record
		* @param {string} context.sublistId - Sublist name
		* @param {string} context.fieldId - Field name
		* @param {number} context.line - Line number. Will be undefined if not a sublist or matrix field
		* @param {number} context.columnNum - Line number. Will be undefined if not a matrix field
		*
		* @since 2015.2
		*/
	function fieldChanged(context) {
		let rec = context.currentRecord;
		if (context.fieldId === 'location') {
			fromLocationId = rec.getValue({fieldId: 'location'});
			fromLocationName = rec.getText({fieldId: 'location'});
		}

		return true;
	}

	/**
		* Validation function to be executed when sublist line is committed.
		*
		* @param {Object} context
		* @param {Record} context.currentRecord - Current form record
		* @param {string} context.sublistId - Sublist name
		*
		* @returns {boolean} Return true if sublist line is valid
		*
		* @since 2015.2
		*/
	function validateLine(context) {
		let rec = context.currentRecord;
		let itemId = 0;
		if (rec.type === 'inventorytransfer') {
			itemId = rec.getCurrentSublistValue({sublistId: 'inventory', fieldId: 'item'});
		} else {
			itemId = rec.getCurrentSublistValue({sublistId: 'item', fieldId: 'item'});
		}
		if (!itemId || !fromLocationId) {
			return true;
		}
		let cost = getCost(itemId);
		if (!cost) {
			let itemName = '';
			let itemType = '';
			// inventorytransfer has different field and sublist names than Transfer Order and Intercompany Transfer Order
			// Also doesn't have item type on the ine level
			if (rec.type === 'inventorytransfer') {
				itemName = rec.getCurrentSublistText({sublistId: 'inventory', fieldId: 'item'});
				itemType = search.lookupFields({
					type: 'item',
					id: itemId,
					columns: ['type']
				}).type[0].value;
			} else {
				itemName = rec.getCurrentSublistText({sublistId: 'item', fieldId: 'item'});
				itemType = rec.getCurrentSublistValue({sublistId: 'item', fieldId: 'itemtype'});
			}

			itemType = getItemType(itemType);

			let itemURL = url.resolveRecord({
				recordType: itemType,
				recordId: itemId
			});

			let msg = `
The item ${itemName} does not have a Standard Cost set for the From Location ${fromLocationName}.<br />
<a href="/app/common/item/itemlocationconfiguration.nl?item=${itemId}&location=${fromLocationId}" target="_blank">Set Standard Cost</a> OR 
<a href="${itemURL}" target="_blank">Go To Item</a><br />
Links open in new tab/window.<br /><br />
After setting a Standard Cost for ${fromLocationName} just click Add/OK again.
`;
			dialog.alert({
				message: msg
			});
			return false;
		}
		return true;
	}

	function getCost(itemId) {
		let locConfigId = 0;
		let cost = 0;
		search.create({
			type:'itemlocationconfiguration',
			filters:[
				{name:'item',operator:'anyof',values:[itemId]},
				{name:'location',operator:'is',values:[fromLocationId]}
			]
		}).run().each(function(res) {
			locConfigId = res.id;
		});
	
		if (locConfigId) {
			cost = search.lookupFields({
				type:'itemlocationconfiguration',
				id: locConfigId,
				columns: ['cost']
			}).cost;
		}
		return Number(cost);
	}
	
	function getItemType(type) {
		switch (type.toLowerCase()) {
			case 'invtpart':
				return record.Type.INVENTORY_ITEM;
			case 'description':
				return record.Type.DESCRIPTION_ITEM;
			case 'assembly':
				return record.Type.ASSEMBLY_ITEM;
			case 'discount':
				return record.Type.DISCOUNT_ITEM;
			case 'group':
				return record.Type.ITEM_GROUP;
			case 'markup':
				return record.Type.MARKUP_ITEM;
			case 'noninvtpart':
				return record.Type.NON_INVENTORY_ITEM;
			case 'othcharge':
				return record.Type.OTHER_CHARGE_ITEM;
			case 'payment':
				return record.Type.PAYMENT_ITEM;
			case 'service':
				return record.Type.SERVICE_ITEM;
			case 'subtotal':
				return record.Type.SUBTOTAL_ITEM;
			case 'giftcert':
				return record.Type.GIFT_CERTIFICATE_ITEM;
			case 'dwnlditem':
				return record.Type.DOWNLOAD_ITEM;
			case 'kit':
				return record.Type.KIT_ITEM;
			default:
				return type.toLowerCase();
		}
	}

	return {
		fieldChanged: fieldChanged,
		validateLine: validateLine,
		pageInit: pageInit
	};

});
