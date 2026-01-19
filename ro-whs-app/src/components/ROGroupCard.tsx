import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { GroupedRO } from '../utils/grouping';
import { STATUS_FLOW, STATUS_LABELS } from '../types';
import { useRO } from '../store/ROContext';
import './ROGroupCard.css';

interface ROGroupCardProps {
    group: GroupedRO;
}

export const ROGroupCard: React.FC<ROGroupCardProps> = ({ group }) => {
    const { moveStatus, updateQty } = useRO();
    const [isExpanded, setIsExpanded] = useState(true);

    const currentIndex = STATUS_FLOW.indexOf(group.status);
    const nextStatus = currentIndex < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIndex + 1] : null;

    const handleNextStatus = () => {
        moveStatus(group.id);
    };

    const handleQtyChange = (
        uid: string,
        scope: 'ro' | 'wh',
        location: 'ddd' | 'ljbb',
        val: string
    ) => {
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
            updateQty(uid, scope, location, num);
        }
    };

    return (
        <motion.div
            className="ro-group-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="group-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="header-left">
                    <div className="ro-id-badge">{group.id}</div>
                    <div className="store-info">
                        <h3>{group.storeName}</h3>
                        <span className="timestamp">{group.timestamp}</span>
                    </div>
                </div>
                <div className="header-right">
                    <span className="item-count">{group.items.length} Items</span>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                        variants={{
                            collapsed: { height: 0, opacity: 0, overflow: "hidden" },
                            expanded: { height: "auto", opacity: 1 }
                        }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="group-body">
                            <div className="table-responsive">
                                <table className="ro-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '30%' }}>Article Info</th>
                                            <th colSpan={2} className="text-center">RO Qty (Box)</th>
                                            <th colSpan={2} className="text-center">WH Qty (Box)</th>
                                        </tr>
                                        <tr className="sub-header">
                                            <th></th>
                                            <th className="text-center">DDD</th>
                                            <th className="text-center">LJBB</th>
                                            <th className="text-center">DDD</th>
                                            <th className="text-center">LJBB</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.items.map(item => (
                                            <tr key={item.uid}>
                                                <td className="article-cell">
                                                    <div className="code">{item.kodeArtikel}</div>
                                                    <div className="name">{item.artikel}</div>
                                                </td>
                                                <td className="qty-cell">
                                                    <input
                                                        type="number"
                                                        value={item.roQty.ddd}
                                                        onChange={(e) => handleQtyChange(item.uid, 'ro', 'ddd', e.target.value)}
                                                    />
                                                </td>
                                                <td className="qty-cell">
                                                    <input
                                                        type="number"
                                                        value={item.roQty.ljbb}
                                                        onChange={(e) => handleQtyChange(item.uid, 'ro', 'ljbb', e.target.value)}
                                                    />
                                                </td>
                                                <td className="qty-cell wh-col">
                                                    <input
                                                        type="number"
                                                        value={item.whQty.ddd}
                                                        readOnly
                                                        className="readonly-input"
                                                    />
                                                </td>
                                                <td className="qty-cell wh-col">
                                                    <input
                                                        type="number"
                                                        value={item.whQty.ljbb}
                                                        readOnly
                                                        className="readonly-input"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="group-footer">
                {nextStatus ? (
                    <button className="action-button primary" onClick={handleNextStatus}>
                        <span>All Items to {STATUS_LABELS[nextStatus]}</span>
                        <ArrowRight size={16} />
                    </button>
                ) : (
                    <div className="completed-badge">
                        <AlertCircle size={16} />
                        <span>Process Completed</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
