/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */

define(['N/record', 'N/ui/serverWidget', 'N/format'],
    function(record, serverWidget, format) {
		
		function beforeLoad(context) {
			if (context.type === 'create') {
				var newRec = context.newRecord;
				var cuRef = context.newRecord.getText('entity')||'';
				if (cuRef.includes('LPO')) {
					log.debug('cuRef','Trigger PO Match');
					var poRef = context.newRecord.getValue('otherrefnum');
					var createdFrom = context.newRecord.getText('createdfrom');
					var splitA = createdFrom.split('#');
					log.debug('CF',splitA);
					var hideFld = context.form.addField({
						id:'custpage_auto_populate',
						label:'not shown - hidden',
						type: serverWidget.FieldType.INLINEHTML
					});
					var scr = "";
					scr += 'jQuery(\'[id^="apply_Transaction_OTHERREFNUM"]\').val("'+poRef+'").change()';
					hideFld.defaultValue = "<script>jQuery(function($){require([], function(){" + scr + ";})})</script>"
					//context.newRecord.setValue('autoapply','T');
					//context.newRecord.setValue('custbody_mhi_swa_so_inv', createdFrom);
				}
				else {
					var hideFld = context.form.addField({
						id:'custpage_auto_populate',
						label:'not shown - hidden',
						type: serverWidget.FieldType.INLINEHTML
					});
					var scr = "";
					scr += 'jQuery(\'[id^="apply_Transaction_OTHERREFNUM"]\').val("").trigger("change")';
					hideFld.defaultValue = "<script>jQuery(function($){require([], function(){" + scr + ";})})</script>"
					context.newRecord.setValue('autoapply','F');
					
				}
			return true;
			}
		return true;
		}
		
        return {
			beforeLoad: beforeLoad
        };
    }
);