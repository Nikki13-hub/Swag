/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/https', 'N/record', 'N/log','N/search'], function(https, record, log, search) {

    function execute(context) {
      try {
        const apiToken = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjUzMzcxNDkyOCwiYWFpIjoxMSwidWlkIjo3NzI5NDY4MCwiaWFkIjoiMjAyNS0wNy0wMlQwMjoxMzo0MC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjkwOTM0NTQsInJnbiI6InVzZTEifQ.b-L83VAyqBBo8kKVRUnt9XbiYuTV9dyN0eA0d9M5xVo';
        const boardId = '9510934617'; // your board ID
  const board_query = `query {
  boards(ids: 9510934617) {
    items_page {
      items {
        id
        name
        column_values (ids: ["status", "priority"]) { id text value }
      }
    }
  }
}`;
  
        const response = https.post({
      url: 'https://api.monday.com/v2',
      headers: {
          'Authorization': apiToken,
          'Content-Type': 'application/json',
      'Accept': 'application/json'
      },
      body: JSON.stringify({ query: board_query })
  });
  
        const data = JSON.parse(response.body);
        log.debug('data',data);

     var items_length = (data.data.boards[0].items_page.items).length;  
        log.debug('items_length',items_length);
        var arr=[];
    for(var i=0;i<items_length;i++ ){   
      var item_id = data.data.boards[0].items_page.items[i].id;
      
      var status = data.data.boards[0].items_page.items[i].column_values[0].text;
       log.debug('status',status);

      arr.push({"itemid":item_id, "itemstatus":status});
      log.debug('arr',arr);

    }
        for(var j=0;j<arr.length;j++){
          log.debug('arr[j].itemid',arr[j].itemid);
       
          var customrecord_universal_ticketSearchObj = search.create({
   type: "customrecord_universal_ticket",
   filters:
   [
      ["custrecord_monday_item_id","is",arr[j].itemid]
   ],
   columns:
   [
      search.createColumn({name: "custrecord_ticket_status", label: "Ticket status"}),
   ]
}).run().getRange(0,1);
          log.debug('customrecord_universal_ticketSearchObj',customrecord_universal_ticketSearchObj);
    if(customrecord_universal_ticketSearchObj.length>0){      
record.submitFields({
    type: 'customrecord_universal_ticket',
    id: customrecord_universal_ticketSearchObj[0].id,
    values: {
        'custrecord_ticket_status': arr[j].itemstatus
    }
});
    }
        }
      } catch (e) {
        log.error('Scheduled Script Error', e.message);
      }
    }
  
    return { execute };
  });
