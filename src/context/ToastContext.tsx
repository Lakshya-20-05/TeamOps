
import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    title: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (title: string, message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((title: string, message: string, type: ToastType = 'info') => {
        const id = crypto.randomUUID();
        const newToast = { id, title, message, type };
        setToasts((prev) => [...prev, newToast]);

        // Auto dismiss
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={cn(
                            "pointer-events-auto w-80 bg-background/95 backdrop-blur border rounded-lg shadow-lg p-4 flex gap-3 items-start transition-all animate-in slide-in-from-right-full duration-300",
                            toast.type === 'success' && "border-emerald-500/50",
                            toast.type === 'error' && "border-destructive/50",
                            toast.type === 'warning' && "border-amber-500/50",
                            toast.type === 'info' && "border-blue-500/50"
                        )}
                    >
                        <div className={cn("mt-0.5",
                            toast.type === 'success' && "text-emerald-500",
                            toast.type === 'error' && "text-destructive",
                            toast.type === 'warning' && "text-amber-500",
                            toast.type === 'info' && "text-blue-500"
                        )}>
                            {toast.type === 'success' && <CheckCircle size={18} />}
                            {toast.type === 'error' && <AlertCircle size={18} />}
                            {toast.type === 'warning' && <AlertTriangle size={18} />}
                            {toast.type === 'info' && <Info size={18} />}
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold">{toast.title}</h4>
                            <p className="text-sm text-muted-foreground">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};
