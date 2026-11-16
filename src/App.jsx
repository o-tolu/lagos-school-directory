import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Dashboard from './pages/Dashboard';
import SchoolsPage from './pages/SchoolsPage';
import SalesPeoplePage from './pages/SalesPeoplePage';
import SalespersonDetail from './pages/SalespersonDetail';
import Layout from './components/Layout';
import { CrmProvider } from './lib/CrmContext';
import { ToastProvider } from './components/Toast';
import { GlobalConfirmProvider } from './components/GlobalConfirmDialog';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import OAuthConsent from './pages/OAuthConsent';

const AuthenticatedApp = () => {
    const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

    // Show loading spinner while checking app public settings or auth
    if (isLoadingPublicSettings || isLoadingAuth) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Handle authentication errors
    if (authError) {
        if (authError.type === 'user_not_registered') {
            return <UserNotRegisteredError />;
        } else if (authError.type === 'auth_required') {
            // Redirect to login automatically
            navigateToLogin();
            return null;
        }
    }

    // Render the main app
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/oauth/consent" element={<OAuthConsent />} />

            <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/schools" element={<SchoolsPage />} />
                <Route path="/sales-people" element={<SalesPeoplePage />} />
                <Route path="/sales-people/:id" element={<SalespersonDetail />} />
            </Route>
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};


function App() {

    return (
        <AuthProvider>
            <QueryClientProvider client={queryClientInstance}>
                <Router>
                    <ScrollToTop />
                    <CrmProvider>
                        <GlobalConfirmProvider>
                            <ToastProvider>
                                <AuthenticatedApp />
                            </ToastProvider>
                        </GlobalConfirmProvider>
                    </CrmProvider>
                </Router>
                <Toaster />
            </QueryClientProvider>
        </AuthProvider>
    )
}

export default App