import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRO } from '../store/ROContext';
import { groupItemsByROId } from '../utils/grouping';
import { STATUS_LABELS, STATUS_FLOW } from '../types';
import { Package, TrendingUp, Clock, Layers } from 'lucide-react';
import './Home.css';

export const Home = () => {
    const { items } = useRO();
    const navigate = useNavigate();
    const groups = groupItemsByROId(items);

    // Calculate statistics
    const totalROs = groups.length;
    const totalPairs = items.reduce((sum, item) => sum + item.roQty.ddd + item.roQty.ljbb, 0);

    const statusCounts = STATUS_FLOW.reduce((acc, status) => {
        acc[status] = groups.filter(g => g.status === status).length;
        return acc;
    }, {} as Record<string, number>);

    // Format relative time
    const formatRelativeTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    // Get status badge color
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'QUEUE': '#f59e0b',
            'PICKING_LIST': '#3b82f6',
            'FINAL_PICKING': '#8b5cf6',
            'DNPB_PROCESS': '#ec4899',
            'DELIVERY': '#10b981',
            'ARRIVED_STORE': '#00E273',
            'COMPLETED': '#6b7280',
        };
        return colors[status] || '#6b7280';
    };

    // Calculate progress percentage based on status
    const getProgress = (status: string) => {
        const index = STATUS_FLOW.indexOf(status as any);
        return ((index + 1) / STATUS_FLOW.length) * 100;
    };

    return (
        <div className="home-page">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p className="page-subtitle">Overview of all replenishment orders</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-icon">
                        <Package size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total ROs</div>
                        <div className="stat-value">{totalROs}</div>
                    </div>
                </div>

                <div className="stat-card accent">
                    <div className="stat-icon">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Pairs</div>
                        <div className="stat-value">{totalPairs.toLocaleString()}</div>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div className="stat-icon">
                        <Clock size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">In Queue</div>
                        <div className="stat-value">{statusCounts.QUEUE || 0}</div>
                    </div>
                </div>

                <div className="stat-card success">
                    <div className="stat-icon">
                        <Layers size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">In Progress</div>
                        <div className="stat-value">
                            {(statusCounts.PICKING_LIST || 0) + (statusCounts.FINAL_PICKING || 0) + (statusCounts.DNPB_PROCESS || 0)}
                        </div>
                    </div>
                </div>
            </div>

            {/* RO Summary Table */}
            <div className="table-section">
                <div className="section-header">
                    <h2>All Replenishment Orders</h2>
                    <div className="ro-count-badge">{totalROs} orders</div>
                </div>

                <div className="table-container">
                    <table className="summary-table">
                        <thead>
                            <tr>
                                <th>RO ID</th>
                                <th>Store</th>
                                <th>Status</th>
                                <th className="text-center">Articles</th>
                                <th className="text-center">Total Pairs</th>
                                <th>Created</th>
                                <th>Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map(group => {
                                const totalPairsForRO = group.items.reduce(
                                    (sum, item) => sum + item.roQty.ddd + item.roQty.ljbb,
                                    0
                                );

                                return (
                                    <tr
                                        key={group.id}
                                        className="table-row"
                                        onClick={() => navigate(`/${group.status.toLowerCase().replace('_', '-')}`)}
                                    >
                                        <td>
                                            <span className="ro-id-cell">{group.id}</span>
                                        </td>
                                        <td>
                                            <div className="store-cell">
                                                <span className="store-name">{group.storeName}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className="status-badge"
                                                style={{
                                                    backgroundColor: `${getStatusColor(group.status)}20`,
                                                    color: getStatusColor(group.status),
                                                    borderColor: getStatusColor(group.status)
                                                }}
                                            >
                                                {STATUS_LABELS[group.status]}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <span className="article-count">{group.items.length}</span>
                                        </td>
                                        <td className="text-center">
                                            <span className="pairs-count">{totalPairsForRO}</span>
                                        </td>
                                        <td>
                                            <span className="timestamp">{formatRelativeTime(group.timestamp)}</span>
                                        </td>
                                        <td>
                                            <div className="progress-container">
                                                <div
                                                    className="progress-bar"
                                                    style={{
                                                        width: `${getProgress(group.status)}%`,
                                                        backgroundColor: getStatusColor(group.status)
                                                    }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {groups.length === 0 && (
                        <div className="empty-state">
                            <Package size={48} />
                            <p>No replenishment orders found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
