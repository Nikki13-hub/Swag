/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/*
	Author : Fred McIntyre, 8Quanta fred@8quanta.com
	Created Date : 
	Purpose : custitem_mhi_rim_prefstock_dfw_gm
*/

define(['N/search','N/record'],function(search,record) {

	/**
		* Function definition to be triggered before record is loaded.
		*
		* @param {Object} context
		* @param {Record} context.newRecord - New record
		* @param {Record} context.oldRecord - Old record
		* @param {string} context.type - Trigger type
		* @Since 2015.2
		*/
	function afterSubmit(context) {
		let rec = context.newRecord;

		let locations = {
			GM: {
				102: 'custitem_mhi_rim_prefstock_dfw_gm', // Dallas Warehouse
				90: 'custitem_mhi_rim_preferred_stock_hou_g',  // Houston Warehouse
				50: 'custitem_preferred_stock_phx_gm', // Phoenix Warehouse
				49: 'custitem_preferred_stock_ran_gm', // Rancho Warehouse
			},
			FORD: {
				87: 'custitem_mhi_preferred_stock_atl_ford', // Atlanta Warehouse
				102: 'custitem_mhi_preferred_stock_dfw_ford', // Dallas Warehouse
				90: 'custitem_mhi_preferred_stock_hou_ford', // Houston Warehouse
				93: 'custitem_mhi_preferred_stock_mem_ford', // Memphis Warehouse
				50: 'custitem_preferred_stock_phx_ford', // Phoenix Warehouse
				49: 'custitem_preferred_stock_ran_ford', // Rancho Warehouse
		
			}
		};
		let itemId = rec.getValue({fieldId: 'item'});
		let item = search.lookupFields({
			type: 'item',
			id: itemId,
			columns: ['type','custitem_8q_gm','custitem_8q_ford']
		});
		let itemType = getItemType(item.type[0].value);
		let gmFord = (item.custitem_8q_gm) ? 'GM' : (item.custitem_8q_ford) ? 'FORD' : '';
		if (!gmFord || !itemType) {
			return true;
		}
		let fieldId = locations[gmFord][rec.getValue({fieldId: 'location'})];
		if (!fieldId) {
			return true;
		}
		try {
			let values = {}
			values[fieldId] = rec.getValue({fieldId: 'preferredstocklevel'});
			record.submitFields({
				type: itemType,
				id: itemId,
				values: values
			});
		} catch (e) {
			log.error('l','error '+e.message);
			let itemRec = record.load({type: itemType, id: itemId});
			itemRec.setValue({fieldId: fieldId, value: rec.getValue({fieldId: 'preferredstocklevel'}) });
			itemRec.save();
		}
		return true;
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
		afterSubmit: afterSubmit
	};

});
