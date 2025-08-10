          /**
           *@NApiVersion 2.1
           *@NScriptType ScheduledScript
           */
          /*
				Auther : Radhakrishnan
				Created Date : 22 Sep 2022
				
				Purpose : testing lpo order script
			*/
            define(['N/search', 'N/record'],
            function(search, record) {
                function execute(context) {
                    try {
                        var dealerId=1776;
                        var recCustomer = record.load({
                            type: record.Type.CUSTOMER,
                            id: dealerId,
                            isDynamic: false
                        });
                        var transactionType='LPO';
                        var intAddressbookCount = recCustomer.getLineCount('addressbook');
                        var stAddressLabel, blDefaultShip, obShipAddress, obLPOAddress, blDefaultShip, stAddressLabel, blLPOAddrFlag ;
                        obLPOAddress = recCustomer.getSublistSubrecord('addressbook', 'addressbookaddress', 0);
                        obLPOAddress.getValue('addrtext');
                        log.debug('0', obLPOAddress.getValue('addrtext'));
                        obLPOAddress = recCustomer.getSublistSubrecord('addressbook', 'addressbookaddress', 1);
                        obLPOAddress.getValue('addrtext');
                        log.debug('1', obLPOAddress.getValue('addrtext'));
                        obLPOAddress = recCustomer.getSublistSubrecord('addressbook', 'addressbookaddress', 2);
                        obLPOAddress.getValue('addrtext');
                        log.debug('2', obLPOAddress.getValue('addrtext'));
                       /* for (var i = 0; i < intAddressbookCount; i++){
                            blDefaultShip = recCustomer.getSublistValue('addressbook', 'defaultshipping', i);
                            stAddressLabel = recCustomer.getSublistValue('addressbook', 'label', i);
                            if (blDefaultShip){
                                obShipAddress = recCustomer.getSublistSubrecord('addressbook', 'addressbookaddress', i);
                                log.debug(i, obShipAddress.getValue('addrtext') + '\n');
                            }
                            if (transactionType == 'LPO' && stAddressLabel == 'LPO/DIO Address') {
                                obLPOAddress = recCustomer.getSublistSubrecord('addressbook', 'addressbookaddress', i);
                                log.debug(i, obLPOAddress.getValue('addrtext') + '\n');
                                blLPOAddrFlag = true;
                            }
                        }*/
                    } 
                    catch (_e) {
                        log.debug('e',_e);
                    }
                }

                function _logValidation(value) {
                    if (value != 'null' && value != '' && value != undefined && value != 'NaN') {
                        return true;
                    } else {
                        return false;
                    }
                }
                return {
                    execute: execute
                };
            });