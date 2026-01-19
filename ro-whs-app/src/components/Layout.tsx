import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, CheckSquare, Truck, Archive, CheckCircle, Package } from 'lucide-react';
import { STATUS_FLOW, STATUS_LABELS } from '../types';
import clsx from 'clsx';
import './Layout.css'; // We'll create this or use modules

const ICONS = {
    'QUEUE': LayoutDashboard,
    'PICKING_LIST': List,
    'FINAL_PICKING': CheckSquare,
    'DNPB_PROCESS': Archive,
    'DELIVERY': Truck,
    'ARRIVED_STORE': Package,
    'COMPLETED': CheckCircle,
};

const Sidebar = () => {
    const location = useLocation();

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>RO WHS</h2>
                <span className="badge">v1.0</span>
            </div>
            <nav className="sidebar-nav">
                {STATUS_FLOW.map(status => {
                    const Icon = ICONS[status];
                    const path = `/${status.toLowerCase().replace('_', '-')}`;
                    const isActive = location.pathname === path || (path === '/queue' && location.pathname === '/');

                    return (
                        <NavLink
                            key={status}
                            to={path}
                            className={({ isActive }) => clsx('nav-item', isActive && 'active')}
                        >
                            <Icon size={20} />
                            <span>{STATUS_LABELS[status]}</span>
                        </NavLink>
                    );
                })}
            </nav>
        </aside>
    );
};

export const Layout = () => {
    return (
        <div className="layout">
            <Sidebar />
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};
