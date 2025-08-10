/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */

define(['N/record', 'N/log'], function (record, log) {

  const onAction = (scriptContext) => {
    try {
      const recordObj = scriptContext.newRecord;
      const sublistId = 'item';
      const mountBalanceItem = 63948; // Replace with actual M&B item ID
      const lineCount = recordObj.getLineCount({ sublistId });

      let packageNum = '';
      let mountBalanceLine = -1;

      // STEP 1: Find the M&B line and get the Package ID
      mountBalanceLine = recordObj.findSublistLineWithValue({
        sublistId: sublistId,
        fieldId: 'item',
        value: mountBalanceItem
      });

      if (mountBalanceLine < 0) {
        log.debug('Mount & Balance line not found, exiting script.');
        return;
      }

      packageNum = recordObj.getSublistValue({
        sublistId: sublistId,
        fieldId: 'custcol_nsts_lpo_package_num',
        line: mountBalanceLine
      });

      if (!packageNum) {
        log.debug('Package number not found on M&B line, exiting script.');
        return;
      }

      // STEP 2: Set wheel_line_to_wave = true for all lines with the same package
      for (let line = 0; line < lineCount; line++) {
        const linePackageNum = recordObj.getSublistValue({
          sublistId,
          fieldId: 'custcol_nsts_lpo_package_num',
          line
        });

        const isSamePackage = (linePackageNum === packageNum);

        recordObj.selectLine({ sublistId, line });
        recordObj.setCurrentSublistValue({
          sublistId,
          fieldId: 'custcol_wheel_line_to_wave',
          value: isSamePackage,
          ignoreFieldChange: true
        });
        recordObj.commitLine({ sublistId });
      }

      // STEP 3: Find a source LPO Txn ID from any matching wheel line
      let sharedLpoTxnId = null;
      for (let line = 0; line < lineCount; line++) {
        const linePackage = recordObj.getSublistValue({
          sublistId,
          fieldId: 'custcol_nsts_lpo_package_num',
          line
        });

        const wheelToWave = recordObj.getSublistValue({
          sublistId,
          fieldId: 'custcol_wheel_line_to_wave',
          line
        });

        const wheelLpoTxnId = recordObj.getSublistValue({
          sublistId,
          fieldId: 'custcol_8q_lpo_txn_id',
          line
        });

        if (linePackage === packageNum && wheelToWave && wheelLpoTxnId) {
          sharedLpoTxnId = wheelLpoTxnId;
          break;
        }
      }

      if (!sharedLpoTxnId) {
        log.debug('No source LPO Transaction ID found for package:', packageNum);
        return;
      }

      // STEP 4: Apply the shared LPO Txn ID to all wheel-to-wave lines in same package that are missing it
      for (let line = 0; line < lineCount; line++) {
        const linePackage = recordObj.getSublistValue({
          sublistId,
          fieldId: 'custcol_nsts_lpo_package_num',
          line
        });

        const wheelToWave = recordObj.getSublistValue({
          sublistId,
          fieldId: 'custcol_wheel_line_to_wave',
          line
        });

        const existingLpoTxnId = recordObj.getSublistValue({
          sublistId,
          fieldId: 'custcol_8q_lpo_txn_id',
          line
        });

        if (linePackage === packageNum && wheelToWave && !existingLpoTxnId) {
          log.debug(`Setting missing LPO Txn ID for line ${line}: ${sharedLpoTxnId}`);
          recordObj.selectLine({ sublistId, line });
          recordObj.setCurrentSublistValue({
            sublistId,
            fieldId: 'custcol_8q_lpo_txn_id',
            value: sharedLpoTxnId,
            ignoreFieldChange: true
          });
          recordObj.commitLine({ sublistId });
        }
      }

    } catch (ex) {
      log.error({ title: 'Script Error', details: ex.message });
    }
  };

  return { onAction };
});
