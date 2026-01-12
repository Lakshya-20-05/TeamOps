import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import type { User } from '../db/schemas';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<boolean>;
    signup: (data: Omit<User, 'id' | 'createdAt'>) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const db = useDatabase();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!db) return; // Wait for DB to be initialized

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                syncUser(session.user);
            } else {
                setUser(null);
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                syncUser(session.user);
            } else {
                setUser(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [db]);

    const syncUser = async (authUser: any) => {
        // db is guaranteed by useEffect dependency
        if (!db) {
            console.error("DB not ready during user sync");
            setIsLoading(false);
            return;
        }

        // Map Supabase user to our local schema
        const localUser: User = {
            id: authUser.id,
            email: authUser.email || '',
            username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
            name: authUser.user_metadata?.name || 'User',
            password: 'encrypted', // Dummy, we don't store real pwd locally
            createdAt: authUser.created_at
        };

        // Upsert to local DB so offline works
        try {
            await db.users.upsert(localUser);
            setUser(localUser);
        } catch (e) {
            console.error("Failed to sync user to local DB", e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return true;
    };

    const signup = async (data: Omit<User, 'id' | 'createdAt'>) => {
        const { data: responseData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    username: data.username,
                    name: data.name
                }
            }
        });

        if (error) throw error;

        // processing logic
        console.log("Signup response:", responseData);

        if (responseData.user && !responseData.session) {
            // User created but no session -> Email confirmation required
            console.warn("User created but email not confirmed");
            return false; // Indicating immediate login failed (wait for email)
        }

        return true;
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut(); // Attempt server logout
        } catch (e) {
            console.warn("Supabase signOut failed", e);
        }

        // Cleanup DB with timeout race
        try {
            const cleanupPromise = (async () => {
                const { getDatabase } = await import('../db/database');
                const db = await getDatabase();
                if (db) {
                    await (db as any).destroy();

                    const dbName = 'teammgmt_db_v2' + (import.meta.env.DEV ? '_dev' : '');
                    await Promise.all([
                        new Promise((resolve) => {
                            const req = indexedDB.deleteDatabase(dbName);
                            req.onsuccess = resolve;
                            req.onerror = resolve;
                            req.onblocked = resolve;
                        }),
                        new Promise((resolve) => {
                            const req = indexedDB.deleteDatabase(dbName + '-rxdb-cluster');
                            req.onsuccess = resolve;
                            req.onerror = resolve;
                            req.onblocked = resolve;
                        })
                    ]);
                }
            })();

            // Race: Cleanup vs Timeout
            await Promise.race([
                cleanupPromise,
                new Promise(resolve => setTimeout(resolve, 2000))
            ]);

        } catch (e) {
            console.warn("Error cleaning up DB on logout", e);
        } finally {
            // NUCLEAR OPTION: Clear everything to ensure no session survives
            localStorage.clear();
            sessionStorage.clear();

            setUser(null);

            // Hard redirect to root to clear memory and trigger login page
            window.location.href = '/';
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
