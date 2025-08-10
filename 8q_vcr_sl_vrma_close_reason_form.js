/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/runtime', 'N/record'],

    (serverWidget, runtime, record) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} context
         * @param {ServerRequest} context.request - Incoming request
         * @param {ServerResponse} context.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (context) => {
            if (context.request.method === 'GET') {
                let vrmaId = context.request.parameters.custscript_8q_sl_vcr_vrmaid;
                let form = createForm(vrmaId);
                context.response.writePage(form);
            } else if (context.request.method === 'POST') {
                let data = {};
                //log.debug('context.request', context.request.parameters);
                data.vrma_id = context.request.parameters.custpage_vrma_rec;
                data.close_status = context.request.parameters.custpage_close_status;
                data.reason = context.request.parameters.custpage_reason;

                let sub_vrma = closeVRMA(data.vrma_id);
                let sub_close_reason = createCloseReason(data);
                let form = serverWidget.createForm({
                    title: `Closing VRMA: ${data.vrma_id}`,
                    hideNavBar: true
                });
                var scriptField = form.addField({
                    id: 'custpage_htmlfield',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: ' '
                });
                scriptField.defaultValue = `<script>
                    window.opener.location.reload(false);
                    window.close()
                </script>`
                // Respond with a confirmation message
                context.response.writePage(form);
            }
        }

        const createForm = (vrmaId) => {
            let form = serverWidget.createForm({
                title: 'VRMA Close Reason',
                hideNavBar: true
            });
            let clientFldGrp = form.addFieldGroup({
                id: 'columnFieldGroup',
                label: ' '
            });
            clientFldGrp.isSingleColumn = true;
            let closeStatusField = form.addField({
                id: 'custpage_close_status',
                type: serverWidget.FieldType.SELECT,
                label: 'Close Status',
                source: 'customlist_8q_vcr_close_status',
                container: 'columnFieldGroup'
            });
            closeStatusField.isMandatory = true;
            let reasonField = form.addField({
                id: 'custpage_reason',
                type: serverWidget.FieldType.TEXTAREA,
                label: 'Reason',
                container: 'columnFieldGroup'
            });
            let vrmaRecField = form.addField({
                id: 'custpage_vrma_rec',
                type: serverWidget.FieldType.INTEGER,
                label: 'VRMA Rec',
                container: 'columnFieldGroup'
            });
            vrmaRecField.defaultValue = vrmaId;
            vrmaRecField.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            form.addSubmitButton({ label: 'Submit' });
            return form;
        }

        const closeVRMA = (vrmaId) => {
            let cvrmaRec = record.load({
                type: record.Type.VENDOR_RETURN_AUTHORIZATION,
                id: vrmaId
            });
            let lineCount = cvrmaRec.getLineCount('item');
            for(z = 0; z < lineCount; z++){
                cvrmaRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'isclosed',
                    line: z,
                    value: true
                });
            }
            return cvrmaRec.save();
        }

        const createCloseReason = (data) => {
            let crRec = record.create({
                type: 'customrecord_8q_vcr_vrma_close_reason'
            });
            if(data.close_status){
                crRec.setValue({
                    fieldId: 'custrecord_8q_vcr_close_status',
                    value: data.close_status
                });
            }
            if(data.reason){
                crRec.setValue({
                    fieldId: 'custrecord_8q_vcr_reason',
                    value: data.reason
                });
            }
            if(data.vrma_id){
                crRec.setValue({
                    fieldId: 'custrecord_8q_vcr_vrma_rec',
                    value: data.vrma_id
                });
            }
            return crRec.save();
        }

        return { onRequest }

    });
