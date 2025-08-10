/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/url'],

    (url) => {
        let popupWIndow;

        const pageInit = () => {
            // Do Nothing
        }

        const openPopup = (vrmaId) => {
            try {
                popupWIndow.close();
            } catch (e) {

            }
            let suiteletUrl = url.resolveScript({
                scriptId: 'customscript_8q_vcr_sl_vrma_cl_rea_form',
                deploymentId: 'customdeploy_8q_vcr_sl_vrma_cl_rea_form',
                params: {
                    custscript_8q_sl_vcr_vrmaid: vrmaId
                }
            });

            popupWIndow = window.open(suiteletUrl, "_blank", "toolbar=no, scrollbars=no, menubar=no, titlebar=no, resizable=no, left=500, top=100, width=500, height=500");
        }

        return {
            pageInit: pageInit,
            openPopup: openPopup
        };

    });
