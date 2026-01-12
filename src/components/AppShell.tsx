import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, User, Bell, Menu, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAuth } from '../context/AuthContext';
import { getDatabase } from '../db/database';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { SyncStatus } from './SyncStatus';
import { useToast } from '../context/ToastContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/DropdownMenu";

export const AppShell: React.FC = () => {
    const isOnline = useOnlineStatus();
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const { showToast } = useToast();

    // Close mobile menu on navigation
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location]);

    useEffect(() => {
        if (!user) return;
        let sub: any;
        let insertSub: any;

        const setupSubscription = async () => {
            const db = await getDatabase();

            // 1. Unread Count
            sub = db.notifications.find({
                selector: {
                    userId: user.id,
                    read: false
                }
            }).$.subscribe(notifications => {
                setUnreadCount(notifications.length);
            });

            // 2. Realtime Toasts for NEW notifications
            // We filter for notifications created very recently (prevent toast spam on initial sync)
            insertSub = db.notifications.insert$.subscribe(changeEvent => {
                const doc = changeEvent.documentData as any; // Type assertion if needed
                if (doc.userId === user.id && !doc.read) {
                    const createdTime = new Date(doc.createdAt).getTime();
                    const timeDiff = Date.now() - createdTime;

                    // Show toast if created in last 2 minutes (allow some sync delay)
                    if (timeDiff < 120000) {
                        showToast(doc.title, doc.message, doc.type === 'error' ? 'error' : doc.type === 'success' ? 'success' : 'info');
                    }
                }
            });
        };

        setupSubscription();

        return () => {
            if (sub) sub.unsubscribe();
            if (insertSub) insertSub.unsubscribe();
        };
    }, [user, showToast]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="flex h-screen bg-background text-foreground animate-in fade-in duration-500 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-full md:w-64 border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-4 border-b border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
                        <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">T</div>
                        TeamOps
                    </div>
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(false)}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    <NavItem to="/app" end icon={<LayoutDashboard size={18} />} label="Dashboard" />
                    <NavItem to="/app/teams" icon={<Users size={18} />} label="Teams" />
                    <NavItem
                        to="/app/notifications"
                        icon={<Bell size={18} />}
                        label="Notifications"
                        badge={unreadCount}
                    />
                </nav>

                <div className="p-4 border-t border-border/40 space-y-4 bg-card/50">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start px-2 hover:bg-muted">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <span className="text-sm font-medium truncate flex-1 text-left">{user?.name || 'User'}</span>
                                    <User size={14} className="text-muted-foreground opacity-50" />
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user?.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate('/app/profile')}>
                                <User className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className={cn(
                        "flex items-center gap-2 text-xs font-medium px-2 py-1.5 rounded-md transition-colors",
                        isOnline ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
                    )}>
                        <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-rose-500")} />
                        {isOnline ? 'Online' : 'Offline Mode'}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header Trigger */}
                <header className="md:hidden border-b p-4 flex items-center justify-between bg-card/50 backdrop-blur sticky top-0 z-30 h-16">
                    <div className="flex items-center gap-2 font-semibold">
                        <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">T</div>
                        TeamOps
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                </header>

                <main className="flex-1 overflow-y-auto w-full">
                    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
                        <Outlet />
                    </div>
                </main>
            </div>

            <SyncStatus />
        </div>
    );
};

const NavItem = ({ to, icon, label, badge, end }: { to: string, icon: React.ReactNode, label: string, badge?: number, end?: boolean }) => (
    <NavLink
        to={to}
        end={end}
        className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
            isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
    >
        {icon}
        <span className="flex-1 transition-all duration-300">{label}</span>
        <span className={cn(
            "flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold text-white bg-destructive rounded-full shadow-sm transition-all duration-300 transform",
            badge !== undefined && badge > 0 ? "scale-100 opacity-100" : "scale-0 opacity-0 w-0 px-0 min-w-0 overflow-hidden"
        )}>
            {badge !== undefined && badge > 99 ? '99+' : badge}
        </span>
    </NavLink>
);
