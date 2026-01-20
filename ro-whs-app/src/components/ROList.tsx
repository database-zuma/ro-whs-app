import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRO } from '../store/ROContext';
import { ROGroupCard } from './ROGroupCard'; // Changed from ROCard
import { groupItemsByROId } from '../utils/grouping';
import { ROStatus, STATUS_FLOW, STATUS_LABELS } from '../types';
import './ROList.css';

export const ROList = () => {
    const location = useLocation();

    // Determine status from URL path
    const path = location.pathname.substring(1).replace('-', '_').toUpperCase();
    const isValidStatus = STATUS_FLOW.includes(path as ROStatus);
    const statusFilter = isValidStatus ? (path as ROStatus) : 'QUEUE';

    const { getFormattedItems } = useRO();
    const rawItems = getFormattedItems(statusFilter);
    const groups = groupItemsByROId(rawItems);

    return (
        <div className="ro-page">
            <header className="page-header">
                <h1>{STATUS_LABELS[statusFilter]}</h1>
                <div className="stats-badge">
                    {groups.length} Orders
                </div>
            </header>

            <div className="ro-grid groups">
                <AnimatePresence>
                    {groups.map(group => (
                        <ROGroupCard key={group.id} group={group} />
                    ))}
                </AnimatePresence>

                {groups.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="empty-state"
                    >
                        <p>No orders in {STATUS_LABELS[statusFilter]}</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};
