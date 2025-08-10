/**
 * @NApiVersion 2.x
 * @NScriptType fiParserPlugin
 */
define(['N/query', 'N/url', 'N/record', 'N/runtime', 'N/search'],
	function(query, url, record, runtime, search) {
		function loadConfiguration(configurationId) {
			var objConfig = {};
			var lookupData = search.lookupFields({
				type: "customrecord_8q_bc_recon_general_config",
				id: 1,
				columns: ['custrecord_8q_bcrgc_suitelet']
			});
			objConfig.suitelet = lookupData.custrecord_8q_bcrgc_suitelet;
			objConfig.configuration_id = 1;
			return objConfig;
		}

		function getConfigurationPageUrl(context) {
			var configurationId = context.pluginConfiguration.getConfigurationFieldValue({
				fieldName: "configuration_id"
			});
			var configuration = loadConfiguration(configurationId);
			context.configurationPageUrl = configuration.suitelet + configurationId;
		}

		function parseData(context) {
			//var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
			//log.debug('remainingUsage 1',remainingUsage);
			var configurationId = context.pluginConfiguration.getConfigurationFieldValue({
				fieldName: "configuration_id"
			});
			var configuration = loadConfiguration(configurationId)
			var data = JSON.parse(context.inputData.getContents());
			for (var accountIndex = 0; accountIndex < data.accounts.length; accountIndex++) {
				var account = data.accounts[accountIndex];
				var accountData = context.createAccountData({
					accountId: account.accountId,
					employeeId: account.employeeId,
					cardHolder: account.cardHolder,
					dataAsOfDate: account.dataAsOfDate,
					openingBalance: account.openingBalance,
					closingBalance: account.closingBalance,
					currentBalance: account.currentBalance,
					dueBalance: account.dueBalance
				});

				for (var transactionIndex = 0; transactionIndex < account.transactions.length; transactionIndex++) {
					var transaction = account.transactions[transactionIndex];
					accountData.createNewTransaction({
						date: transaction.date,
						amount: transaction.amount,
						transactionTypeCode: transaction.transactionTypeCode,
						uniqueId: transaction.uniqueId,
						id: transaction.id,
						payee: transaction.payee,
						currency: transaction.currency,
						memo: transaction.memo,
						transactionStatus: transaction.transactionStatus,
						customerReferenceId: transaction.customerReferenceId,
						invoiceReferenceIds: transaction.invoiceReferenceIds,
						billedTaxAmount: transaction.billedTaxAmount,
						localChargeAmount: transaction.localChargeAmount,
						currencyExchangeRate: transaction.currencyExchangeRate,
						expenseCode: transaction.expenseCode
					});
					record.submitFields({
						type: 'customrecord_8q_bc_transactions',
						id: transaction.id,
						values: {
							custrecord_8qdt_matched: true
						},
						options: {
							enableSourcing: false,
							ignoreMandatoryFields: true
						}
					});
				}
				//remainingUsage = runtime.getCurrentScript().getRemainingUsage();
				//log.debug('Remaining Usage 2:', remainingUsage);
			}
		}

		function getStandardTransactionCodes(context) {

		}

		function getExpenseCodes(context) {
			context.createNewExpenseCode({
				code: 'CC',
				description: 'Customer Credit'
			});
		}

		return {
			getConfigurationPageUrl: getConfigurationPageUrl,
			parseData: parseData,
			getStandardTransactionCodes: getStandardTransactionCodes,
			getExpenseCodes: getExpenseCodes
		}
	});