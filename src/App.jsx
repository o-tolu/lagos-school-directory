import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import Dashboard from './pages/Dashboard';
import SchoolsPage from './pages/SchoolsPage';
import SalesPeoplePage from './pages/SalesPeoplePage';
import SalespersonDetail from './pages/SalespersonDetail';
import Layout from './components/Layout';
import { CrmProvider } from './lib/CrmContext';
import { ToastProvider } from './components/Toast';
import { GlobalConfirmProvider } from './components/GlobalConfirmDialog';

const AppRoutes = () => (
    <Routes>
        <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/schools" element={<SchoolsPage />} />
            <Route path="/sales-people" element={<SalesPeoplePage />} />
            <Route path="/sales-people/:id" element={<SalespersonDetail />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
    </Routes>
);


function App() {

    return (
        <AuthProvider>
            <QueryClientProvider client={queryClientInstance}>
                <Router>
                    <ScrollToTop />
                    <CrmProvider>
                        <GlobalConfirmProvider>
                            <ToastProvider>
                                <AppRoutes />
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