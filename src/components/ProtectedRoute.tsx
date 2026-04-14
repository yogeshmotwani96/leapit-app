import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type ProtectedRouteProps = {
  allowedStatuses?: ('PENDING' | 'APPROVED' | 'REJECTED')[];
  redirectPath?: string;
};

export default function ProtectedRoute({ 
  allowedStatuses = ['APPROVED'], 
  redirectPath = '/pending' 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  // Not logged in at all
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If a specific status is required and user's profile doesn't match
  if (profile && !allowedStatuses.includes(profile.approval_status)) {
    // If they are REJECTED, maybe send them to a rejected page or pending
    return <Navigate to={redirectPath} replace />;
  }

  // They are authenticated and have the right status
  return <Outlet />;
}
