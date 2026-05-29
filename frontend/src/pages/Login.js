// // frontend/src/pages/Login.js
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff, Plane, X, ArrowLeft } from 'lucide-react';
import { login as apiLogin } from '../services/api';
import axios from 'axios';

// ── Forgot Password Modal ─────────────────────────────────────────────────────
const ForgotPasswordModal = ({ onClose }) => {
  const [step, setStep]       = useState(1); // 1=email, 2=code, 3=new password
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(120);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Step 1 — send code
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/password-reset/send-code`, { email });
      setStep(2);
      startCountdown();
    } catch (err) {
      const data = err.response?.data;
      if (data?.googleOnly) {
        setError('This account uses Google Sign-In. No password to reset.');
      } else {
        setError(data?.msg || 'Failed to send code. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/password-reset/verify-code`, { email, code });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.msg || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/password-reset/reset`, { email, code, newPassword });
      setSuccess('Password reset successfully! You can now log in.');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = ['Forgot Password', 'Enter Verification Code', 'Set New Password'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">

        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">
          <X className="h-5 w-5" />
        </button>

        {/* Back button (steps 2 & 3) */}
        {step > 1 && !success && (
          <button
            onClick={() => { setStep(step - 1); setError(''); }}
            className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-6 mt-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-blue-600' : s < step ? 'w-4 bg-blue-300' : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">
          {stepTitles[step - 1]}
        </h2>

        {/* Success state */}
        {success ? (
          <div className="mt-6 text-center space-y-4">
            <div className="text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
              {success}
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            {/* ── STEP 1: Email ── */}
            {step === 1 && (
              <form onSubmit={handleSendCode} className="mt-6 space-y-4">
                <p className="text-sm text-gray-500 text-center">
                  Enter your email and we'll send you a 6-digit verification code.
                </p>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg transition"
                >
                  {loading ? 'Sending...' : 'Send Code'}
                </button>
              </form>
            )}

            {/* ── STEP 2: Code ── */}
            {step === 2 && (
              <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
                <p className="text-sm text-gray-500 text-center">
                  We sent a 6-digit code to <strong>{email}</strong>. It expires in 2 minutes.
                </p>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="______"
                  className="w-full text-center text-3xl font-bold tracking-widest px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                {/* Countdown */}
                {countdown > 0 ? (
                  <p className="text-center text-sm text-gray-500">
                    Code expires in{' '}
                    <span className={`font-semibold ${countdown <= 30 ? 'text-red-500' : 'text-blue-600'}`}>
                      {formatTime(countdown)}
                    </span>
                  </p>
                ) : (
                  <p className="text-center text-sm text-red-500">
                    Code expired.{' '}
                    <button
                      type="button"
                      onClick={() => { setStep(1); setCode(''); setError(''); }}
                      className="underline font-semibold hover:text-red-600"
                    >
                      Request a new one
                    </button>
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || code.length !== 6 || countdown === 0}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg transition"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
              </form>
            )}

            {/* ── STEP 3: New Password ── */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                <p className="text-sm text-gray-500 text-center">
                  Choose a strong new password for your account.
                </p>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 chars)"
                    className="pl-10 pr-12 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg transition"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Main Login Page ───────────────────────────────────────────────────────────
const Login = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [showForgot, setShowForgot]     = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiLogin({ email, password });
      if (res.data.role === 'ADMIN') {
        setError('Admin access restricted. Please use the dedicated Admin Login portal.');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.fullName || 'User');
      localStorage.setItem('userRole', res.data.role);
      localStorage.setItem('userEmail', res.data.email);
      localStorage.setItem('userAvatar', res.data.avatar || '');

      // Check if user has completed their profile: must have city and travelStyle (bio is optional)
      const isProfileIncomplete = !res.data.city || !res.data.travelStyle;
      const intendedPath = localStorage.getItem('intendedPath') || '/';
      localStorage.removeItem('intendedPath');

      if (isProfileIncomplete) {
        navigate('/profile');
      } else {
        navigate(intendedPath === '/' ? '/community' : intendedPath);
      }
    } catch (err) {
      const serverMsg = err.response?.data?.msg || 'Invalid email or password';
      if (err.response?.data?.googleOnly) {
        setError(
          <span className="block">
            {serverMsg}{' '}
            <button
              type="button"
              onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/google`}
              className="font-semibold text-blue-600 underline hover:text-blue-700 transition"
            >
              Sign in with Google
            </button>
          </span>
        );
      } else {
        setError(serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="flex flex-col items-center justify-center space-y-2 mb-6">
              <Plane className="h-16 w-16 text-blue-600" />
              <span className="text-4xl font-bold text-gray-900">Ghumna Jau</span>
            </div>
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
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email" type="email" required value={email}
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
                  {/* ← Forgot password link */}
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline transition"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="password" type={showPassword ? 'text' : 'password'} required value={password}
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

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/google`}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition text-gray-700 font-medium shadow-sm"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.51h5.84c-.25 1.31-.98 2.42-2.07 3.16v2.63h3.35c1.96-1.81 3.09-4.47 3.09-7.25z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-1.01 7.28-2.73l-3.35-2.63c-1.01.68-2.29 1.08-3.93 1.08-3.02 0-5.58-2.04-6.49-4.79H.96v2.67C2.77 20.39 6.62 23 12 23z" fill="#34A853"/>
                    <path d="M5.51 14.21c-.23-.68-.36-1.41-.36-2.21s.13-1.53.36-2.21V7.34H.96C.35 8.85 0 10.39 0 12s.35 3.15.96 4.66l4.55-2.45z" fill="#FBBC05"/>
                    <path d="M12 4.98c1.64 0 3.11.56 4.27 1.66l3.19-3.19C17.46 1.01 14.97 0 12 0 6.62 0 2.77 2.61.96 6.34l4.55 2.45C6.42 6.02 8.98 4.98 12 4.98z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center space-x-2 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg shadow-md transition duration-200 mt-4"
              >
                <LogIn className="h-5 w-5" />
                <span>{loading ? 'Signing in...' : 'Sign in'}</span>
              </button>
            </form>

            {/* Admin login access hidden from normal users */}
            {/* 
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Admin access?{' '}
                <Link to="/admin-login" className="font-semibold text-blue-600 hover:text-blue-700 underline">
                  Login as Admin
                </Link>
              </p>
            </div>
            */}
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;

