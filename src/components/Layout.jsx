import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useCrm } from '@/lib/CrmContext';
import ThemeToggle from '@/components/ThemeToggle';
import { GraduationCap } from 'lucide-react';

const NAV_ITEMS = [
    { to: '/', label: 'Dashboard' },
    { to: '/schools', label: 'Schools' },
    { to: '/sales-people', label: 'Sales People' },
];

function PageProgress() {
    const location = useLocation();
    const [show, setShow] = useState(false);

    useEffect(() => {
        setShow(true);
        const t = setTimeout(() => setShow(false), 600);
        return () => clearTimeout(t);
    }, [location.pathname]);

    if (!show) return null;
    return (
        <div className="fixed top-0 left-0 right-0 h-1 z-[200] pointer-events-none">
            <div className="h-full bg-primary" style={{ animation: 'progressBar 0.6s ease-out forwards' }} />
            <style>{`@keyframes progressBar { from { width: 0% } to { width: 100% } }`}</style>
        </div>
    );
}

export default function Layout() {
    const { online } = useCrm();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-background">
            <PageProgress />

            {/* Top Navbar */}
            <header className="sticky top-0 z-40 bg-header">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2 text-white">
                        <GraduationCap className="w-5 h-5 flex-shrink-0" />
                        <span className="font-bold text-sm sm:text-base whitespace-nowrap">Lagos Schools CRM</span>
                    </div>

                    {/* Center Nav (desktop) */}
                    <nav className="hidden md:flex items-center gap-1">
                        {NAV_ITEMS.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === '/'}
                                className={({ isActive }) =>
                                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${isActive
                                        ? 'bg-white/15 text-white'
                                        : 'text-white/80 hover:text-white hover:bg-white/10'
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Right: Status + Theme */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-white/90">
                            <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
                            <span className="hidden sm:inline">{online ? 'Live' : 'Offline'}</span>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* Offline Banner */}
            {!online && (
                <div className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-sm text-center py-2 px-4">
                    ⚠️ You are offline. Changes will sync when you reconnect.
                </div>
            )}

            {/* Main Content */}
            <main className="pb-20 md:pb-8">
                <div key={location.pathname} className="page-transition p-4 md:p-6 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex">
                {NAV_ITEMS.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                            `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'
                            }`
                        }
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}