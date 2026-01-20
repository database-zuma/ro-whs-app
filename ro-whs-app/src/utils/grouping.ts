import { ROItem } from '../types';

export interface GroupedRO {
    id: string; // The session ID (e.g. RO-2511-0007)
    storeName: string;
    timestamp: string;
    status: ROItem['status']; // Derived from first item (assuming consistency)
    items: ROItem[];
}

export const groupItemsByROId = (items: ROItem[]): GroupedRO[] => {
    const groups: Record<string, GroupedRO> = {};

    items.forEach(item => {
        if (!groups[item.id]) {
            groups[item.id] = {
                id: item.id,
                storeName: item.storeName,
                timestamp: item.timestamp,
                status: item.status,
                items: []
            };
        }
        groups[item.id].items.push(item);
    });

    return Object.values(groups);
};
