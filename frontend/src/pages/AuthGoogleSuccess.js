// frontend/src/pages/AuthGoogleSuccess.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';

const AuthGoogleSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/login?error=no_token');
      return;
    }

    const completeLogin = async () => {
      try {
        // 1. Save the token (same as normal login)
        localStorage.setItem('token', token);

        // 2. Fetch full user info from backend (just like after normal login)
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch user details');
        }

        const user = await res.json();

        // 3. Save all user info to localStorage (matches your normal login)
        localStorage.setItem('username', user.fullName || 'User');
        localStorage.setItem('userRole', user.role || 'USER');
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userAvatar', user.avatar || '');

        // Optional: clear any intended path
        localStorage.removeItem('intendedPath');

        // 4. Redirect to landing page (logged in)
        navigate('/');
      } catch (err) {
        console.error('Google login completion error:', err);
        // Fallback: still save token and redirect (better UX)
        localStorage.setItem('token', token);
        navigate('/');
      }
    };

    completeLogin();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center p-10 bg-white rounded-2xl shadow-xl max-w-md">
        <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6 animate-pulse" />
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Login Successful!
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Welcome back! You have been successfully authenticated with Google.
        </p>
        <div className="flex justify-center items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-gray-700 font-medium">Redirecting to home...</span>
        </div>
      </div>
    </div>
  );
};

export default AuthGoogleSuccess;