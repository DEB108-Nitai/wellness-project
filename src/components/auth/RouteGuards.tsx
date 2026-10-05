import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCurrentPath } from '../../lib/routes';
import { PageSpinner } from './FormControls';

/** Signed-in users only; everyone else is sent to /login and brought back afterwards. */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const here = useCurrentPath();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(here)}`} replace />;
  return <>{children}</>;
};

/** Admins only. The API enforces the same rule on every admin endpoint (PRD §2). */
export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const here = useCurrentPath();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(here)}`} replace />;
  if (user.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 mx-auto text-amber-500" />
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Administrators only</h1>
        <p className="text-slate-600">Your account doesn't have access to the admin console.</p>
        <Link to="/" className="inline-block text-sm font-semibold text-teal-700 hover:text-teal-800">
          ← Back to home
        </Link>
      </div>
    );
  }
  return <>{children}</>;
};
