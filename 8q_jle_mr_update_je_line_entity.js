/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/runtime', 'N/record', 'N/file'],
    (search, runtime, record, file) => {

        const SCRIPT_PARAMS = {
            CSV_FILE: 'custscript_8q_jle_csv_file',
            CUSTOMER_220L: 'custscript_8q_jle_cu_220l',
            VENDOR_302: 'custscript_8q_jle_ve_302'
        }

        const getInputData = (context) => {
            let fileId = runtime.getCurrentScript().getParameter({ name: SCRIPT_PARAMS.CSV_FILE});
            let csvFile = file.load({ id: fileId });

            let csvContent = csvFile.getContents();
            let data = csvToArr(csvContent);
            return data;
        }


        const map = (context) => {
            //log.debug('MAP Start', 'MAP Start')
            let mapValues = JSON.parse(context.value);
            let jeFields = getJEByNum(mapValues.je);
            if(jeFields.id){
                mapValues.id = jeFields.id;
            }
            //log.debug('Map Values', mapValues);
            context.write({
                key: mapValues.je, //id as key
                value: mapValues //line identificators
            });
        }


        const reduce = (context) => {
            log.debug('REDUCE Start', 'REDUCE Start');
            // No reduce logic needed in this case
            let reduceValues = context.values;
            let firstValue;
            if (reduceValues.length > 0) {
                firstValue = JSON.parse(context.values[0]);
            } else {
                firstValue = JSON.parse(context.values);
            }
            log.debug('firstValue', firstValue);
            if(!firstValue.id){
                log.error('JOURNAL_NOT_FOUND', `JE: ${firstValue.je} is not found on Netsuite.`);
            } else {
                let scriptObj = runtime.getCurrentScript();
                let cu_220l = scriptObj.getParameter({ name: SCRIPT_PARAMS.CUSTOMER_220L});
                let ve_302 = scriptObj.getParameter({ name: SCRIPT_PARAMS.VENDOR_302});
                let jeRec = record.load({
                    type: record.Type.JOURNAL_ENTRY,
                    id: firstValue.id
                });
                let lineCount = jeRec.getLineCount('line');
                let lineAcc; 
                for(z = 0; z < lineCount; z++){
                    lineAcc = jeRec.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        line: z
                    });
                    // log.debug('lineAcc', lineAcc);
                    //233 = 220L Account
                    if(lineAcc == 233){
                        jeRec.setSublistValue({
                            sublistId: 'line',
                            fieldId: 'entity',
                            line: z,
                            value: cu_220l
                        });
                    //255 = 302 Factory Payables account
                    } else if (lineAcc == 255){
                        jeRec.setSublistValue({
                            sublistId: 'line',
                            fieldId: 'entity',
                            line: z,
                            value: ve_302
                        });
                    }
                }
                let je_sub = jeRec.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                });
                log.audit('SUCCESS',`Successfully update JE: ${je_sub}`);
            }
        }


        const summarize = (context) => {
            // Log summary details
            if (context.inputSummary.error) {

                log.error('Input Error', context.inputSummary.error);

            }
            context.mapSummary.errors.iterator().each(function (key, error) {

                log.error('Map Error for key: ' + key, error);

                return true;

            });
            context.reduceSummary.errors.iterator().each(function (key, error) {

                log.error('Reduce Error for key: ' + key, error);

                return true;

            });
        }

        const csvToArr = (csvString) => {
            const rows = csvString.split("\r\n");


            const jsonData = [];
            for (let i = 1; i < rows.length; i++) {
                //log.debug('rows[i]', rows[i]);
                if (rows[i].trim().length > 0) {

                    jsonData.push({
                        je: rows[i]
                    });
                }
            }
            //throw "Test";
            return jsonData;
        }

        const getJEByNum = (jeNum) => {
            let jeFields = {};
            let journalentrySearchObj = search.create({
                type: "journalentry",
                filters:
                    [
                        ["mainline", "is", "T"],
                        "AND",
                        ["type", "anyof", "Journal"],
                        "AND",
                        ["mainline", "is", "T"],
                        "AND",
                        ["numbertext", "is", jeNum],
                        "AND",
                        ["linesequencenumber", "equalto", "0"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "tranid", label: "Document Number" })
                    ]
            });
            let result = journalentrySearchObj.run().getRange({
                start: 0,
                end: 1
            });
            if(result.length > 0){
                jeFields.id = result[0].id
            }
            return jeFields;

        }

        const isEmpty = (value) => {
            return (value == null || (typeof value === "string" && value.trim().length === 0));
        }

        return { getInputData, map, reduce, summarize }

    });
