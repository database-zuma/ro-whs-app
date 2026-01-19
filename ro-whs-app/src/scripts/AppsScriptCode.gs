/**
 * Google Apps Script for RO WHS Database
 * This script acts as a backend API for the RO WHS Web App
 * 
 * IMPORTANT: Deploy as Web App with:
 * - Execute as: Me
 * - Who has access: Anyone (or "Anyone with a Google Account" if "Anyone" is blocked)
 */

const RO_DATABASE_SHEET_NAME = "RO WHS - 01 Queue Databases";

/**
 * Handle GET requests - Returns all data as JSON
 */
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RO_DATABASE_SHEET_NAME);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Sheet not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  // Convert rows to array of objects
  const result = rows.map((row) => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests - Updates data
 * Accepts JSON payload with action, roId, and other params
 */
function doPost(e) {
  // Log the request for debugging
  Logger.log("POST received");
  Logger.log("Content: " + e.postData.contents);
  
  try {
    const params = JSON.parse(e.postData.contents);
    Logger.log("Parsed params: " + JSON.stringify(params));
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RO_DATABASE_SHEET_NAME);
    
    if (!sheet) {
      throw new Error("Sheet not found");
    }
    
    // Example Action: Update RO Qty
    if (params.action === "updateQty") {
      Logger.log("Updating qty for: " + params.roId + " / " + params.kodeArtikel);
      updateRowQty(sheet, params.roId, params.kodeArtikel, params.location, params.val);
    } 
    // Example Action: Move Status
    else if (params.action === "moveStatus") {
      Logger.log("Moving status for: " + params.roId + " to " + params.newStatus);
      updateRowStatus(sheet, params.roId, params.newStatus);
    }

    Logger.log("Success");
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- Helper Functions ---

function updateRowQty(sheet, roId, kodeArtikel, location, val) {
  const data = sheet.getDataRange().getValues();
  const HEADERS = data[0];
  
  // Dynamic Header Matching for ID
  let ID_COL_INDEX = HEADERS.indexOf("RO ID");
  if (ID_COL_INDEX === -1) ID_COL_INDEX = HEADERS.indexOf("SESSION ID");

  // Dynamic Header Matching for Article Code
  let ART_COL_INDEX = HEADERS.indexOf("KODE ARTIKEL");
  if (ART_COL_INDEX === -1) ART_COL_INDEX = HEADERS.indexOf("Kode Artikel");
  
  if (ID_COL_INDEX === -1 || ART_COL_INDEX === -1) {
    throw new Error("Columns 'SESSION ID' or 'KODE ARTIKEL' not found. Headers: " + HEADERS.join(", "));
  }

  // Find which column to update based on location
  let TARGET_COL_INDEX = -1;
  
  if (location === 'ddd') {
     TARGET_COL_INDEX = HEADERS.indexOf("RO Qty DDD");
     if (TARGET_COL_INDEX === -1) TARGET_COL_INDEX = HEADERS.indexOf("RO BOX DDD");
  }
  if (location === 'ljbb') {
     TARGET_COL_INDEX = HEADERS.indexOf("RO Qty LJBB");
     if (TARGET_COL_INDEX === -1) TARGET_COL_INDEX = HEADERS.indexOf("RO BOX LJBB");
  }

  if (TARGET_COL_INDEX === -1) {
    throw new Error("Target column not found for location: " + location + ". Headers: " + HEADERS.join(", "));
  }

  Logger.log("Looking for ID=" + roId + " and Article=" + kodeArtikel);
  Logger.log("ID column: " + ID_COL_INDEX + ", Article column: " + ART_COL_INDEX + ", Target column: " + TARGET_COL_INDEX);

  let found = false;
  for (let i = 1; i < data.length; i++) {
    // Check BOTH ID and Article Code to find unique row
    if (data[i][ID_COL_INDEX] == roId && data[i][ART_COL_INDEX] == kodeArtikel) {
      Logger.log("Found row " + (i+1) + ", updating from " + data[i][TARGET_COL_INDEX] + " to " + val);
      sheet.getRange(i + 1, TARGET_COL_INDEX + 1).setValue(val);
      found = true;
      break;
    }
  }
  
  if (!found) {
    throw new Error("Row not found for ID=" + roId + " and Article=" + kodeArtikel);
  }
}

function updateRowStatus(sheet, roId, newStatus) {
  const data = sheet.getDataRange().getValues();
  const HEADERS = data[0];
  
  // Dynamic Header Matching for ID
  let ID_COL_INDEX = HEADERS.indexOf("RO ID");
  if (ID_COL_INDEX === -1) ID_COL_INDEX = HEADERS.indexOf("SESSION ID");
  
  // Dynamic Header Matching for Status
  let STATUS_COL_INDEX = HEADERS.indexOf("Status");
  if (STATUS_COL_INDEX === -1) STATUS_COL_INDEX = HEADERS.indexOf("STATUS");

  if (ID_COL_INDEX === -1 || STATUS_COL_INDEX === -1) {
    throw new Error("Columns for Status Update not found. Headers: " + HEADERS.join(", "));
  }

  Logger.log("Looking for ID=" + roId);
  Logger.log("ID column: " + ID_COL_INDEX + ", Status column: " + STATUS_COL_INDEX);

  let updated = 0;
  for (let i = 1; i < data.length; i++) {
    // Loose equality for ID matching
    if (data[i][ID_COL_INDEX] == roId) {
      // Convert enum format back to sheet format
      let saveValue = newStatus;
      if (newStatus === 'PICKING_LIST') saveValue = 'PICKING LIST';
      if (newStatus === 'FINAL_PICKING') saveValue = 'FINAL PICKING';
      if (newStatus === 'DNPB_PROCESS') saveValue = 'DNPB PROCESS';
      if (newStatus === 'ARRIVED_STORE') saveValue = 'ARRIVED STORE';
      
      Logger.log("Updating row " + (i+1) + " from '" + data[i][STATUS_COL_INDEX] + "' to '" + saveValue + "'");
      sheet.getRange(i + 1, STATUS_COL_INDEX + 1).setValue(saveValue);
      updated++;
    }
  }
  
  Logger.log("Updated " + updated + " rows");
  
  if (updated === 0) {
    throw new Error("No rows found for ID=" + roId);
  }
}
