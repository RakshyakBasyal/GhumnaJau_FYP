// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff, Plane } from 'lucide-react';
import { login as apiLogin } from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiLogin({ email, password });

      // Check if it's an admin trying to login here
      if (res.data.role === 'ADMIN') {
        setError('Admin access restricted. Please use the dedicated Admin Login portal.');
        setLoading(false);
        return;
      }

      // Normal user login success
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.fullName || 'User');
      localStorage.setItem('userRole', res.data.role);
      localStorage.setItem('userEmail', res.data.email);

      const intendedPath = localStorage.getItem('intendedPath') || '/';
      localStorage.removeItem('intendedPath');
      navigate(intendedPath);
    } catch (err) {
      setError(err.response?.data?.msg || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" className="flex justify-center items-center space-x-3 mb-8">
            <Plane className="h-14 w-14 text-blue-600" />
            <span className="text-4xl font-bold text-gray-900">Ghumna Jau</span>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-3 text-base text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 underline transition">
              Sign up here
            </Link>
          </p>
        </div>
        <div className="bg-white py-10 px-8 shadow-2xl rounded-2xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
                {error}
                {error.includes('Admin') && (
                  <div className="mt-3">
                    <Link to="/admin-login" className="font-semibold text-blue-600 hover:underline">
                      Go to Admin Login →
                    </Link>
                  </div>
                )}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-12 pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center space-x-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg shadow-md transition duration-200"
            >
              <LogIn className="h-5 w-5" />
              <span>{loading ? 'Signing in...' : 'Sign in'}</span>
            </button>
          </form>

          {/* Optional: Admin Login Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Admin access?{' '}
              <Link to="/admin-login" className="font-semibold text-blue-600 hover:text-blue-700 underline">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;