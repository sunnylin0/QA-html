function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);
  
  var result = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      obj[header] = row[index];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    
    if (action === 'create') {
      var id = new Date().getTime().toString().slice(-6); // Simple random ID
      var timestamp = new Date().toLocaleString();
      // Columns: ID, Status, Module, Function, Code, Url, Reporter, Description, Fixer, FixNote, Timestamp
      // Index:   0,  1,      2,      3,        4,    5,   6,        7,           8,     9,       10
      
      sheet.appendRow([
        id, 
        'New', 
        params.module, 
        params.functionName, 
        params.code, 
        params.url, 
        params.reporter, 
        params.description, 
        '', // Fixer
        '', // FixNote
        timestamp
      ]);
      
      return responseJSON({ status: 'success', message: 'Reported successfully' });
    } 
    
    else if (action === 'update') {
      var id = params.id;
      var data = sheet.getDataRange().getValues();
      var rowIndex = -1;
      
      // Find row by ID (Column A is index 0)
      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString() === id.toString()) {
          rowIndex = i + 1; // 1-based index
          break;
        }
      }
      
      if (rowIndex > 0) {
        // Update Status (Col 2/B), Fixer (Col 9/I), FixNote (Col 10/J)
        sheet.getRange(rowIndex, 2).setValue(params.status);
        sheet.getRange(rowIndex, 9).setValue(params.fixer);
        sheet.getRange(rowIndex, 10).setValue(params.fixNote);
        
        return responseJSON({ status: 'success', message: 'Updated successfully' });
      } else {
        return responseJSON({ status: 'error', message: 'ID not found' });
      }
    }
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
