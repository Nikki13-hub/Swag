/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/record'], function(record) {
    function beforeSubmit(context) {
        if (context.type === context.UserEventType.EDIT || context.type === context.UserEventType.XEDIT){
            //processedEcomm(context);
            checkLineAdded(context)
            return;
        }
        var objRecord = context.newRecord;
        //var backOrder = objRecord.getValue('custbody_so_backorder');
		
        var lineCount = objRecord.getLineCount({sublistId:'item'});
        var field = objRecord.getSublistFields({
    		sublistId: 'item'
		});

        for (var l = 0; l < lineCount; l++) {
            log.error('here ', l);
            var line_item_backorder = objRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantityavailable',
                line: l
            });
          	log.debug(line_item_backorder);
          	log.error('backorder', l+" "+line_item_backorder);
            if(line_item_backorder===0){
                /*objRecord.setValue({
                    fieldId: 'custbody_so_backorder',
                    value: true
                });*/
              	log.error('In the if statement ', l);
                var line_item_backorder = objRecord.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_so_backorder',
                line: l,
                value: true
            });
            }
          var so_backorder = objRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_so_backorder',
                line: l
            });
          log.error('value: ', l+ " "+so_backorder);
        }
    }

   function checkLineAdded(context){
		var objRecordNew = context.newRecord;
     	var objRecordOld = context.oldRecord;
     	var lineCountOld = objRecordOld.getLineCount({sublistId:'item'});
     	var lineCountNew = objRecordNew.getLineCount({sublistId:'item'});
     	if(lineCountNew>lineCountOld){
          for (var l = lineCountOld; l < lineCountNew; l++) {
            log.debug('added lines ');
            var line_item_backorder = objRecordNew.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantityavailable',
                line: l
            });
          	log.debug(line_item_backorder);
            if(line_item_backorder===0){
                var line_item_backorder = objRecordNew.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_so_backorder',
                line: l,
                value: true
            });
            }
        }
        }
   }


    return {
        beforeSubmit: beforeSubmit
    };
});

