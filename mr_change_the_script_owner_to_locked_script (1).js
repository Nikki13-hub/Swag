/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
 define(['N/record', 'N/search', 'N/log'], (record, search, log) => {

  const OWNER_ID = 22178; 

  function getInputData() {
      return search.create({
   type: "scriptdeployment",
   filters:
   [
      ["isdeployed","is","T"], 
      "AND", 
      ["status","anyof","RELEASED","NOTSCHEDULED","SCHEDULED","INPROGRESS","INQUEUE","COMPLETED"], 
      "AND", 
      ["script.isinactive","is","F"]
   ],
   columns:
   [
      search.createColumn({
         name: "owner",
         join: "script",
         label: "Owner"
      }),
      search.createColumn({name: "script", label: "Script ID"}),
      search.createColumn({name: "title", label: "Title"}),
      search.createColumn({name: "status", label: "Status"}),
      search.createColumn({name: "isdeployed", label: "Is Deployed"}),
      search.createColumn({name: "scripttype", label: "Script Type"})
   ]
});

  }

  function map(context) {
      const result = JSON.parse(context.value);
      const scriptId = result.values['script'].value;

      try {
          log.debug('Updating Script Owner', `Script ID: ${scriptId}`);

          const scriptRec = record.load({
              type: 'script',
              id: scriptId,
              isDynamic: true
          });

          scriptRec.setValue({
              fieldId: 'owner',
              value: OWNER_ID
          });

          scriptRec.save();

      } catch (e) {
          log.error(`Failed to update script ID ${scriptId}`, e.message);
      }
  }

  return { getInputData:getInputData
    , map:map };
});
