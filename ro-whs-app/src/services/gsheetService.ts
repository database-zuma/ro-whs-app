const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyZvkni6zsJkOGwb9xB5QewZSFUQ5nmeaHb4t3gfeR4whw_zOcrh0UJESp_TFoirMvLQg/exec";
// Use CSV output for Reading (Bypasses CORS/Auth issues for public sheets)
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR81nB2kdJlbcNmzSdwcAFKuGIv96gnE3MdPDC-qKLpWkqJDwg-67_b7ilpItiIJF420L9Mz8WRitfl/pub?output=csv";

import Papa from 'papaparse';

export const RO_DATABASE_SHEET = "RO WHS - 01 Queue Databases";

/**
 * Service to handle interactions with Google Sheets via Apps Script & Public CSV
 */
export const gsheetService = {
    /**
     * Fetch current RO Queue
     */
    fetchROQueue: async () => {
        try {
            console.log("Fetching from Public CSV...");
            // HYBRID APPROACH: Read from Public CSV (Fast, No CORS, No Auth)
            // Add cache busting to ensure we get the latest data
            const cacheBuster = new Date().getTime();
            const response = await fetch(`${SHEET_CSV_URL}&t=${cacheBuster}`);
            const csvText = await response.text();

            return new Promise((resolve) => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const rawData = results.data;
                        console.log("CSV Parsed:", rawData);

                        // Transform raw sheet data (Headers) to App types (CamelCase)
                        const transformed = rawData.map((row: any) => {
                            // Normalize status (Handle Spaces vs Underscores, and Typos)
                            let statusRaw = (row['Status'] || row['STATUS'] || '').toUpperCase();
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
                        });
                        resolve(transformed);
                    },
                    error: (err) => {
                        console.error("CSV Parse Error:", err);
                        resolve([]);
                    }
                });
            });

        } catch (error) {
            console.error("Error fetching RO Queue:", error);
            return [];
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
