import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ROItem, ROStatus, STATUS_FLOW } from '../types';
import { parseROData } from '../data/loader';
import { gsheetService } from '../services/gsheetService';

// TODO: Replace local state with gsheetService in future implementation
// const { fetchROQueue, fetchWarehouseStock } = gsheetService;

interface ROContextType {
    items: ROItem[];
    moveStatus: (roId: string) => void;
    updateQty: (uid: string, scope: 'ro' | 'wh', location: 'ddd' | 'ljbb', value: number) => void;
    getFormattedItems: (statusFilter?: ROStatus) => ROItem[];
    connectionStatus: {
        isConnected: boolean;
        lastSync: Date | null;
    };
}

const ROContext = createContext<ROContextType | undefined>(undefined);

export const ROProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<ROItem[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<{
        isConnected: boolean;
        lastSync: Date | null;
    }>({
        isConnected: false,
        lastSync: null,
    });

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await gsheetService.fetchROQueue();
                setItems(data);
                setConnectionStatus({
                    isConnected: true,
                    lastSync: new Date(),
                });
            } catch (error) {
                console.error('Failed to connect to Google Sheets:', error);
                setConnectionStatus({
                    isConnected: false,
                    lastSync: null,
                });
            }
        };
        loadData();

        // Poll every 30 seconds to check connection status
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const moveStatus = (roId: string) => {
        // Optimistic UI Update
        const targetItems = items.filter(item => item.id === roId);
        if (targetItems.length === 0) return;

        const currentStatus = targetItems[0].status;
        const currentIndex = STATUS_FLOW.indexOf(currentStatus);

        if (currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1) {
            const nextStatus = STATUS_FLOW[currentIndex + 1];

            // 1. Update UI immediately
            setItems(prev => prev.map(item => {
                if (item.id === roId) {
                    return { ...item, status: nextStatus };
                }
                return item;
            }));

            // 2. Sync to Backend
            gsheetService.syncToGSheet({
                action: "moveStatus",
                roId: roId,
                newStatus: nextStatus
            });
        }
    };

    const updateQty = (uid: string, scope: 'ro' | 'wh', location: 'ddd' | 'ljbb', value: number) => {
        // Optimistic UI Update
        setItems(prev => prev.map(item => {
            if (item.uid === uid) {
                const field = scope === 'ro' ? 'roQty' : 'whQty';
                return {
                    ...item,
                    [field]: {
                        ...item[field],
                        [location]: value
                    }
                };
            }
            return item;
        }));

        // Sync to Backend
        // Debounce could be added here, but for now we send direct updates
        if (scope === 'ro') {
            // Find criteria from item
            const targetItem = items.find(i => i.uid === uid);
            if (targetItem) {
                gsheetService.syncToGSheet({
                    action: "updateQty",
                    roId: targetItem.id,
                    kodeArtikel: targetItem.kodeArtikel,
                    location: location, // 'ddd' or 'ljbb'
                    val: value
                });
            }
        }
    };

    const getFormattedItems = (statusFilter?: ROStatus) => {
        if (!statusFilter) return items;
        return items.filter(item => item.status === statusFilter);
    };

    return (
        <ROContext.Provider value={{ items, moveStatus, updateQty, getFormattedItems, connectionStatus }}>
            {children}
        </ROContext.Provider>
    );
};

export const useRO = () => {
    const context = useContext(ROContext);
    if (!context) {
        throw new Error('useRO must be used within a ROProvider');
    }
    return context;
};
