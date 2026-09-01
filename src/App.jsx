import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import EmployeeAuth from '@/components/crm/EmployeeAuth';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import CrmLayout from '@/components/crm/CrmLayout';
import Home from '@/pages/Home';
import CustomerRegistration from '@/pages/CustomerRegistration';
import Profile from '@/pages/Profile';
import CustomerDetail from '@/pages/CustomerDetail';
import CustomersPage from '@/pages/CustomersPage';
import CustomerEdit from '@/pages/CustomerEdit';
import { Analytics } from '@vercel/analytics/react';
// Add page imports here

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<EmployeeAuth />}>
              <Route element={<CrmLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/register" element={<CustomerRegistration />} />
                <Route path="/customers/:id/edit" element={<CustomerEdit />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
        <Analytics />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
