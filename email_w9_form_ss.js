/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/search', 'N/email', 'N/runtime', 'N/file', 'N/log'], function (search, email, runtime, file, log) {

    function execute(context) {
        try {
            let sentCount = 0;
            let skippedCount = 0;

            const senderemail = runtime.getCurrentScript().getParameter({ name: 'custscript_sender_email' });
            const searchid = runtime.getCurrentScript().getParameter({ name: 'custscript_vendor_serchid' });
            log.debug('Script Parameters', `Sender Email: ${senderemail}, Search ID: ${searchid}`);


            const vendorSearch = search.load({
                id: searchid || 'customsearch_vendor_w9_request'
            });

            vendorSearch.run().each(function (result) {
                const companyName = result.getValue('companyname') || result.getValue('entityid');
                const emailAddress = result.getValue('email');
                log.debug('Processing Vendor', `Company: ${companyName}, Email: ${emailAddress}`);
                const subject = 'Request for Updated W9 Form';
                const body = `
                    <html>
                    <body>
                        <p>Dear ${companyName},</p>

                        <p>We are currently updating our vendor records and kindly request that you provide an updated W9 form at your earliest convenience.</p>

                        <p>Please email your completed W9 form directly to <a href="mailto:laurenc@swagoe.com">laurenc@swagoe.com</a>.</p>

                        <p>Thank you for your attention to this matter.</p>

                        <br>
                        <p>Best regards,<br>
                        Lauren Clinton<br>
                        Accounts Payable<br>
                        Southwest Accessories Group<br>
                        817-529-5053</p>
                    </body>
                    </html>`;



                email.send({
                    author: senderemail,
                    recipients: emailAddress,
                    subject: subject,
                    body: body

                });

                log.audit('Email Sent', `W9 request sent to ${companyName} (${emailAddress})`);
                sentCount++;
                return true;
            });

            // Summary email to admin or AP
            const summaryBody = `W9 Email Request Completed\n\nTotal Vendors Contacted: ${sentCount}\nVendors Skipped (W9 already received or no email): ${skippedCount}`;

            // email.send({
            //     author: -5,
            //     recipients: 'laurenc@swagoe.com',
            //     subject: 'W9 Request Email Batch Completed',
            //     body: summaryBody
            // });

        } catch (e) {
            log.error('W9 Email Script Failed', e.message);
        }
    }

    return { execute };
});