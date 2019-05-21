var sheetName = 'Pogo Sync';
var logSheetName = 'History';
var scriptProperties = PropertiesService.getScriptProperties()

// Run the function initialsetup to create the sheet for storing and retrieving our data
function initialSetup () {
  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  
  var pogoSyncSheet = activeSpreadsheet.getSheetByName(sheetName);  
  // Create the proper sheet if it doesn't already exist. It will be the default active.
  if (pogoSyncSheet === null) {
    pogoSyncSheet = activeSpreadsheet.insertSheet(sheetName);    
    
    // Set appropriate column headers
    pogoSyncSheet.appendRow(['guid','lastupdate','title','lat','lng','type']);
   // Set column format    
    var latColumn = pogoSyncSheet.getRange("D2:D");
    var lngColumn = pogoSyncSheet.getRange("E2:E");
    
    // Plain text
    latColumn.setNumberFormat("@");
    lngColumn.setNumberFormat("@");
  }    
    
  var historySheet = activeSpreadsheet.getSheetByName(logSheetName);  
  if (historySheet === null) {
    historySheet = activeSpreadsheet.insertSheet(logSheetName);    
    
    // Set appropriate column headers
    historySheet.appendRow(['guid','lastupdate','title','lat','lng','type', 'username', 'date']);
   // Set column format    
    var latColumn = historySheet.getRange("D2:D");
    var lngColumn = historySheet.getRange("E2:E");
    
    // Plain text
    latColumn.setNumberFormat("@");
    lngColumn.setNumberFormat("@");
  }    
       
  scriptProperties.setProperty('key', activeSpreadsheet.getId());
}

function getSheet() {  
  var doc = SpreadsheetApp.openById(scriptProperties.getProperty('key'))
  return doc.getSheetByName(sheetName); 
}

function getHistorySheet() {  
  var doc = SpreadsheetApp.openById(scriptProperties.getProperty('key'))
  return doc.getSheetByName(logSheetName); 
}

function doPost(e) { 
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {    
    var sheet = getSheet(sheetName)

    var allValues = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    var headers = allValues[0];    
    var nextRow = sheet.getLastRow() + 1
    
    var isUpdate = false;    
    var originalId = null;
    var newRow = headers.map(function(header) {
     switch (header) {
       case 'lastupdate':
         return (new Date()).valueOf();
         break;
       case 'guid':
            isUpdate = true;
            originalId = e.parameter[header];
            return e.parameter[header];

         break;
       default:
         return e.parameter[header];
         break;         
      }            
    });
    
    if (isUpdate) {
        var obj = allValues.map(function(values) {
          return headers.reduce(function(o, k, i) {
            o[k] = values[i];
            return o;
          }, {});
        });
                  
         // loop through all the data
      var currentRowData = '';
      obj.forEach(function(row, rowIdx){
        // Find id and rownumber of existing item
        if (row.guid === originalId){
           nextRow = rowIdx + 1;
           currentRowData = row;
        }
      });
      
    }
        
    // Add or update;
    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);   
    
    var resultArray = [newRow];
    var resultObject = resultArray.map(function(values) {
          return headers.reduce(function(o, k, i) {
            o[k] = values[i];
            return o;
          }, {});
     });

    // history
    var historySheet = getHistorySheet();
    var nextRow = historySheet.getLastRow() + 1
    newRow.push(e.parameter['nickname']);
    newRow.push(new Date());
    historySheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);   
        
    return ContentService
      .createTextOutput(JSON.stringify(resultObject[0]))
      .setMimeType(ContentService.MimeType.JSON)     
    
  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e }))
      .setMimeType(ContentService.MimeType.JSON)
  }
  finally {
    lock.releaseLock()
  }
}

function testDoGet() {
  var lock = LockService.getScriptLock()
  lock.tryLock(10000)  
  try {
    var sheet = getSheet();

    var allValues = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    var header = allValues[0];     
    var obj = allValues.map(function(values) {
          return header.reduce(function(o, k, i) {
            o[k] = values[i];           
            return o;           
          }, {});
     });
    if (obj.length > 0) {
      obj.shift();
    }

    Logger.log(JSON.stringify(obj));
        
  } catch (e) {
    
  }

  finally {
    lock.releaseLock()
  }
}

function doGet (e) {   
  var lock = LockService.getScriptLock()
  lock.tryLock(10000)  
  try {    
    var since = e.parameter.since || 0;
    
    var sheet = getSheet();

    var allValues = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    if (allValues.length > 1) {
    var header = allValues[0];  
      // First row contains the headers themself. Remove it from the array.
      allValues.shift();
      if (since > 0) {
        var filtered = allValues.filter(function(o) {
          return o[1]>since;
        });
        allValues = filtered;
      }
      
      var obj = allValues.map(function(values) {
        return header.reduce(function(o, k, i) {
          o[k] = values[i];           
          return o;           
        }, {});
      });
      
      return ContentService
      .createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON)    
    }
    
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON)    

  }

  catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': e }))
      .setMimeType(ContentService.MimeType.JSON)
  }

  finally {
    lock.releaseLock()
  }
}
