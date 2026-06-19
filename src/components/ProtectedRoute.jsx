import { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement, requiredRole, children }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth, appUser } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement || <Navigate to="/login" replace />;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement || <Navigate to="/login" replace />;
  }

  // Check if user has no businesses (new user, should go to setup)
  if (appUser && (!appUser.businesses || appUser.businesses.length === 0)) {
    // Allow access to select-business when user has no businesses yet
    if (location.pathname === '/select-business') {
      return children || <Outlet />;
    }
    // Redirect to select-business if trying to access other protected routes
    return <Navigate to="/select-business" replace />;
  }

  if (requiredRole && appUser?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
}
