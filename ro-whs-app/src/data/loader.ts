import Papa from 'papaparse';
import { RAW_CSV_DATA } from './initialData';
import { ROItem, ROStatus } from '../types';

export const parseROData = (): ROItem[] => {
    const result = Papa.parse(RAW_CSV_DATA, {
        header: true,
        skipEmptyLines: true,
    });

    return result.data.map((row: any, index: number) => {
        // Normalize status
        let statusRaw = (row['STATUS'] || '').toUpperCase();
        if (statusRaw === 'QUEQUE') statusRaw = 'QUEUE';

        const validStatus: ROStatus = statusRaw as ROStatus;

        return {
            uid: `row-${index}-${Date.now()}`, // Generate unique ID
            id: row['SESSION ID'],
            storeName: row['STORE NAME'],
            kodeArtikel: row['KODE ARTIKEL'],
            artikel: row['ARTIKEL'],
            roQty: {
                ddd: parseInt(row['RO BOX DDD'] || '0', 10),
                ljbb: parseInt(row['RO BOX LJBB'] || '0', 10),
            },
            whQty: {
                ddd: parseInt(row['WHS DDD'] || '0', 10),
                ljbb: parseInt(row['WHS LJBB'] || '0', 10),
            },
            timestamp: row['TIMESTAMP'],
            status: validStatus,
        };
    });
};
