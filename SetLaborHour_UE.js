/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/ui/serverWidget'],

function(record, search, ui) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
        var rec = scriptContext.newRecord;
        if (scriptContext.type !== scriptContext.UserEventType.CREATE)      return;
        try {
            soId = rec.getValue({fieldId: 'createdfrom'});
            tranDate = rec.getValue({fieldId: 'trandate'});
            locId = rec.getValue({fieldId: 'custbody_8q_fulfillment_f'});
            log.debug('afterSubmit', scriptContext.type+'>>> soId='+soId+', locId='+locId);

            if( isEmpty(soId) )     return;
            //Get Day Labor Hour
            var arrFilter = [], arrColumns = []; 
            arrFilter.push(search.createFilter({name: 'createdfrom', operator: 'anyof', values: [soId]}));
            arrFilter.push(search.createFilter({name: 'mainline', operator: search.Operator.IS, values: ['T']}));
            arrColumns.push(search.createColumn({name: "datecreated"}));
            arrColumns.push(search.createColumn({name: "lastmodifieddate"}));
            arrColumns.push(search.createColumn({name: 'status'}));
        
            var arrResult = runSearch(search, 'itemfulfillment', null, arrFilter, arrColumns);
            var laborHr = 0;
            if( arrResult ){
                arrResult.each(function(objResult){
                    var time1 = objResult.getValue('datecreated');
                    var time2 = objResult.getValue('lastmodifieddate');
                    var status = objResult.getValue('status');
                    laborHr += ((new Date(time2).getTime())-(new Date(time1).getTime()))/1000/60/60;
                    log.debug('afterSubmit', status+'>>> '+time1+', '+time2);
                    return true;
                });
            }

            if( laborHr )      laborHr = Math.round(laborHr*1000)/1000;

            //Get Week Labor Hour
            tranDObj = new Date(tranDate);
            var day = tranDObj.getDay(), diff = tranDObj.getDate() - day + (day == 0 ? -6 : 1);
            sDateObj = new Date(tranDObj.setDate(diff));
            eDateObj = new Date(tranDObj.setDate(diff+6));
            sDate = (sDateObj.getMonth()+1) + '/' + sDateObj.getDate() + '/' + sDateObj.getFullYear();
            eDate = (eDateObj.getMonth()+1) + '/' + eDateObj.getDate() + '/' + eDateObj.getFullYear();
            log.debug('afterSubmit', 'Week Date>>> '+sDate+', '+eDate);

            var arrFilter = [], arrColumns = []; 
            arrFilter.push(search.createFilter({name: 'mainline', operator: search.Operator.IS, values: ['T']}));
            arrFilter.push(search.createFilter({name: 'trandate', operator: 'within', values: [sDate, eDate]}));
            arrFilter.push(search.createFilter({name: 'custbody_8q_fulfillment_f', operator: 'anyof', values: [locId]}));
            arrColumns.push(search.createColumn({name: "tranid"}));
            arrColumns.push(search.createColumn({name: "trandate", sort: search.Sort.ASC }));
            arrColumns.push(search.createColumn({name: 'custbody_laborhour'}));
        
            var arrResult = runSearch(search, 'invoice', null, arrFilter, arrColumns);
            var wLaborHr = laborHr;
            var arrInvoices = [], preDate;
            if( arrResult ){
                arrResult.each(function(objResult){
                    var tranDate = objResult.getValue('trandate');
                    var tranId = objResult.getValue('tranid');
                    var hour = objResult.getValue('custbody_laborhour')||0;
                    wLaborHr += Number(hour);
                    if( preDate != tranDate ) {
                        arrInvoices.push(objResult.id);
                        preDate = tranDate;
                    }
                    return true;
                });
            }
            if( wLaborHr )      wLaborHr = parseInt(Number(wLaborHr)*1000)/1000;
            log.debug('afterSubmit', 'wLaborHr='+wLaborHr+', invoices='+arrInvoices.length);
            record.submitFields({
                type: 'invoice',
                id: rec.id,
                values: {
                    custbody_laborhour: laborHr
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });

            for(var i in arrInvoices)
                record.submitFields({
                    type: 'invoice',
                    id: arrInvoices[i],
                    values: {
                        custbody_week_laborhour: wLaborHr,
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });

        } catch(e){
            log.debug('Erron in afterSubmit', JSON.stringify(e));
        }

    }

    function isEmpty(value) {
        var bResult = false;
        if (
            value === null ||
            value === 'null' ||
            value === undefined ||
            value === '' ||
            value.length <= 0
        ) {
            bResult = true;
        }
        return bResult;
    }

    function runSearch(search, recType, searchId, filters, columns)
	{
		var srchObj = null;
		if(searchId == null || searchId == ''){
			srchObj = search.create({type : recType, filters: filters, columns: columns});
			//log.debug('runSearch', 'srchObj ='+JSON.stringify(srchObj));
		}else
		{
			srchObj = search.load({id : searchId});
			var existFilters = srchObj.filters;
			var existColumns = srchObj.columns;
			
			existFilters = (existFilters == null || existFilters == '') ? new Array() : existFilters;
			existColumns = (existColumns == null || existColumns == '') ? new Array() : existColumns;
			if(filters != null && filters != '')
			{
				for(var idx=0; idx < filters.length; idx++)
					existFilters.push(filters[idx]);
			}
			if(columns != null && columns != '')
			{
				for(var idx=0; idx < columns.length; idx++)
					existColumns.push(columns[idx]);
			}
			
			srchObj.filters = existFilters;
			srchObj.columns = existColumns;
		}
		
		var resultSet = srchObj.run();

		return resultSet;
	}

    return {
        //beforeLoad: beforeLoad,
        //beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
