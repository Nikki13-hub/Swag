/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define([
    'N/ui/serverWidget',
    'N/record',
    'N/email',
    'N/runtime',
    'N/file',
    'N/log',
    'N/url',
    'N/format',
    'N/https',
    'N/redirect', 'N/search'
],
    function (serverWidget, record, email, runtime, file, log, url, format, https, redirect, search) {

       function generateUUID() {
        return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
      
        const DEPT_ADMIN_EMAILS = {
            // Example: 'Sales': 'sales.admin@example.com', 'Other': 'it.support@example.com'
        };

        function onRequest(context) {
            var ticketId = context.request.parameters.ticketid;
            if (context.request.method === 'GET') {

                if (ticketId) {
                    // This block will now only be used if someone manually navigates to the URL with a ticketid
                    // The primary confirmation will be handled by the POST response.
                    showConfirmation(context.response, ticketId);
                } else {
                    buildForm(context.response);
                }
            } else { // POST
                handlePost(context.request, context.response);
            }
        }

        function buildForm(response) {
            const form = serverWidget.createForm({ title: 'Employee Issue Reporting Portal' });
          
           var token = generateUUID();
          
          var tokenfield = form.addField({
            id: 'custpage_token',
            type: serverWidget.FieldType.TEXT,
            label: 'Submission Token'
        });

          tokenfield.updateDisplayType({
    displayType: serverWidget.FieldDisplayType.HIDDEN
});

          tokenfield.defaultValue = token;

          const tokenRec = record.create({ type: 'customrecord_submission_token', isDynamic: true });
        tokenRec.setValue({ fieldId: 'name', value: token });
        tokenRec.setValue({ fieldId: 'custrecord_token_used', value: false });
        tokenRec.save();
            /*const token = generateUUID();
        form.addField({
            id: 'custpage_token',
            type: serverWidget.FieldType.HIDDEN,
            label: 'Submission Token'
        }).defaultValue = token;

        const tokenRec = record.create({ type: 'customrecord_submission_token', isDynamic: true });
        tokenRec.setValue({ fieldId: 'name', value: token });
        tokenRec.setValue({ fieldId: 'custrecord_token_used', value: false });
        tokenRec.save();*/

            if (runtime.getCurrentUser().id === -4) { // -4 is the Guest user ID for external access
                form.addField({
                    id: 'custpage_customstyle',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: ' '
                }).defaultValue = `
                <style>
                    body { font-family: Tahoma, Arial, sans-serif; background-color: #f0f0f0; }
                    .uir-field-group { background-color: #fff; border: 1px solid #dcdcdc; margin-bottom: 20px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); padding: 20px; }
                    .uir-field-group-hdr { background-color: #e3e3e3; padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #ccc; color: #333; border-top-left-radius: 4px; border-top-right-radius: 4px; }
                    label { font-weight: 600; display: flex; align-items: center; margin-bottom: 4px; color: #333; }
                    input[type="text"], input[type="email"], select, textarea { width: 100%; padding: 6px 10px; border: 1px solid #b3b3b3; border-radius: 4px; background-color: #fff; box-sizing: border-box; }
                    .uir-button { background-color: #0070d2 !important; color: #fff !important; border: none; padding: 10px 20px; font-weight: bold; border-radius: 4px; margin-top: 10px; }
                    .uir-page-title { font-size: 22px; color: #24324d; margin-bottom: 20px; }
                </style>`;
            }

            // Add Field Groups for sections
            form.addFieldGroup({ id: 'grp_empinfo', label: 'Employee Information' });
            form.addFieldGroup({ id: 'grp_issue', label: 'Issue Details' });
            form.addFieldGroup({ id: 'grp_app', label: 'Application Details' });
            form.addFieldGroup({ id: 'grp_additional', label: 'Additional Details' });

            // 1. Employee Information
            const fldEmpName = form.addField({ id: 'custpage_emp_name', type: serverWidget.FieldType.SELECT, label: 'Employee Name', source: 'employee', container: 'grp_empinfo' });
            fldEmpName.isMandatory = true;
            const fldEmpId = form.addField({ id: 'custpage_emp_id', type: serverWidget.FieldType.TEXT, label: 'Employee ID', container: 'grp_empinfo' });
            const fldEmpEmail = form.addField({ id: 'custpage_emp_email', type: serverWidget.FieldType.EMAIL, label: 'Employee Email', container: 'grp_empinfo' });
            fldEmpEmail.helpText = 'Required if the employee has a corporate email address.';
            fldEmpEmail.isMandatory = true;
          if (runtime.getCurrentUser().id !== -4) {
               fldEmpEmail.defaultValue = runtime.getCurrentUser().email;
            }

            const fldDept = form.addField({ id: 'custpage_department', type: serverWidget.FieldType.SELECT, label: 'Department', container: 'grp_empinfo' });
            [' ', 'Warehouse', 'Sales', 'Accounting', 'Operations', 'IT/Technical', 'Executive Management', 'Customer Support', 'Marketing', 'Other'].forEach(dept => fldDept.addSelectOption({ value: dept, text: dept }));
            fldDept.isMandatory = true;
            const fldRole = form.addField({ id: 'custpage_role', type: serverWidget.FieldType.TEXT, label: 'Role / Job Title', container: 'grp_empinfo' });

            // 2. Issue Details
            const fldTitle = form.addField({ id: 'custpage_issue_title', type: serverWidget.FieldType.TEXT, label: 'Issue Title', container: 'grp_issue' });
            fldTitle.isMandatory = true;
            const fldDesc = form.addField({ id: 'custpage_issue_desc', type: serverWidget.FieldType.LONGTEXT, label: 'Issue Description', container: 'grp_issue' });
            fldDesc.isMandatory = true;
            const fldStatus = form.addField({ id: 'custpage_ticket_status', type: serverWidget.FieldType.TEXT, label: 'Ticket status', container: 'grp_issue' });
            fldStatus.defaultValue = 'New';
            fldStatus.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });

            // 3. Application Details
            const fldModule = form.addField({ id: 'custpage_app_module', type: serverWidget.FieldType.SELECT, label: 'Application / Module', container: 'grp_app' });
            [' ', 'Warehouse Mobile System', 'Financial Module', 'Sales Module', 'Operations', 'Reports & Dashboards', 'HR/Payroll', 'General Access/Login Issues', 'Other'].forEach(mod => fldModule.addSelectOption({ value: mod, text: mod }));
            const fldPriority = form.addField({ id: 'custpage_priority', type: serverWidget.FieldType.SELECT, label: 'Priority', container: 'grp_app' });
            [['Critical(2-3 Hours)', '1'], ['High(5-6 Hours)', '2'], ['Medium(1 day)', '3'], ['Low(3-5 days)', '4']].forEach(arr => fldPriority.addSelectOption({ value: arr[0], text: arr[0] }));
            fldPriority.defaultValue = 'Medium(1 day)';

            // 4. Additional Details
            const fldDateTime = form.addField({ id: 'custpage_occurrence_dt', type: serverWidget.FieldType.DATETIMETZ, label: 'Date / Time of Occurrence', container: 'grp_additional' });
            fldDateTime.defaultValue = new Date();
            form.addField({ id: 'custpage_attachment', type: serverWidget.FieldType.FILE, label: 'Screenshot / Document' });
          form.addField({ id: 'custpage_attachment1', type: serverWidget.FieldType.FILE, label: 'Screenshot / Document' });
          form.addField({ id: 'custpage_attachment2', type: serverWidget.FieldType.FILE, label: 'Screenshot / Document' });
          form.addField({ id: 'custpage_attachment3', type: serverWidget.FieldType.FILE, label: 'Screenshot / Document' });
          /*form.addField({
    id: 'custpage_attachment_html',
    type: serverWidget.FieldType.INLINEHTML,
    label: 'Screenshot / Document'
}).defaultValue = `
    <div id="file-container">
        <input type="file" name="custpage_attachment_0" /><br>
    </div>
    <button type="button" onclick="addFileField()">➕ Add Another File</button>
    <script>
        var fileCounter = 1;
        function addFileField() {
            var container = document.getElementById('file-container');
            var input = document.createElement('input');
            input.type = 'file';
            input.name = 'custpage_attachment_' + fileCounter;
            fileCounter++;
            container.appendChild(input);
            container.appendChild(document.createElement('br'));
        }
    </script>
`;*/
            form.addField({ id: 'custpage_addl_comments', type: serverWidget.FieldType.LONGTEXT, label: 'Additional Comments', container: 'grp_additional' });

            form.addSubmitButton({ label: 'Submit Ticket' });
            response.writePage(form);
        }

        function handlePost(request, response) {
            var apiToken = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjUzMzcxNDkyOCwiYWFpIjoxMSwidWlkIjo3NzI5NDY4MCwiaWFkIjoiMjAyNS0wNy0wMlQwMjoxMzo0MC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjkwOTM0NTQsInJnbiI6InVzZTEifQ.b-L83VAyqBBo8kKVRUnt9XbiYuTV9dyN0eA0d9M5xVo';
            var administrationTasksBoardId = 9510934617;

          const token = request.parameters.custpage_token;

        const tokenSearch = search.create({
            type: 'customrecord_submission_token',
            filters: [['name', 'is', token]],
            columns: ['internalid', 'custrecord_token_used']
        });

        const tokenResults = tokenSearch.run().getRange({ start: 0, end: 1 });

        if (tokenResults.length > 0 && tokenResults[0].getValue('custrecord_token_used') === true) {
            log.audit('Duplicate Submission Detected', 'Token: ' + token);
            showConfirmation(response, 'Already submitted');
            return;
        }

        if (tokenResults.length > 0) {
            record.submitFields({
                type: 'customrecord_submission_token',
                id: tokenResults[0].id,
                values: { custrecord_token_used: true }
            });
        }

            const params = request.parameters;
            let fileId = null;

            var ticketRec = record.create({ type: 'customrecordsupport_ticket_it', isDynamic: true });

            ticketRec.setValue({ fieldId: 'custrecord_emp_name', value: params.custpage_emp_name });
            ticketRec.setValue({ fieldId: 'custrecord_emp_id', value: params.custpage_emp_id });
            ticketRec.setValue({ fieldId: 'custrecord_emp_email', value: params.custpage_emp_email });
            ticketRec.setValue({ fieldId: 'custrecord_emp_dept', value: params.custpage_department });
            ticketRec.setValue({ fieldId: 'custrecord_emp_role', value: params.custpage_role });
            ticketRec.setValue({ fieldId: 'custrecord_issue_title', value: params.custpage_issue_title });
            ticketRec.setValue({ fieldId: 'custrecord_issue_desc', value: params.custpage_issue_desc });
            ticketRec.setText({ fieldId: 'custrecord_ticket_status', text: params.custpage_ticket_status });
            ticketRec.setValue({ fieldId: 'custrecord_app_module', value: params.custpage_app_module });
            ticketRec.setValue({ fieldId: 'custrecord_priority', value: params.custpage_priority });
            ticketRec.setValue({ fieldId: 'custrecord_occurrence_dt', value: format.parse({ value: params.custpage_occurrence_dt, type: format.Type.DATETIMETZ }) });
            ticketRec.setValue({ fieldId: 'custrecord_addl_comments', value: params.custpage_addl_comments });

            const attachmentFields = [
    'custpage_attachment',
    'custpage_attachment1',
    'custpage_attachment2',
    'custpage_attachment3'
];

attachmentFields.forEach((fieldId, index) => {
    const uploader = request.files ? request.files[fieldId] : null;

    if (uploader && uploader.size > 0) {
        const savedFile = file.create({
            name: uploader.name,
            fileType: uploader.fileType,
            contents: uploader.getContents(),
            folder: -15 // SuiteScripts folder, adjust if needed
        });

        const fileId = savedFile.save();

        ticketRec.setValue({
            fieldId: `custrecord_attachment${index === 0 ? '' : index}`,
            value: fileId
        });
    }
});

const ticketId = ticketRec.save();
log.audit('Ticket Created', 'Ticket ID ' + ticketId);

          /*let uploadedFileIds = [];
if (request.files) {
  log.debug('request.files',request.files);
    Object.keys(request.files).forEach(function(key) {
        var uploader = request.files[key];
      log.debug('uploader',uploader);
        if (uploader && uploader.size > 0) {
            var savedFile = file.create({
                name: uploader.name,
                fileType: uploader.fileType,
                contents: uploader.getContents(),
                folder: -15
            });
            var fileId = savedFile.save();
          log.debug('fileId',fileId);
            uploadedFileIds.push(fileId);
        }
    });
}
          log.debug('uploadedFileIds',uploadedFileIds);

// save main ticket
var ticketId = ticketRec.save();
log.audit('Ticket Created', 'Ticket ID ' + ticketId);

// create child records
uploadedFileIds.forEach(function(fileId) {
  log.debug('fileId',fileId);
    var childRec = record.create({ type: 'customrecord_ticket_file' });
    childRec.setValue({ fieldId: 'custrecord_parent_ticket', value: ticketId });
    childRec.setValue({ fieldId: 'custrecord_file_idd', value: fileId });
    childRec.save();
});*/


            var ticketRecordLoadForTheEmployeeName = record.load({ type: 'customrecordsupport_ticket_it', id: ticketId, isDynamic: true });
            var employeeRecordIdFromCustom = ticketRecordLoadForTheEmployeeName.getText({ fieldId: 'custrecord_emp_name' });

            // ================= Monday.com Integration =================
            try {
                let priority_val = "Medium";
                if (params.custpage_priority == "Critical(2-3 Hours)") priority_val = "Critical ⚠️️";
                else if (params.custpage_priority == "High(5-6 Hours)") priority_val = "High";
                else if (params.custpage_priority == "Low(3-5 days)") priority_val = "Low";

               var date = new Date(params.custpage_occurrence_dt);
var dateStr = date.toISOString().split('T')[0];

// Build column values object
var columnValues = {
    person: { personsAndTeams: [{ id: 77294680, kind: "person" }, { id: 75446830, kind: "person" }] },
    color_mksg15fn: { label: priority_val },
    date_mksgamzg: { date: dateStr }
};

// Stringify and escape the JSON to insert into GraphQL
var columnValuesStr = JSON.stringify(columnValues).replace(/"/g, '\\"');

// Build GraphQL mutation
var mutation = `
    mutation {
        create_item (
            board_id: ${administrationTasksBoardId}, 
            item_name: "${params.custpage_issue_title}", 
            column_values: "${columnValuesStr}"
        ) {
            id 
            name 
        }
    }
`;

// Send POST request
var mondayResponse = https.post({
    url: 'https://api.monday.com/v2',
    headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json' 
    },
    body: JSON.stringify({ query: mutation })
});

// Parse and log response
var parsed = JSON.parse(mondayResponse.body);
log.debug('Monday.com Create Item Response', parsed);
                if (parsed.data && parsed.data.create_item) {
                    record.submitFields({
                        type: 'customrecordsupport_ticket_it',
                        id: ticketId,
                        values: { 'custrecord_monday_item_id': parsed.data.create_item.id }
                    });
                }
            } catch (e) {
                log.error('Monday.com API Error', e);
            }

            // ================= Smartsheet Integration =================
            try {
                var smartsheetAccessToken = 'jC2F7AfLnxTI0DUFnpresqReNEiQiLmmCoOEt';
                var sheetId = '3371585911082884';
                var smartsheetPayload = [{
                    toBottom: true,
                    cells: [
                        { columnId: 2517104256673668, value: params.custpage_issue_title }, // Task/Issue Title
                        { columnId: 7020703884044164, value: params.custpage_emp_id, strict: false } // Employee ID
                    ]
                }];
                var smartsheetResponse = https.post({
                    url: 'https://api.smartsheet.com/2.0/sheets/' + sheetId + '/rows',
                    headers: { 'Authorization': 'Bearer ' + smartsheetAccessToken, 'Content-Type': 'application/json' },
                    body: JSON.stringify(smartsheetPayload)
                });
                log.audit('Smartsheet Row Created', smartsheetResponse.body);
            } catch (e) {
                log.error('Smartsheet API Error', e);
            }

            // ================= Email Notification =================
            try {
                const recordUrl = url.resolveRecord({ recordType: 'customrecordsupport_ticket_it', recordId: ticketId, isEditMode: false });
                let authorid = (runtime.getCurrentUser().id === -4) ? params.custpage_emp_name : runtime.getCurrentUser().id;

                const emailOptions = {
                    author: authorid,
                    recipients: 'netsuitesupport@swagoe.com',
                    subject: 'New Ticket #' + ticketId + ' – ' + params.custpage_issue_title,
                    body: buildEmailBody(params, ticketId, recordUrl, employeeRecordIdFromCustom)
                };
                if (fileId) {
                    emailOptions.attachments = [file.load({ id: fileId })];
                }
                email.send(emailOptions);
            } catch (e) {
                log.error('Email Error', e);
            }

            // ================= Confirmation Page =================
            // Instead of redirecting, directly show the confirmation page.
            // This works for both internal and external users.
            showConfirmation(response, ticketId);
        }

        function showConfirmation(response, ticketId) {
            var form = serverWidget.createForm({
                title: 'Ticket Submitted Successfully'
            });

            form.addField({
                id: 'custpage_confirmation',
                type: serverWidget.FieldType.INLINEHTML,
                label: ' '
            }).defaultValue = `
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
                .confirmation-container { text-align: center; margin-top: 50px; padding: 40px; background-color: #f8f9fa; border-radius: 8px; max-width: 600px; margin-left: auto; margin-right: auto; border: 1px solid #dee2e6; }
                .confirmation-icon { font-size: 48px; color: #28a745; }
                .confirmation-title { font-size: 24px; color: #343a40; font-weight: 600; margin-top: 15px; margin-bottom: 10px; }
                .confirmation-id { font-size: 18px; color: #495057; }
                .confirmation-message { font-size: 16px; color: #6c757d; margin-top: 20px; }
            </style>
            <div class="confirmation-container">
                <div class="confirmation-icon">✅</div>
                <div class="confirmation-title">Ticket Submitted Successfully!</div>
                <p class="confirmation-id">Your ticket ID is: <strong>${ticketId}</strong></p>
                <p class="confirmation-message">Thank you for reporting the issue. Our NetSuite team will fix it shortly.</p>
            </div>`;

            response.writePage(form);
        }

        function buildEmailBody(p, ticketId, recordUrl, employeeRecordIdFromCustom) {
            return '<h3>New Employee Issue Ticket #' + ticketId + '</h3>' +
                '<p><strong>Employee:</strong> ' + employeeRecordIdFromCustom + '</p>' +
                '<p><strong>Email:</strong> ' + p.custpage_emp_email + '</p>' +
                '<p><strong>Department:</strong> ' + p.custpage_department + '</p>' +
                '<p><strong>Role:</strong> ' + p.custpage_role + '</p>' +
                '<p><strong>Title:</strong> ' + p.custpage_issue_title + '</p>' +
                '<p><strong>Description:</strong><br/>' + p.custpage_issue_desc + '</p>' +
                '<p><strong>Application / Module:</strong> ' + p.custpage_app_module + '</p>' +
                '<p><strong>Ticket Status:</strong> ' + p.custpage_ticket_status + '</p>' +
                '<p><strong>Priority:</strong> ' + p.custpage_priority + '</p>' +
                '<p><strong>Date / Time:</strong> ' + p.custpage_occurrence_dt + '</p>' +
                (p.custpage_addl_comments ? ('<p><strong>Additional Comments:</strong><br/>' + p.custpage_addl_comments + '</p>') : '') +
                '<p><em>This message was sent automatically by the Employee Issue Reporting Portal.</em></p>' +
                '<p><a href="' + recordUrl + '">View Ticket in NetSuite</a></p>';
        }

        return { onRequest: onRequest };
    });