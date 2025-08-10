/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/search', 'N/record', 'N/runtime'],
function (log, search, record, runtime) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */

    function execute(scriptContext) {
    	try {
			var arrResult = runSearch(search, 'invoice', 'customsearch10598', null, null);
            log.debug('Search Invoice', 'len='+arrResult.length);
            var preSDate, wLaborHr = 0;
            for(var i=0;i<arrResult.length;i++) {
                var soId = arrResult[i].getValue('createdfrom');
                var tranDate = arrResult[i].getValue('trandate');
                var laborHr = Number(arrResult[i].getValue('custbody_laborhour')||0);
                var oldWLaborHr = Number(arrResult[i].getValue('custbody_week_laborhour')||0);
                var updateFlds = {};
                log.debug('Invoice Info: '+arrResult[i].id, 'soId='+soId+', date='+tranDate+', laborHr='+laborHr+', oldWLaborHr='+oldWLaborHr);

                if( !laborHr && !isEmpty(soId) ) {
                    var arrFilter = [], arrColumns = [];
                    arrFilter.push(search.createFilter({name: 'createdfrom', operator: 'anyof', values: [soId]}));
                    arrFilter.push(search.createFilter({name: 'mainline', operator: search.Operator.IS, values: ['T']}));
                    arrColumns.push(search.createColumn({name: "datecreated"}));
                    arrColumns.push(search.createColumn({name: "lastmodifieddate"}));
                    arrColumns.push(search.createColumn({name: 'status'}));
                    var arrIFResult = runSearch(search, 'itemfulfillment', null, arrFilter, arrColumns);
                    for(var j=0;j<arrIFResult.length;j++){
                        var time1 = arrIFResult[j].getValue('datecreated');
                        var time2 = arrIFResult[j].getValue('lastmodifieddate');
                        laborHr += ((new Date(time2).getTime())-(new Date(time1).getTime()))/1000/60/60;
                        log.debug('IF Info', time1+', '+time2);
                    }
                    if( laborHr ) {
                        laborHr = Math.round(laborHr*1000)/1000;
                        updateFlds['custbody_laborhour'] = laborHr;
                    }
                }
                
                //Get Week Labor Hour
                /*tranDObj = new Date(tranDate);
                var day = tranDObj.getDay(), diff = tranDObj.getDate() - day + (day == 0 ? -6 : 1);
                sDateObj = new Date(tranDObj.setDate(diff));
                eDateObj = new Date(tranDObj.setDate(diff+6));
                sDate = (sDateObj.getMonth()+1) + '/' + sDateObj.getDate() + '/' + sDateObj.getFullYear();
                eDate = (eDateObj.getMonth()+1) + '/' + eDateObj.getDate() + '/' + eDateObj.getFullYear();
                if( preSDate != sDate ){
                    wLaborHr = 0;
                    preSDate = sDate;
                }
                wLaborHr += Number(laborHr);
                log.debug('Week Hour: '+wLaborHr, 'sDate='+sDate+', eDate='+eDate+', preSDate='+preSDate);
                if( wLaborHr != oldWLaborHr )       updateFlds['custbody_week_laborhour'] = wLaborHr;*/
                log.debug('updateFlds', JSON.stringify(updateFlds));
                if( !isEmpty(updateFlds))
                    record.submitFields({
                        type: 'invoice',
                        id: arrResult[i].id,
                        values: updateFlds,
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
            }    
        } catch(e){
            log.debug('Error In updateing invoice', e.toString());
        }

        return;
    }

    function runSearch(search, recType, searchId, filters, columns) {
        var retList = new Array();
        var srchObj = null;
        if (searchId == null || searchId == '')
            srchObj = search.create({ type: recType, filters: filters, columns: columns });
        else {
            srchObj = search.load({ id: searchId });
            var existFilters = srchObj.filters;
            var existColumns = srchObj.columns;

            existFilters = (existFilters == null || existFilters == '') ? new Array() : existFilters;
            existColumns = (existColumns == null || existColumns == '') ? new Array() : existColumns;
            if (filters != null && filters != '') {
                for (var idx = 0; idx < filters.length; idx++)
                    existFilters.push(filters[idx]);
            }
            if (columns != null && columns != '') {
                for (var idx = 0; idx < columns.length; idx++)
                    existColumns.push(columns[idx]);
            }

            srchObj.filters = existFilters;
            srchObj.columns = existColumns;
        }

        var resultSet = srchObj.run();
        var startPos = 0, endPos = 1000;
        while (startPos <= 10000) {
            var options = new Object();
            options.start = startPos;
            options.end = endPos;
            var currList = resultSet.getRange(options);
            if (currList == null || currList.length <= 0)
                break;
            if (retList == null)
                retList = currList;
            else
                retList = retList.concat(currList);

            if (currList.length < 1000)
                break;

            startPos += 1000;
            endPos += 1000;
        }

        return retList;
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

    return {
        execute: execute
    };
    
});
