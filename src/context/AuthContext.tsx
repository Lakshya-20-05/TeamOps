import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import type { User } from '../db/schemas';
import { supabase } from '../lib/supabase';

// Helper for password hashing (with insecure context fallback for dev)
const hashPassword = async (password: string, salt: string) => {
    // Check if we are in a secure context (HTTPS or localhost)
    if (window.isSecureContext && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + salt);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
        // FALLBACK for Local Mobile Testing (HTTP) or older browsers
        // WARNING: This is not cryptographically secure, but allows testing offline flow on LAN.
        console.warn("Using insecure password hash fallback (crypto.subtle unavailable).");

        // Simple JS implementation of a hash-like string (djb2 variant) just to have something consistent
        const input = password + salt;
        let hash = 5381;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) + hash) + input.charCodeAt(i); /* hash * 33 + c */
        }
        return (hash >>> 0).toString(16); // Convert to hex
    }
};

// Helper for UUID generation (safe for insecure contexts)
const getUUID = () => {
    if (window.isSecureContext && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for insecure context (Mobile LAN)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

interface CachedCredentials {
    email: string; // or username
    passwordHash: string;
    salt: string;
}

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

        const initAuth = async () => {
            // 1. Try Supabase Session (Online)
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                console.log("Supabase session found:", session.user.email);
                syncUser(session.user);
                return;
            }

            // 2. Try Persistent Session (Offline/Fallback)
            const lastUserId = localStorage.getItem('last_user_id');
            if (lastUserId) {
                console.log("Checking for persistent user:", lastUserId);
                const userDoc = await db.users.findOne(lastUserId).exec();
                if (userDoc) {
                    console.log("Restoring persistent user:", userDoc.toJSON());
                    setUser(userDoc.toJSON() as User);
                    setIsLoading(false);
                    return;
                }
            }

            // 3. No session found
            console.log("No session found.");
            setUser(null);
            setIsLoading(false);
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                syncUser(session.user);
            } else if (!user) { // Only clear if we aren't already logged in locally
                // Wait, onAuthStateChange fires on logout too.
                // If event is 'SIGNED_OUT', we should clear.
                if (_event === 'SIGNED_OUT') {
                    setUser(null);
                    setIsLoading(false);
                }
            }
        });

        initAuth();

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
            // PERSISTENCE: Save ID for offline restoration
            localStorage.setItem('last_user_id', localUser.id);
            setUser(localUser);
        } catch (e) {
            console.error("Failed to sync user to local DB", e);
        } finally {
            setIsLoading(false);
        }
    };





    // Storage Key: 'offline_creds_store' -> Record<email, CachedCredentials>

    // ... (AuthContextType interface remains same)

    const login = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;

            // Online login success -> Cache credentials securely
            try {
                const salt = getUUID();
                const hash = await hashPassword(password, salt);
                const newCreds: CachedCredentials = { email, passwordHash: hash, salt };

                // Load existing store or create new
                const existingStoreStr = localStorage.getItem('offline_creds_store');
                let store: Record<string, CachedCredentials> = {};
                if (existingStoreStr) {
                    try {
                        store = JSON.parse(existingStoreStr);
                    } catch (e) {
                        console.warn("Corrupt credential store, resetting.");
                    }
                }

                // Add/Update current user
                store[email.toLowerCase()] = newCreds;
                localStorage.setItem('offline_creds_store', JSON.stringify(store));

                // Backwards compatibility/Single User pointer (for checking "is cached")
                localStorage.setItem('offline_creds', JSON.stringify(newCreds));

            } catch (cacheErr) {
                console.error("Failed to cache offline credentials:", cacheErr);
                // Don't block login, but user won't be able to login offline next time
            }

            return true;
        } catch (error: any) {
            // Offline fallback
            console.log("Login error caught:", error);
            if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch') || !navigator.onLine) {
                console.log("Attempting offline login...");

                // Try New Store first
                const storeStr = localStorage.getItem('offline_creds_store');
                const oldStoreStr = localStorage.getItem('offline_creds');

                let creds: CachedCredentials | null = null;
                const normalizedEmail = email.toLowerCase();

                if (storeStr) {
                    const store = JSON.parse(storeStr);
                    if (store[normalizedEmail]) {
                        creds = store[normalizedEmail];
                    }
                }

                // Fallback to old single-store if not found in map
                if (!creds && oldStoreStr) {
                    const oldCreds = JSON.parse(oldStoreStr);
                    if (oldCreds.email.toLowerCase() === normalizedEmail) {
                        creds = oldCreds;
                    }
                }

                console.log("Stored creds found for user:", !!creds);

                if (creds) {
                    console.log("Email matches. Checking hash...");
                    const hash = await hashPassword(password, creds.salt);

                    if (hash === creds.passwordHash) {
                        console.log("Hash matches! credential valid.");
                        // Offline credentials match!
                        // Try to load user from local DB
                        if (db) {
                            console.log("Searching user in RxDB...");
                            const userDoc = await db.users.findOne({ selector: { email } }).exec();
                            console.log("User doc found:", userDoc?.toJSON());

                            if (userDoc) {
                                console.log("Offline login successful with local user");
                                const userData = userDoc.toJSON() as User;
                                localStorage.setItem('last_user_id', userData.id); // Add this
                                setUser(userData);
                                return true;
                            } else {
                                console.warn("User not found in local DB despite valid credentials.");
                            }
                        } else {
                            console.error("Database not initialized during offline exception.");
                            console.warn("Password hash mismatch.");
                            throw new Error("Offline login failed: Incorrect password.");
                        }
                    } else {
                        console.warn("Email mismatch in stored creds.");
                        throw new Error("Offline login failed: Incorrect password.");
                    }
                } else {
                    // No stored credentials, so offline login is not possible
                    throw new Error("Connection failed and no offline credentials found for this user.");
                }
            }
            throw error;
        }
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
            // NUCLEAR OPTION: Clear session but SHARE THE LOVE (keep offline_creds)

            // Smart Clear: Remove everything EXCEPT our offline credential stores
            const keysToKeep = ['offline_creds', 'offline_creds_store'];
            Object.keys(localStorage).forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            sessionStorage.clear();

            setUser(null);

            // Hard redirect to root to clear memory and trigger login page
            window.location.href = '/';
        }
    }; // End logout

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}; // End AuthProvider component

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
