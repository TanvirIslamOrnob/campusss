import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <p className="p-8 text-center text-sm">Loading your session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  return children;
}
