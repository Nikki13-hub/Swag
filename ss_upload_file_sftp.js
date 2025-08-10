/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/email', 'N/file', 'N/search', 'N/sftp', 'N/runtime','/SuiteScripts/_nscs/Libraries/NSUtilvSS2'],
    /**
     * @param{email} email
     * @param{file} file
     * @param{search} search
     * @param{sftp} sftp
     */
    (email, file, search, sftp, runtime,NSUtil) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            try {
                const scriptObj = runtime.getCurrentScript();
                const param = scriptObj.getParameter.bind();
                const [folder,searchId] = [
                    param("custscript_ss_daily_sales_export_folder"), param("custscript_ss_daily_sales_expor")
                ];
                var objPreferences = NSUtil.getPreferences([
                    'custrecord_cp_lpoack_inv_search',
                    'custrecord_cp_lpoack_emailaddress',
                    'custrecord_cp_lpoack_folder_id',
                    'custrecord_cp_lpoack_server_url',
                    'custrecord_cp_lpoack_server_port',
                    'custrecord_cp_lpoack_username',
                    'custrecord_cp_lpoack_api_secret',
                    'custrecord_cp_lpoack_hostkey',
                    'custrecord_cp_lpoack_hostkeytype',
                    'custrecord_cp_lpoack_remote_dir',
                    'custrecord_cp_lpoack_email_sender',
                    'custrecord_cp_lpoack_fail_email_sub',
                    'custrecord_cp_lpoack_succ_sub',
                    'custrecord_cp_lpoack_succ_body',
                    'custrecord_cp_lpoack_fail_body',
                    'custrecord_cp_lpoack_dfw_ship_to_code',
                    'custrecord_cp_lpoack_customer_dfw_lpo',
                    'custrecord_cp_lpoack_houston_ship_to_cod',
                    'custrecord_cp_lpoack_customer_houston'
                ]);
                const emailRecipient = objPreferences['custrecord_cp_lpoack_emailaddress'].value;
                const folderId = objPreferences['custrecord_cp_lpoack_folder_id'].value;
                const sftpURL = objPreferences['custrecord_cp_lpoack_server_url'].value;
                const sftpPort = objPreferences['custrecord_cp_lpoack_server_port'].value;
                const userName = objPreferences['custrecord_cp_lpoack_username'].value;
                const apiSecret = objPreferences['custrecord_cp_lpoack_api_secret'].value;
                const hostKey = objPreferences['custrecord_cp_lpoack_hostkey'].value;
                const hostKeyType = objPreferences['custrecord_cp_lpoack_hostkeytype'].text;
                const destDir = objPreferences['custrecord_cp_lpoack_remote_dir'].value;
                const emailAuthor = objPreferences['custrecord_cp_lpoack_email_sender'].value;
                const failSubject = objPreferences['custrecord_cp_lpoack_fail_email_sub'].value;
                const failBody = objPreferences['custrecord_cp_lpoack_fail_body'].value;
                const successSubject = objPreferences['custrecord_cp_lpoack_succ_sub'].value;
                const successBody = objPreferences['custrecord_cp_lpoack_succ_body'].value;
                const custrecord_cp_lpoack_dfw_ship_to_code = objPreferences['custrecord_cp_lpoack_dfw_ship_to_code'].value || '';
                const custrecord_cp_lpoack_customer_dfw_lpo = objPreferences['custrecord_cp_lpoack_customer_dfw_lpo'].value || '';
                const custrecord_cp_lpoack_houston_ship_to_cod = objPreferences['custrecord_cp_lpoack_houston_ship_to_cod'].value || '';
                const custrecord_cp_lpoack_customer_houston = objPreferences['custrecord_cp_lpoack_customer_houston'].value || '';
                if (!searchId || !emailRecipient || !folderId) {
                    let errorObj = error.create({
                        name: 'MISSING_SEARCH_PARAM',
                        message: 'Missing one of the script execution parameter values.'
                    });
                    throw errorObj;
                }
                let gpData = fetchSearchResult(searchId);
                let finalData = prepareData(gpData);
                log.debug('finalData',finalData.length)
                let csvFile = createCsv(finalData, folder);
                var valuesObj = {
                    url: sftpURL,
                    username: userName,
                    hostKey: hostKey,
                    hostKeyType: hostKeyType,
                    secret: apiSecret,
                    directory: destDir
                };
                log.debug("SFTP values object", valuesObj);
                /// Create sftp Connection
                var sftpConnection = sftp.createConnection(valuesObj);
                log.debug('sftpConnection',sftpConnection);

            } catch (e) {
                log.error({
                    title: "Error getting Global Permissions Data",
                    details: e.message
                });
            }

        }

        /**
         * fetchSearchResult
         */
        const fetchSearchResult = (searchId) => {
            let resultDetails = [];
            let searchObj = search.load({
                id: searchId
            });
            let pagedData = searchObj.runPaged({
                pageSize: 1000
            });
            pagedData.pageRanges.forEach(function (pageRange) {
                let myPage = pagedData.fetch({
                    index: pageRange.index
                });
                myPage.data.forEach(function (result) {
                    resultDetails.push(result);
                });
            });
            return resultDetails;
        }
      
        const prepareData = (searchdata) => {
            let finalObj = [];
          log.debug('columnsObj',searchdata);
            let columnsHeader=[];     
            let count=0;
            searchdata.forEach(function (result) {
                let searchColumns = result.columns;
              if(count==0){
               for (let x in searchColumns){
                  columnsHeader.push(searchColumns[x].label);
                }
                log.debug('columnsHeader',columnsHeader);
              finalObj.push(columnsHeader);
              }
                let columnsData = [];
                searchColumns.map((x) => {
                    let txt;
                    txt = result.getText(x) ? result.getText(x) : result.getValue(x);
                    columnsData.push(txt);
                });
                finalObj.push(columnsData);
              count++;
            });
            return finalObj;
        }



        const createCsv = (finalData, folderId) => {
            try {
                let csv = '';

                let content = [];
                for (let i = 0; i < finalData.length; i++) {
                    let temp = "";
                    for (let val in finalData[i]) {
                        temp += `"${finalData[i][val]}",`;
                    }
                    content.push(temp);
                }

                for (let j = 0; j < content.length; j++) {
                    csv += `${content[j]}\n`;
                }
                let {
                    year,
                    month,
                    day,
                    hour,
                    minute,
                    seconds
                } = getDateTimeValues();
                const updateDate = '' + year + month + day + hour + minute + seconds;
                let csvFile = file.create({
                    name: `8Q GM Daily Sales for Export - DFW-HOU - V3${updateDate}.csv`,
                    fileType: file.Type.CSV,
                    contents: csv,
                    folder: folderId
                });

                let exportFile = csvFile.save();

                log.audit({
                    title: "CSV File Saved",
                    details: `${exportFile} has been saved in ${folderId}`
                });

                let attachments = [];

                attachments.push(file.load({
                    id: exportFile
                }));

                return attachments;
            } catch (e) {
                log.error({
                    title: "Error Creating CSV File",
                    details: e.message
                });
            }
        };

        const getDateTimeValues=()=> {
            var dt = new Date();
            var year = dt.getFullYear();
            var month = dt.getMonth() + 1;
            if (month < 10) {
                month = '0' + month;
            }
            var day = dt.getDate();
            if (day < 10) {
                day = '0' + day;
            }
            var hour = dt.getHours();
            if (hour < 10) {
                hour = '0' + hour;
            }
            var minute = dt.getMinutes();
            if (minute < 10) {
                minute = '0' + minute;
            }
            var seconds = dt.getSeconds();
            if (seconds < 10) {
                seconds = '0' + seconds;
            }
            return { year, month, day, hour, minute, seconds };
        }
        return {
            execute
        }

    });