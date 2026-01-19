export type ROStatus =
    | 'QUEUE'
    | 'PICKING_LIST'
    | 'FINAL_PICKING'
    | 'DNPB_PROCESS'
    | 'DELIVERY'
    | 'ARRIVED_STORE'
    | 'COMPLETED';

export interface ROItem {
    uid: string; // Internal unique ID for React keys & editing
    id: string; // SESSION ID
    storeName: string;
    kodeArtikel: string;
    artikel: string;
    roQty: {
        ddd: number;
        ljbb: number;
    };
    whQty: {
        ddd: number;
        ljbb: number;
    };
    timestamp: string;
    status: ROStatus;
}

export const STATUS_LABELS: Record<ROStatus, string> = {
    'QUEUE': 'Queue',
    'PICKING_LIST': 'Picking List',
    'FINAL_PICKING': 'Final Picking',
    'DNPB_PROCESS': 'DNPB Process',
    'DELIVERY': 'Delivery',
    'ARRIVED_STORE': 'Arrived Store',
    'COMPLETED': 'Completed'
};

export const STATUS_FLOW: ROStatus[] = [
    'QUEUE',
    'PICKING_LIST',
    'FINAL_PICKING',
    'DNPB_PROCESS',
    'DELIVERY',
    'ARRIVED_STORE',
    'COMPLETED'
];
