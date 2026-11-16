import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Not used yet (open access). To require login later, wrap the routes in App.jsx:
//   <Route element={<ProtectedRoute />}> ...routes... </Route>
// and add a /login page. Pass roles={['admin']} to restrict a section by role.
export default function ProtectedRoute({ roles, redirectTo = '/login' }) {
    const { isAuthenticated, isLoadingAuth, user } = useAuth();
    if (isLoadingAuth) return null;
    if (!isAuthenticated) return <Navigate to={redirectTo} replace />;
    if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
    return <Outlet />;
}
