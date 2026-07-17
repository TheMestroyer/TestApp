import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function GuestRoute({ children }) {
  const { user, checked } = useAuth();

  if (!checked) {
    return (
      <div className="fullscreenCenter">
        <div className="loadingDot" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  return children;
}
