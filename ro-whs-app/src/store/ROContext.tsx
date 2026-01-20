import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { ROItem, ROStatus, STATUS_FLOW } from '../types';
import { parseROData } from '../data/loader';
import { gsheetService } from '../services/gsheetService';

// TODO: Replace local state with gsheetService in future implementation
// const { fetchROQueue, fetchWarehouseStock } = gsheetService;

// Maximum time to protect local changes before giving up (in ms)
// Protection clears earlier if poll confirms GSheet has the updated value
const PENDING_CHANGE_MAX_PROTECTION_MS = 300000; // 5 minutes max

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
    // Map of key -> { timestamp, expectedValue }
    // Protection clears when poll confirms the expected value OR max time expires
    const pendingChangesRef = useRef<Map<string, { timestamp: number; expectedValue: any }>>(new Map());

    // Track debounce timeouts for qty syncs
    // Map of uid -> timeout ID
    const qtySyncTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // Deep compare for objects (used for qty comparison)
    const deepEqual = (a: any, b: any): boolean => {
        if (a === b) return true;
        if (typeof a !== 'object' || typeof b !== 'object') return false;
        if (a === null || b === null) return false;
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every(key => deepEqual(a[key], b[key]));
    };

    // Helper to check if an item has pending local changes
    // Returns true if we should keep local value, false if we should accept poll value
    const shouldKeepLocalValue = (key: string, fetchedValue: any): boolean => {
        const pending = pendingChangesRef.current.get(key);
        if (!pending) return false;

        const now = Date.now();
        const timeElapsed = now - pending.timestamp;

        // If poll returns our expected value, GSheet is synced - clear protection
        const valuesMatch = deepEqual(fetchedValue, pending.expectedValue);
        if (valuesMatch) {
            console.log(`✓ GSheet confirmed: ${key}`);
            pendingChangesRef.current.delete(key);
            return false; // Accept poll data (it matches anyway)
        }

        // If max protection time exceeded, give up and accept poll data
        if (timeElapsed > PENDING_CHANGE_MAX_PROTECTION_MS) {
            console.warn(`⚠ Protection expired for ${key} after ${Math.round(timeElapsed/1000)}s`);
            pendingChangesRef.current.delete(key);
            return false; // Accept poll data
        }

        // Still protected, keep local value
        console.log(`⏳ Protecting ${key} (${Math.round(timeElapsed/1000)}s elapsed)`);
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

                    // Create a map of current items for quick lookup
                    const currentItemsMap = new Map(currentItems.map(item => [item.uid, item]));

                    // Merge: use fetched data but preserve local values if still protected
                    return fetchedData.map(fetchedItem => {
                        const currentItem = currentItemsMap.get(fetchedItem.uid);

                        if (!currentItem) {
                            // New item from server
                            return fetchedItem;
                        }

                        // Check if we should keep local values (compares fetched values with our expected values)
                        const keepLocalStatus = shouldKeepLocalValue(`status:${fetchedItem.id}`, fetchedItem.status);
                        const keepLocalQty = shouldKeepLocalValue(`qty:${fetchedItem.uid}`, fetchedItem.roQty);

                        if (!keepLocalStatus && !keepLocalQty) {
                            // No pending changes or GSheet confirmed our values
                            return fetchedItem;
                        }

                        // Preserve local changes where needed
                        return {
                            ...fetchedItem,
                            roQty: keepLocalQty ? currentItem.roQty : fetchedItem.roQty,
                            status: keepLocalStatus ? currentItem.status : fetchedItem.status,
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

            // 1. Mark as pending with expected value (protection until GSheet confirms)
            pendingChangesRef.current.set(`status:${roId}`, {
                timestamp: Date.now(),
                expectedValue: nextStatus
            });
            console.log(`📤 Status change: ${roId} → ${nextStatus}`);

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
        // Find target item first to get current qty
        const targetItem = items.find(i => i.uid === uid);
        if (!targetItem) return;

        // Build expected roQty object
        const expectedRoQty = {
            ...targetItem.roQty,
            [location]: value
        };

        // 1. Mark as pending with expected value (protection until GSheet confirms)
        pendingChangesRef.current.set(`qty:${uid}`, {
            timestamp: Date.now(),
            expectedValue: expectedRoQty
        });

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

            // Schedule sync after debounce delay
            const newTimeout = setTimeout(() => {
                console.log(`📤 Qty sync: ${targetItem.id}/${targetItem.kodeArtikel}/${location} = ${value}`);
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
