// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    // Save the page they wanted to visit
    localStorage.setItem('intendedPath', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);

    if (adminOnly && decoded.role !== 'ADMIN') {
      return <Navigate to="/" replace />;
    }

    return children;
  } catch (err) {
    localStorage.clear();
    localStorage.setItem('intendedPath', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;