import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/** UI convenience only. The server enforces the same rules on every admin API call. */
export default function RequireRole({ roles, children }) {
  const { user } = useAuth();
  return user && roles.includes(user.role) ? children : <Navigate to="/" replace />;
}
