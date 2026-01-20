const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbybtmlhlca_8vqfyoQZXHQfa_N9dHLjV2pKxoUjkowScbeKaAJ16nVCkL--9QP-WW-7lA/exec";
// Fallback: CSV output (has 5-15 min cache delay, use only if Apps Script fails)
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR81nB2kdJlbcNmzSdwcAFKuGIv96gnE3MdPDC-qKLpWkqJDwg-67_b7ilpItiIJF420L9Mz8WRitfl/pub?output=csv";

import Papa from 'papaparse';

export const RO_DATABASE_SHEET = "RO WHS - 01 Queue Databases";

/**
 * Transform raw sheet row to app format
 */
const transformRow = (row: any) => {
    // Normalize status (Handle Spaces vs Underscores, and Typos)
    let statusRaw = (row['Status'] || row['STATUS'] || '').toString().toUpperCase();
    statusRaw = statusRaw.replace(/ /g, '_'); // Replace spaces with underscores matches Enum

    if (statusRaw === 'QUEQUE') statusRaw = 'QUEUE';

    return {
        uid: row['UID'] || `gen-${Math.random().toString(36).substr(2, 9)}`,
        id: row['RO ID'] || row['SESSION ID'],
        storeName: row['Store Name'] || row['STORE NAME'],
        kodeArtikel: row['Kode Artikel'] || row['KODE ARTIKEL'],
        artikel: row['Artikel Name'] || row['ARTIKEL'],
        roQty: {
            ddd: parseInt(row['RO Qty DDD'] || row['RO BOX DDD'] || '0', 10),
            ljbb: parseInt(row['RO Qty LJBB'] || row['RO BOX LJBB'] || '0', 10),
        },
        whQty: {
            ddd: parseInt(row['WH Qty DDD'] || row['WHS DDD'] || '0', 10),
            ljbb: parseInt(row['WH Qty LJBB'] || row['WHS LJBB'] || '0', 10),
        },
        timestamp: row['Timestamp'] || row['TIMESTAMP'],
        status: statusRaw,
    };
};

/**
 * Service to handle interactions with Google Sheets via Apps Script
 */
export const gsheetService = {
    /**
     * Fetch current RO Queue - Uses Apps Script for real-time data
     */
    fetchROQueue: async () => {
        try {
            // PRIMARY: Use Apps Script doGet for real-time data (no cache delay)
            console.log("Fetching from Apps Script (real-time)...");
            const response = await fetch(APPS_SCRIPT_URL, {
                method: "GET",
                headers: { "Accept": "application/json" }
            });

            if (!response.ok) {
                throw new Error(`Apps Script returned ${response.status}`);
            }

            const text = await response.text();
            let rawData;
            try {
                rawData = JSON.parse(text);
            } catch {
                throw new Error("Failed to parse Apps Script response as JSON");
            }

            if (rawData.error) {
                throw new Error(rawData.error);
            }

            console.log("Apps Script data:", rawData);
            const transformed = rawData.map(transformRow);
            return transformed;

        } catch (appsScriptError) {
            // FALLBACK: Use published CSV if Apps Script fails (has cache delay)
            console.warn("Apps Script fetch failed, falling back to CSV:", appsScriptError);

            try {
                console.log("Fetching from Public CSV (fallback)...");
                const cacheBuster = new Date().getTime();
                const response = await fetch(`${SHEET_CSV_URL}&t=${cacheBuster}`);
                const csvText = await response.text();

                return new Promise((resolve) => {
                    Papa.parse(csvText, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            const rawData = results.data;
                            console.log("CSV Parsed (fallback):", rawData);
                            const transformed = rawData.map((row: any) => transformRow(row));
                            resolve(transformed);
                        },
                        error: (err) => {
                            console.error("CSV Parse Error:", err);
                            resolve([]);
                        }
                    });
                });
            } catch (csvError) {
                console.error("Both Apps Script and CSV fetch failed:", csvError);
                return [];
            }
        }
    },

    /**
     * Fetch Warehouse Stock levels (Placeholder)
     */
    fetchWarehouseStock: async () => {
        console.log("Fetching WH Stock...");
        return [];
    },

    /**
     * Sync local changes back to GSheet
     */
    syncToGSheet: async (payload: any) => {
        if (!APPS_SCRIPT_URL) return;

        try {
            console.log("Syncing to GSheet:", payload);
            // payload format: { action: "updateQty", roId: "...", kodeArtikel: "...", location: "...", val: 123 }
            // or { action: "moveStatus", roId: "...", newStatus: "..." }
            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });

            const result = await response.text();
            console.log("GSheet Sync Response:", result);

            if (!response.ok) {
                console.error("GSheet Sync Failed:", response.status, result);
            }
        } catch (error) {
            console.error("Error syncing to GSheet:", error);
        }
    }
};
