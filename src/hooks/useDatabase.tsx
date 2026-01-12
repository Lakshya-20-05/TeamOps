import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDatabase } from '../db/database';
import type { MyDatabase } from '../db/database';

const DatabaseContext = createContext<MyDatabase | null>(null);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [db, setDb] = useState<MyDatabase | null>(null);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        const initDB = async () => {
            try {
                const _db = await getDatabase();
                setDb(_db);

                // Start Replication (Fire and Forget)
                // In a real app, we might want to wait for Auth to be ready 
                // but our sync logic handles "waiting for leadership" etc.
                // We just need to import the sync file dynamically or just run it.
                // Better approach: We need the User to be logged in for RLS validation.
                // Ideally, we move this to AuthContext or a separate SyncManager component.
                // For now, let's lazy-load the sync logic here.

                import('../lib/sync').then(async ({ syncCollection }) => {
                    import('../lib/db-mappers').then(async (mappers) => {
                        // Sync Users
                        await syncCollection(_db.users, 'profiles', mappers.mapUserToRemote, mappers.mapUserToLocal);
                        // Sync Teams
                        await syncCollection(_db.teams, 'teams', mappers.mapTeamToRemote, mappers.mapTeamToLocal);
                        // Sync Tasks
                        await syncCollection(_db.tasks, 'tasks', mappers.mapTaskToRemote, mappers.mapTaskToLocal);
                        // Sync Invitations
                        await syncCollection(_db.invitations, 'invitations', mappers.mapInvitationToRemote, mappers.mapInvitationToLocal);
                        // Sync Notifications
                        await syncCollection(_db.notifications, 'notifications', mappers.mapNotificationToRemote, mappers.mapNotificationToLocal);
                    });
                });

            } catch (err) {
                console.error("Failed to init database:", err);
                setError(err);
            }
        };
        initDB();
    }, []);

    if (error) {
        return (
            <div style={{ padding: 20, color: 'red' }}>
                <h2>Fatal Error: Failed to initialize database</h2>
                <pre>{String(error)}</pre>
            </div>
        );
    }

    if (!db) {
        // You could render a nice Loading screen here
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-app)',
                color: 'var(--text-muted)'
            }}>
                Loading Database...
            </div>
        );
    }

    return (
        <DatabaseContext.Provider value={db}>
            {children}
        </DatabaseContext.Provider>
    );
};

export const useDatabase = () => {
    const db = useContext(DatabaseContext);
    if (!db) {
        throw new Error('useDatabase must be used within a DatabaseProvider');
    }
    return db;
};
