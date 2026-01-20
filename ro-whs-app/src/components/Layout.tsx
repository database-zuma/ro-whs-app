import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, CheckSquare, Truck, Archive, CheckCircle, Package, Menu, X, Wifi, WifiOff, Home as HomeIcon } from 'lucide-react';
import { STATUS_FLOW, STATUS_LABELS } from '../types';
import { useRO } from '../store/ROContext';
import clsx from 'clsx';
import './Layout.css';

const ICONS = {
    'QUEUE': LayoutDashboard,
    'PICKING_LIST': List,
    'FINAL_PICKING': CheckSquare,
    'DNPB_PROCESS': Archive,
    'DELIVERY': Truck,
    'ARRIVED_STORE': Package,
    'COMPLETED': CheckCircle,
};

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const location = useLocation();
    const { connectionStatus } = useRO();

    const formatLastSync = (date: Date | null) => {
        if (!date) return 'Never';
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            <aside className={clsx('sidebar', isOpen && 'sidebar-open')}>
                <div className="sidebar-header">
                    <img src="/LogoZUMA.png" alt="Zuma Logo" className="sidebar-logo" />
                    <h2>RO WHS</h2>
                    <div className="sidebar-header-right">
                        <span className="badge">v1.0</span>
                        <button
                            className="sidebar-close-btn"
                            onClick={onClose}
                            aria-label="Close sidebar"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Connection Status */}
                <div className={clsx('connection-status', connectionStatus.isConnected ? 'connected' : 'disconnected')}>
                    {connectionStatus.isConnected ? (
                        <Wifi size={16} />
                    ) : (
                        <WifiOff size={16} />
                    )}
                    <div className="status-text">
                        <span className="status-label">
                            {connectionStatus.isConnected ? 'Live' : 'Disconnected'}
                        </span>
                        <span className="status-detail">
                            {connectionStatus.isConnected
                                ? `Synced ${formatLastSync(connectionStatus.lastSync)}`
                                : 'No connection to GSheet'
                            }
                        </span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {/* Home Navigation Item */}
                    <NavLink
                        to="/"
                        className={({ isActive }) => clsx('nav-item', isActive && 'active')}
                        onClick={onClose}
                    >
                        <HomeIcon size={20} />
                        <span>Home</span>
                    </NavLink>

                    {/* Status Flow Navigation Items */}
                    {STATUS_FLOW.map(status => {
                        const Icon = ICONS[status];
                        const path = `/${status.toLowerCase().replace('_', '-')}`;

                        return (
                            <NavLink
                                key={status}
                                to={path}
                                className={({ isActive }) => clsx('nav-item', isActive && 'active')}
                                onClick={onClose}
                            >
                                <Icon size={20} />
                                <span>{STATUS_LABELS[status]}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
};

export const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="layout">
            {/* Hamburger button */}
            <button
                className="hamburger-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
            >
                <Menu size={24} />
            </button>

            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};
