// src/pages/AdminLogin.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/api'; // We'll use direct API call
import { ShieldCheck, Mail, Lock, Plane } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login({ email, password });
      const { token, role, fullName } = res.data;

      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('userRole', role);
      localStorage.setItem('username', fullName || 'Admin');

      if (role === 'ADMIN') {
        navigate('/admin');
      } else {
        setError('Access denied. Admin credentials required.');
        localStorage.clear(); // Clear wrong login
      }
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center space-x-2 mb-8">
          <Plane className="h-12 w-12 text-blue-500" />
          <span className="text-3xl font-bold text-white">Ghumna Jau</span>
        </Link>

        <div className="flex justify-center mb-6">
          <div className="bg-blue-500 p-5 rounded-full shadow-2xl">
            <ShieldCheck className="h-14 w-14 text-white" />
          </div>
        </div>

        <h2 className="text-center text-4xl font-bold text-white mb-2">
          Admin Portal
        </h2>
        <p className="text-center text-gray-300 mb-8">
          Sign in to access the admin dashboard
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-8 shadow-2xl rounded-xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="admin@ghumnajau.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center space-x-3 py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition disabled:opacity-50"
            >
              <ShieldCheck className="h-6 w-6" />
              <span>{loading ? 'Signing in...' : 'Sign in as Admin'}</span>
            </button>
          </form>

          {/* <div className="mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">Demo Credentials</span>
              </div>
            </div>
            <div className="mt-4 bg-gray-50 p-5 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Email:</strong> admin@ghumnajau.com<br />
                <strong>Password:</strong> admin123
              </p>
            </div>
          </div> */}

          <div className="mt-8 text-center">
            <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to main site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;