import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { useEffect } from 'react';
import { BusinessProvider } from '@/contexts/BusinessContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Perspectives from '@/pages/Perspectives';
import Finances from '@/pages/Finances';
import Workers from '@/pages/Workers';
import FraudAlerts from '@/pages/FraudAlerts';
import FraudAlertDetail from '@/pages/FraudAlertDetail';
import FraudCases from '@/pages/FraudCases';
import Assistant from '@/pages/Assistant';
import Inventory from '@/pages/Inventory';
import Audit from '@/pages/Audit';
import Submissions from '@/pages/Submissions';
import Messages from '@/pages/Messages';
import SelectBusiness from '@/pages/SelectBusiness';
import Profile from '@/pages/Profile';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminSettings from '@/pages/admin/Settings';
import Settings from '@/pages/Settings';
import WorkerDashboard from '@/pages/WorkerDashboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, appUser, isAuthenticated } = useAuth();

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
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold mb-4">Authentication error</h1>
            <p className="text-sm text-muted-foreground mb-6">
              {authError.message || 'Unable to initialize authentication. Please check your Firebase configuration.'}
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={navigateToLogin}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Return to login
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/select-business" element={<ProtectedRoute><SelectBusiness /></ProtectedRoute>} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/perspectives" element={<Perspectives />} />
          <Route path="/finances" element={<Finances />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/fraud/alerts" element={<FraudAlerts />} />
          <Route path="/fraud/alerts/:id" element={<FraudAlertDetail />} />
          <Route path="/fraud/cases" element={<FraudCases />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/submissions" element={<Submissions />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
      <Route path="/worker/dashboard" element={<ProtectedRoute><WorkerDashboard /></ProtectedRoute>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

// Small debug helper to log auth state in the browser console
const AuthDebug = () => {
  const ctx = useAuth();
  useEffect(() => {
    console.debug('[AuthDebug] auth state:', {
      isLoadingAuth: ctx?.isLoadingAuth,
      isAuthenticated: ctx?.isAuthenticated,
      authError: ctx?.authError,
      authChecked: ctx?.authChecked,
      appUser: ctx?.appUser,
      firebaseUser: ctx?.firebaseUser,
    });
  }, [ctx?.isLoadingAuth, ctx?.isAuthenticated, ctx?.authError, ctx?.authChecked, ctx?.appUser, ctx?.firebaseUser]);
  return null;
};

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <BusinessProvider>
          <AuthDebug />
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </BusinessProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App