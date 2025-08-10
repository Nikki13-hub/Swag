/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 May 2019     bob
 *
 */

/**
 * @param {String}
 *            recType Record type internal id
 * @param {Number}
 *            recId Record internal id
 * @returns {Void}
 */
function MassDelete(record_type, record_id) {
	try {
		nlapiDeleteRecord(record_type, record_id)
	} catch (err) {
		var errMessage = err;
		if (err instanceof nlobjError) {
			errMessage = errMessage + ' ' + err.getDetails() + ' '
					+ 'Failed to Delete ID : ' + record_id;
		}
		nlapiLogExecution('ERROR', 'Error', errMessage);
		return err
	}
}
