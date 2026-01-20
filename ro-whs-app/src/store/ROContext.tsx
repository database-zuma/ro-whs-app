import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { ROItem, ROStatus, STATUS_FLOW } from '../types';
import { parseROData } from '../data/loader';
import { gsheetService } from '../services/gsheetService';

// TODO: Replace local state with gsheetService in future implementation
// const { fetchROQueue, fetchWarehouseStock } = gsheetService;

// Duration to protect local changes from being overwritten by polling (in ms)
// Must be longer than polling interval to prevent race conditions
const PENDING_CHANGE_PROTECTION_MS = 90000; // 90 seconds

// Debounce delay for qty changes to prevent rapid-fire syncs
const QTY_SYNC_DEBOUNCE_MS = 800; // Wait 800ms after last keystroke before syncing

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

    // Track items with pending local changes to prevent poll overwrites
    // Map of uid/roId -> timestamp when change was made
    const pendingChangesRef = useRef<Map<string, number>>(new Map());

    // Track debounce timeouts for qty syncs
    // Map of uid -> timeout ID
    const qtySyncTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Helper to check if an item has pending local changes
    const hasPendingChanges = (key: string): boolean => {
        const changeTime = pendingChangesRef.current.get(key);
        if (!changeTime) return false;
        const now = Date.now();
        if (now - changeTime > PENDING_CHANGE_PROTECTION_MS) {
            // Expired, remove from tracking
            pendingChangesRef.current.delete(key);
            return false;
        }
        return true;
    };

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                const fetchedData = await gsheetService.fetchROQueue();

                setItems(currentItems => {
                    // If no current items (initial load), just use fetched data
                    if (currentItems.length === 0) {
                        return fetchedData;
                    }

                    // Merge fetched data with current items, preserving local changes
                    const now = Date.now();

                    // Clean up expired pending changes
                    pendingChangesRef.current.forEach((changeTime, key) => {
                        if (now - changeTime > PENDING_CHANGE_PROTECTION_MS) {
                            pendingChangesRef.current.delete(key);
                        }
                    });

                    // Create a map of current items for quick lookup
                    const currentItemsMap = new Map(currentItems.map(item => [item.uid, item]));

                    // Merge: use fetched data but preserve local qty/status for pending items
                    return fetchedData.map(fetchedItem => {
                        const currentItem = currentItemsMap.get(fetchedItem.uid);

                        if (!currentItem) {
                            // New item from server
                            return fetchedItem;
                        }

                        // Check if this item has pending changes
                        const hasQtyChange = hasPendingChanges(`qty:${fetchedItem.uid}`);
                        const hasStatusChange = hasPendingChanges(`status:${fetchedItem.id}`);

                        if (!hasQtyChange && !hasStatusChange) {
                            // No pending changes, use server data
                            return fetchedItem;
                        }

                        // Preserve local changes
                        return {
                            ...fetchedItem,
                            roQty: hasQtyChange ? currentItem.roQty : fetchedItem.roQty,
                            status: hasStatusChange ? currentItem.status : fetchedItem.status,
                        };
                    });
                });

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

        // Poll every 60 seconds to reduce race conditions with GSheet save time
        const interval = setInterval(loadData, 60000);
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

            // 1. Mark as pending to protect from poll overwrites
            pendingChangesRef.current.set(`status:${roId}`, Date.now());

            // 2. Update UI immediately
            setItems(prev => prev.map(item => {
                if (item.id === roId) {
                    return { ...item, status: nextStatus };
                }
                return item;
            }));

            // 3. Sync to Backend
            gsheetService.syncToGSheet({
                action: "moveStatus",
                roId: roId,
                newStatus: nextStatus
            });
        }
    };

    const updateQty = (uid: string, scope: 'ro' | 'wh', location: 'ddd' | 'ljbb', value: number) => {
        // 1. Mark as pending to protect from poll overwrites
        pendingChangesRef.current.set(`qty:${uid}`, Date.now());

        // 2. Optimistic UI Update (immediate)
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

        // 3. Debounced Sync to Backend
        // Cancel any pending sync for this uid to prevent race conditions
        if (scope === 'ro') {
            const timeoutKey = `${uid}:${location}`;
            const existingTimeout = qtySyncTimeoutsRef.current.get(timeoutKey);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }

            // Find criteria from item (need roId and kodeArtikel for sync)
            const targetItem = items.find(i => i.uid === uid);
            if (targetItem) {
                // Schedule sync after debounce delay
                const newTimeout = setTimeout(() => {
                    console.log(`Syncing qty: ${targetItem.id}/${targetItem.kodeArtikel}/${location} = ${value}`);
                    gsheetService.syncToGSheet({
                        action: "updateQty",
                        roId: targetItem.id,
                        kodeArtikel: targetItem.kodeArtikel,
                        location: location,
                        val: value
                    });
                    qtySyncTimeoutsRef.current.delete(timeoutKey);
                }, QTY_SYNC_DEBOUNCE_MS);

                qtySyncTimeoutsRef.current.set(timeoutKey, newTimeout);
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
