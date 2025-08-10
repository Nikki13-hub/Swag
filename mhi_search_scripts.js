function mainApp() {
 var context = nlapiGetContext();	
 var searchText = 'customrecord_nsps_staging_orders';
 var sendEmail = 'timothy.sayles@myersholum.com';
 nlapiLogExecution('debug',sendEmail,searchText);
 var csvBody = "";
 try {
	var columns = new Array();
	columns[0] = new nlobjSearchColumn("name").setSort(false); 
	columns[1] = new nlobjSearchColumn("name","file",null);
	columns[2] = new nlobjSearchColumn("internalid","file",null);
    var folderSearch = nlapiSearchRecord("folder",null,
		[
		   ["internalid","anyof","-15","1578","1594","1585","1597","30742","1586","1579","1591","1581","1588","1580","1598","1599"]
   ], 
		columns  
		);
	nlapiLogExecution('debug',sendEmail,folderSearch.length + ' Javascript files found');
		for (var i = 0 ; folderSearch != null && i < folderSearch.length; i++) {
			var fLine = folderSearch[i];
			//nlapiLogExecution('debug',sendEmail,f);
			var fileId = fLine.getValue(columns[2]);
			var fileName = fLine.getValue(columns[1]);
			nlapiLogExecution('debug',sendEmail,'Searching file ' + fileId + ' ' + fileName);
	     try {
               var file = nlapiLoadFile(fileId);
               var index = file.getValue().toLowerCase().indexOf(searchText.toLowerCase());
			   if (index > 0) {
			   csvBody += 'Text ' + (index > 0 ? 'FOUND' : 'NOT found') + ' on File ' + file.getName() + '\n';
			   nlapiLogExecution('debug',sendEmail,'Text ' + (index > 0 ? 'FOUND' : 'NOT found') + ' on File ' + file.getName() + '\n');
			   }
          } catch(e2) {
               csvBody += 'ERROR While loading File ID: ' + fileId + '/n';
			   nlapiLogExecution('debug',sendEmail,'ERROR While loading File ID: ' + fileId);
	      }
     }
 }
 catch(e1) {}; 
if (csvBody) {
var objFile = nlapiCreateFile(searchText + '_CSV_File.csv', 'CSV', csvBody);
objFile.setFolder(-15);
var id = nlapiSubmitFile(objFile);
var file = nlapiLoadFile(id);
//nlapiSendEmail(12403, sendEmail, 'Result for ' + searchText, 'See attached File', null, null, null, file);
//nlapiLogExecution('debug',sendEmail,'Results emailed for ' + searchText);

}
}