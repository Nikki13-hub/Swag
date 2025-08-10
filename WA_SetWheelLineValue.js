/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */

define(['N/search', 'N/record', 'N/runtime'], (search, record, runtime) => {

  /**
     * Defines the WorkflowAction script trigger point.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
     * @param {string} scriptContext.type - Event type
     * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
     * @since 2016.1
    */
    const onAction = (scriptContext) => {

      try{

        const scriptObj = runtime.getCurrentScript();
        const recordObj = scriptContext.newRecord;
        log.debug('isDynamic?', recordObj.isDynamic);

        const sublistId = 'item';
        const mountBalanceItem = 63948;
        const lineCount = recordObj.getLineCount({sublistId});
        let packageNum;

        const aLineNo = recordObj.findSublistLineWithValue({ 
          sublistId, 
          fieldId: 'item', 
          value: mountBalanceItem
        });
        log.debug('aLineNo', aLineNo);

        if( aLineNo >= 0 ) {

          // get package number
          packageNum = recordObj.getSublistValue({ sublistId, fieldId: 'custcol_nsts_lpo_package_num', line: aLineNo });
          log.debug('Package Num', packageNum);

        }

        if(isEmpty(packageNum)) return;

        for (let line = 0; line < lineCount; line++) {

          let wheelToWave = false;
          const priceLevel = recordObj.getSublistValue({ sublistId, fieldId: 'price', line });
          const linePackageNum = recordObj.getSublistValue({ sublistId, fieldId: 'custcol_nsts_lpo_package_num', line });
          
          if(linePackageNum == packageNum) { // Price Level = custom & Package Num is not null

            wheelToWave = true;

          }

          recordObj.selectLine({ sublistId, line});
          recordObj.setCurrentSublistValue({
              sublistId,
              fieldId: 'custcol_wheel_line_to_wave',
              value: wheelToWave,
              ignoreFieldChange: true
          });
          recordObj.commitLine({ sublistId});

        }

      } catch(ex) {

        log.error({title: ex.name,details: ex.message});

      }


    }

    function isEmpty(stValue){
        return ((stValue === '' || stValue == null || stValue == undefined)
        || (stValue.constructor === Array && stValue.length == 0)
        || (stValue.constructor === Object && (function(v){for(var k in v)return false;return true;})(stValue)));
    }


    


  
  return { onAction };


});