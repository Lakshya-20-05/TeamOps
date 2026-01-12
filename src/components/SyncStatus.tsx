
import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

export const SyncStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
    const [lastError, setLastError] = useState<string | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Listen to custom sync events
        const handleSyncActive = () => {
            setSyncState('syncing');
            // Reset to idle after 1s if no more events
            setTimeout(() => setSyncState(prev => prev === 'syncing' ? 'idle' : prev), 2000);
        };

        const handleSyncError = (e: any) => {
            console.error("Sync Error caught in UI:", e.detail);
            setSyncState('error');
            setLastError(e.detail?.error?.message || 'Unknown sync error');
        };

        window.addEventListener('sync-active', handleSyncActive);
        window.addEventListener('sync-error', handleSyncError as EventListener);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('sync-active', handleSyncActive);
            window.removeEventListener('sync-error', handleSyncError as EventListener);
        };
    }, []);

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border shadow-lg text-xs font-medium transition-all">
            {/* Network Status */}
            {isOnline ? (
                <div className="flex items-center gap-1.5 text-green-500">
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Online</span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Offline</span>
                </div>
            )}

            <div className="w-px h-4 bg-border mx-1" />

            {/* Sync Activity */}
            {syncState === 'error' ? (
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-destructive cursor-help" title={lastError || 'Error'}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="max-w-[150px] truncate">{lastError || 'Sync Error'}</span>
                    </div>
                    <button
                        onClick={async () => {
                            if (window.confirm("This will clear all local data and re-sync from the server. Use this if sync is stuck. Continue?")) {
                                try {
                                    // 1. Get DB instance and destroy it to close connections
                                    const { getDatabase } = await import('../db/database');
                                    const db = await getDatabase();
                                    await (db as any).destroy(); // Cast to any to avoid type error

                                    // 2. Clear IndexedDB
                                    await Promise.all([
                                        // RxDB creates multiple databases with prefixes
                                        // We try to delete the main one and common prefixes
                                        new Promise((resolve) => {
                                            const req = indexedDB.deleteDatabase('teammgmt_db_v2_dev'); // Name from database.ts
                                            req.onsuccess = resolve;
                                            req.onerror = resolve;
                                            req.onblocked = resolve;
                                        }),
                                        new Promise((resolve) => {
                                            const req = indexedDB.deleteDatabase('teammgmt_db_v2');
                                            req.onsuccess = resolve;
                                            req.onerror = resolve;
                                            req.onblocked = resolve;
                                        })
                                    ]);

                                    // 3. Reload
                                    window.location.reload();
                                } catch (e) {
                                    console.error("Reset failed", e);
                                    window.location.reload(); // Force reload anyway
                                }
                            }
                        }}
                        className="text-[10px] bg-destructive text-white px-2 py-0.5 rounded hover:bg-destructive/90"
                    >
                        Reset Data
                    </button>
                </div>
            ) : syncState === 'syncing' ? (
                <div className="flex items-center gap-1.5 text-blue-500">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing...</span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                    <span>Synced</span>
                </div>
            )}
        </div>
    );
};
