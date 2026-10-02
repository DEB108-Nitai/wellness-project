import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { storage } from '../../services/storageService';
import { UserAccount } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    setError('');
    setTimeout(() => {
      // Authenticate with Google account
      const googleUser = storage.loginUser('devranjanpramanick@gmail.com', 'Devranjan Pramanick');
      setGoogleLoading(false);
      if (onAuthSuccess) onAuthSuccess(googleUser);
      onClose();
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (mode === 'forgot') {
        if (!email.includes('@')) {
          setError('Please provide a valid email address.');
          setIsLoading(false);
          return;
        }
        setSuccessMsg(`A password reset link has been sent to ${email}.`);
        setIsLoading(false);
        return;
      }

      if (mode === 'signup') {
        if (!name.trim() || !email.includes('@') || password.length < 6) {
          setError('Please complete all fields with a valid password (min 6 characters).');
          setIsLoading(false);
          return;
        }
        const newUser = storage.signupUser(name.trim(), email.trim(), 'user');
        setIsLoading(false);
        if (onAuthSuccess) onAuthSuccess(newUser);
        onClose();
        return;
      }

      // Sign In mode
      if (!email.includes('@')) {
        setError('Please enter a valid email address.');
        setIsLoading(false);
        return;
      }
      const user = storage.loginUser(email.trim(), name.trim() || undefined);
      setIsLoading(false);
      if (onAuthSuccess) onAuthSuccess(user);
      onClose();
    }, 400);
  };

  const handleQuickDemo = (demoType: 'user' | 'admin') => {
    let demoEmail = 'alex.vance@example.com';
    let demoName = 'Alex Vance';
    if (demoType === 'admin') {
      demoEmail = 'admin@wellness16pf.org';
      demoName = 'Super Admin';
    }

    const user = storage.loginUser(demoEmail, demoName);
    if (onAuthSuccess) onAuthSuccess(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in-50 duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-auto max-h-[92vh] overflow-y-auto overscroll-contain">
        {/* Top Accent Gradient Bar */}
        <div className="sticky -top-6 sm:-top-8 -mx-6 sm:-mx-8 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 z-20 mb-6" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 via-indigo-600 to-amber-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            W
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900 block font-heading">
              Wellness
            </span>
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              16 PF & 60-Day Transformation
            </span>
          </div>
        </div>

        {/* Header Title */}
        <div className="space-y-1 mb-5">
          <h2 className="text-xl font-bold text-slate-900 font-heading">
            {mode === 'signin' && 'Sign In to Your Account'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-xs text-slate-500">
            {mode === 'signin' && 'Access your assessment profile and 60-day challenge progress.'}
            {mode === 'signup' && 'Join Wellness to unlock factor scores and program tracks.'}
            {mode === 'forgot' && 'Enter your registered email to receive recovery instructions.'}
          </p>
        </div>

        {/* Google Sign In Button */}
        {mode !== 'forgot' && (
          <div className="space-y-4 mb-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
            >
              {/* Google official SVG logo */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? 'Connecting to Google...' : mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                or with email
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError('');
                    }}
                    className="text-[11px] font-medium text-teal-700 hover:text-teal-800 cursor-pointer"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 font-medium py-1 animate-in fade-in-50">
              {error}
            </p>
          )}

          {successMsg && (
            <p className="text-xs text-emerald-700 font-medium py-1 animate-in fade-in-50">
              {successMsg}
            </p>
          )}

          {/* Green / Teal Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle mode links */}
        <div className="pt-4 text-center border-t border-slate-100 mt-4">
          {mode === 'signin' && (
            <p className="text-xs text-slate-600">
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                className="text-teal-700 font-bold hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <button
                onClick={() => {
                  setMode('signin');
                  setError('');
                }}
                className="text-teal-700 font-bold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <button
              onClick={() => {
                setMode('signin');
                setError('');
                setSuccessMsg('');
              }}
              className="text-xs text-teal-700 font-semibold hover:underline cursor-pointer"
            >
              ← Back to Sign In
            </button>
          )}
        </div>

        {/* Quick Demo Switcher */}
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Instant Demo Profile</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('user')}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-semibold text-slate-700 text-center border border-slate-200 transition-colors cursor-pointer"
            >
              👤 Member Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('admin')}
              className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-[10px] font-semibold text-indigo-800 text-center border border-indigo-200 transition-colors cursor-pointer"
            >
              🛡️ Admin Console
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
