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
      var id = new Date().getTime().toString().slice(-6);
      // Use provided timestamp or current server time
      var timestamp = params.timestamp || new Date().toLocaleString();
      
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
        timestamp,
        ''  // FixTime (Empty on create)
      ]);
      
      return responseJSON({ status: 'success', message: 'Reported successfully' });
    } 
    
    else if (action === 'update' || action === 'delete') {
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
        if (action === 'delete') {
          sheet.deleteRow(rowIndex);
          return responseJSON({ status: 'success', message: 'Deleted successfully' });
        }
        else if (action === 'update') {
          // If params contains report fields (Module, Function, etc.), update them
          // We check if specific fields exist in params to decide what to update
          // But to be safe, we can just update everything if provided, or fallback to existing
          
          // Helper to get value or keep existing. 
          // Note: data[i] is the row array (0-based)
          var currentRow = data[rowIndex - 1]; 
          
          var vals = [
             // Col 1: ID (Skip)
             // Col 2: Status
             params.status || currentRow[1],
             // Col 3: Module
             params.module || currentRow[2],
             // Col 4: Function
             params.functionName || currentRow[3],
             // Col 5: Code
             params.code || currentRow[4],
             // Col 6: Url
             params.url || currentRow[5],
             // Col 7: Reporter
             params.reporter || currentRow[6],
             // Col 8: Description
             params.description || currentRow[7],
             // Col 9: Fixer
             params.fixer || currentRow[8],
             // Col 10: FixNote
             params.fixNote || currentRow[9],
             // Col 11: Timestamp (Report Time)
             params.timestamp || currentRow[10],
             // Col 12: FixTime
             params.fixTime || currentRow[11]
          ];

          // Write back columns B to L (Index 2 to 12 in 1-based notation)
          // Range: Row, Column, NumRows, NumColumns
          // We want to write specific cells or the whole row. 
          // Set values for Col B (2) to L (12). Length is 11.
          sheet.getRange(rowIndex, 2, 1, 11).setValues([vals]);
          
          return responseJSON({ status: 'success', message: 'Updated successfully' });
        }
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
