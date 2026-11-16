import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const dismiss = useCallback((id) => {
        if (timers.current[id]) {
            clearTimeout(timers.current[id]);
            delete timers.current[id];
        }
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = useCallback((message, type = 'success') => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts(prev => [...prev, { id, message, type }]);
        timers.current[id] = setTimeout(() => {
            dismiss(id);
        }, 4000);
    }, [dismiss]);

    return (
        <ToastContext.Provider value={{ toast, dismiss }}>
            {children}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border page-transition
              ${t.type === 'success' ? 'bg-card border-border text-foreground' : ''}
              ${t.type === 'error' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' : ''}
              ${t.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200' : ''}
              ${t.type === 'info' ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200' : ''}
            `}
                    >
                        <span className="text-lg leading-none">
                            {t.type === 'success' && '✅'}
                            {t.type === 'error' && '❌'}
                            {t.type === 'warning' && '⚠️'}
                            {t.type === 'info' && 'ℹ️'}
                        </span>
                        <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}