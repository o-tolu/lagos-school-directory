import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const GlobalConfirmContext = createContext(null);

export function GlobalConfirmProvider({ children }) {
    const [modal, setModal] = useState(null);
    const resolveRef = useRef(null);

    const showConfirm = useCallback((message, yesLabel = 'Confirm', noLabel = 'Cancel') => {
        // Close all open dropdowns/menus across the app before showing
        window.dispatchEvent(new CustomEvent('close-all-dropdowns'));
        // Close any existing modal instance by resolving with false
        if (resolveRef.current) {
            resolveRef.current(false);
            resolveRef.current = null;
        }
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setModal({ message, yesLabel, noLabel });
        });
    }, []);

    const handleClose = useCallback((result) => {
        if (resolveRef.current) {
            resolveRef.current(result);
            resolveRef.current = null;
        }
        setModal(null);
    }, []);

    return (
        <GlobalConfirmContext.Provider value={{ showConfirm }}>
            {children}
            {modal && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
                    onClick={(e) => { if (e.target === e.currentTarget) handleClose(false); }}
                >
                    <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <p className="text-sm text-foreground mb-6">{modal.message}</p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => handleClose(false)}
                                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent font-medium"
                            >
                                {modal.noLabel}
                            </button>
                            <button
                                onClick={() => handleClose(true)}
                                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-medium"
                            >
                                {modal.yesLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </GlobalConfirmContext.Provider>
    );
}

export function useGlobalConfirm() {
    const ctx = useContext(GlobalConfirmContext);
    if (!ctx) throw new Error('useGlobalConfirm must be used within GlobalConfirmProvider');
    return ctx;
}