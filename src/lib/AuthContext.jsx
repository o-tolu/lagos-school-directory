import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api } from '@/api/client';

// Authentication is currently OPEN ACCESS: the server reports an anonymous admin.
// When login is added later, only this file, the server's middleware/auth.js and a Login page need to change;
// <ProtectedRoute> (src/components/ProtectedRoute.jsx) is ready to wrap the routes in App.jsx.
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [authError, setAuthError] = useState(null);

    const checkUserAuth = useCallback(async () => {
        try {
            setIsLoadingAuth(true);
            setUser(await api.auth.me());
            setIsAuthenticated(true);
            setAuthError(null);
        } catch (error) {
            setUser(null);
            setIsAuthenticated(false);
            if (error.status === 401) setAuthError({ type: 'auth_required', message: 'Authentication required' });
        } finally {
            setIsLoadingAuth(false);
        }
    }, []);

    useEffect(() => { checkUserAuth(); }, [checkUserAuth]);

    const logout = () => { setUser(null); setIsAuthenticated(false); };

    return (
        <AuthContext.Provider value={{
            user, isAuthenticated, isLoadingAuth, authChecked: !isLoadingAuth, authError,
            logout, checkUserAuth,
            hasRole: (...roles) => !!user && roles.includes(user.role),
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
