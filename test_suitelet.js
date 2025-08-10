/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/email', 'N/log'], function(email) {

  function onRequest(context) {
    try {
      // Main logic
      email.send({
        author: runtime.getCurrentUser().id,
        recipients: 'your_email@yourcompany.com',
        subject: 'Test Email from NetSuite',
        body: 'This is a test email from SuiteScript.'
      });

      context.response.write('Email sent!');

    } catch (e) {
      log.error({
        title: 'Suitelet Script Error',
        details: e
      });

      // Directly send error to SP user (monitor)
      email.send({
        author: runtime.getCurrentUser().id, // You may replace with fixed author if needed
        recipients: 'sp_user@yourcompany.com', // Replace with actual SP user email or internal ID
        subject: 'NetSuite Script Error Notification',
        body: 'An error occurred in the Suitelet script:\n\n' + e.name + ' - ' + e.message
      });

      context.response.write('An error occurred. SP user has been notified.');
    }
  }

  return { onRequest };
});
