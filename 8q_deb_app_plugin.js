/**
 * @NApiVersion 2.x
 * @NScriptType fiConnectivityPlugin
 * @NModuleScope SameAccount
 */
define(['N/search'],
	function(search) {
		function loadConfiguration(configurationId) {
			var objConfig = {};
			objConfig.accounts = [];
			objConfig.suitelet = '';
			var customrecord_8q_bc_recon_configurationSearchObj = search.create({
				type: "customrecord_8q_bc_recon_acc_config",
				filters: [],
				columns: [
					search.createColumn("custrecord_8q_bcrc_account"),
					search.createColumn("custrecord_8q_bcrc_account_type"),
					search.createColumn("custrecord_8q_bcrc_groupname"),
					search.createColumn("custrecord_8q_bcrc_ss")
				]
			});
			customrecord_8q_bc_recon_configurationSearchObj.run().each(function(result) {
				var account = result.getValue('custrecord_8q_bcrc_account');
				var accountName = result.getText('custrecord_8q_bcrc_account');
				var accountType = result.getValue('custrecord_8q_bcrc_account_type');
				var groupName = result.getValue('custrecord_8q_bcrc_groupname');
				var savedSearch = result.getValue('custrecord_8q_bcrc_ss');
				objConfig.accounts.push({
					account: account,
					displayName: accountName,
					accountType: accountType,
					groupName: groupName,
					savedSearch: savedSearch
				});
				return true;
			});
            var lookupData = search.lookupFields({
                type: "customrecord_8q_bc_recon_general_config",
                id: 1,
                columns: ['custrecord_8q_bcrgc_suitelet']
            });
            objConfig.suitelet = lookupData.custrecord_8q_bcrgc_suitelet;
			objConfig.configuration_id = 1;
			return objConfig;
		}

		function getConfigurationIFrameUrl(context) {
			var configurationId = context.pluginConfiguration.getConfigurationFieldValue({
				fieldName: "configuration_id"
			});
			var configuration = loadConfiguration(configurationId);
			context.configurationIFrameUrl = configuration.suitelet + configurationId;
		}

		function getAccounts(context) {
			var configurationId = context.pluginConfiguration.getConfigurationFieldValue({
				fieldName: "configuration_id"
			});
			var configuration = loadConfiguration(configurationId);
			for (var accountIndex = 0; accountIndex < configuration.accounts.length; accountIndex++) {
				var accountData = configuration.accounts[accountIndex];
				context.addAccount({
					accountMappingKey: accountData.account,
					displayName: accountData.displayName,
					accountType: accountData.accountType,
					currency: "USD",
					groupName: accountData.groupName
				});
			}
		}

		function getTransactionData(context) {
			var configurationId = context.pluginConfiguration.getConfigurationFieldValue({
				fieldName: "configuration_id"
			});
			var configuration = loadConfiguration(configurationId);
			var downloadedData = {};
			downloadedData.accounts = [];
			for (var accountIndex = 0; accountIndex < configuration.accounts.length; accountIndex++) {
				var accountData = configuration.accounts[accountIndex];
				var dataArray = [];
				var searchResult = search.load({
					id: accountData.savedSearch
				});
				searchResult.run().each(function(result) {
					var dataLine = {};
					dataLine.date = result.getValue(result.columns[0]);
					dataLine.amount = Number(result.getValue(result.columns[4]));
					dataLine.transactionTypeCode = result.getText('custrecord_8qdt_txn_type');
					dataLine.uniqueId = result.id;
					dataLine.id = result.id;
					dataLine.payee = result.getText(result.columns[1]);
					dataLine.memo = result.getValue(result.columns[5]);
					dataLine.transactionStatus = 'Posted';
					dataLine.customerReferenceId = '';
					dataLine.invoiceReferenceIds = [];
					dataLine.billedTaxAmount = Number(0.00);
					dataLine.localChargeAmount = Number(0.00);
					dataLine.currencyExchangeRate = Number(1.0);
					dataLine.expenseCode = '';
					dataArray.push(dataLine);
					return true;
				});
				downloadedData.accounts.push({
					accountId: accountData.account,
					employeeId: "",
					cardHolder: "",
					dataAsOfDate: "",
					openingBalance: 0.00,
					closingBalance: 0.00,
					currentBalance: 0.00,
					dueBalance: 0.00,
					transactions: dataArray
				});
			}
			context.addDataChunk({
				dataChunk: JSON.stringify(downloadedData)
			});
			context.returnAccountRequestsJSON({
				accountsJson: context.accountRequestsJSON
			});
		}

		return {
			getConfigurationIFrameUrl: getConfigurationIFrameUrl,
			getAccounts: getAccounts,
			getTransactionData: getTransactionData
		}
	});