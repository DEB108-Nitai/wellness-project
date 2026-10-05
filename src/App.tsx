/**
 * Wellness 16 Personality Factors Platform
 * Main React Application Root — real URLs via react-router (PRD SITE-6).
 */

import React from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { storage } from './services/storageService';
import { useAuth } from './context/AuthContext';
import { useAppNavigate, viewForPath } from './lib/routes';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { CookieNotice } from './components/layout/CookieNotice';
import { VerifyEmailBanner } from './components/layout/VerifyEmailBanner';
import { RequireAdmin, RequireAuth } from './components/auth/RouteGuards';
import { LandingView } from './components/views/LandingView';
import { TestFlowView } from './components/views/TestFlowView';
import { ResultsView } from './components/views/ResultsView';
import { FactorsDirectoryView } from './components/views/FactorsDirectoryView';
import { HowItWorksView } from './components/views/HowItWorksView';
import { BenefitsView } from './components/views/BenefitsView';
import { FAQView } from './components/views/FAQView';
import { ContactView } from './components/views/ContactView';
import { PrivacyTermsView } from './components/views/PrivacyTermsView';
import { AdminPortalView } from './components/views/AdminPortalView';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { AccountPage } from './pages/AccountPage';
import { NotFoundPage } from './pages/NotFoundPage';

/** Public site chrome: announcement, navbar, verification reminder, footer, cookie notice. */
function SiteLayout() {
  const location = useLocation();
  const onNavigate = useAppNavigate();
  const { user } = useAuth();
  const settings = storage.getSettings();

  // Maintenance mode (admins keep full access). Enforced server-side in Phase 4.
  if (settings.maintenanceMode && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-slate-800 p-8 rounded-3xl border border-slate-700">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-2xl font-bold font-heading">Maintenance in Progress</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The Wellness platform is undergoing scheduled maintenance. Please check back shortly.
          </p>
          <Link to="/login?next=/admin" className="text-sm text-teal-400 hover:underline pt-2 inline-block">
            Administrator sign-in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E2430]">
      {settings.announcementActive && <AnnouncementBar text={settings.announcementText} />}
      <Navbar currentView={viewForPath(location.pathname)} onNavigate={onNavigate} />
      <VerifyEmailBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer onNavigate={onNavigate} />
      <CookieNotice />
    </div>
  );
}

function TestRoute() {
  const navigate = useNavigate();
  const onNavigate = useAppNavigate();
  return (
    <TestFlowView
      onComplete={(token) => {
        navigate(`/results?token=${encodeURIComponent(token)}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onNavigate={onNavigate}
    />
  );
}

/** Interim results route: looks up the session by its private token only — never falls back to someone else's results. */
function ResultsRoute() {
  const [params] = useSearchParams();
  const onNavigate = useAppNavigate();
  const token = params.get('token');
  const session = token ? storage.getSessionByToken(token) : undefined;

  if (!session || session.status !== 'completed') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Results not found</h1>
        <p className="text-slate-600">This results link is invalid, or the assessment has not been completed yet.</p>
        <Link to="/test" className="inline-block text-sm font-semibold text-teal-700 hover:text-teal-800">
          Take the assessment →
        </Link>
      </div>
    );
  }
  return <ResultsView session={session} onRetake={() => onNavigate('test')} onNavigate={onNavigate} />;
}

function FactorsRoute() {
  const { code } = useParams();
  const onNavigate = useAppNavigate();
  return <FactorsDirectoryView key={code ?? 'all'} initialFactorCode={code?.toUpperCase()} onNavigate={onNavigate} />;
}

function WithNavigate<P extends { onNavigate: (view: string, param?: string) => void }>({
  component: Component,
}: {
  component: React.ComponentType<P>;
}) {
  const onNavigate = useAppNavigate();
  return <Component {...({ onNavigate } as P)} />;
}

export default function App() {
  return (
    <Routes>
      {/* Focused onboarding screens (no site chrome) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<SiteLayout />}>
        <Route index element={<WithNavigate component={LandingView} />} />
        <Route path="/test" element={<TestRoute />} />
        <Route path="/results" element={<ResultsRoute />} />
        <Route path="/factors" element={<FactorsRoute />} />
        <Route path="/factors/:code" element={<FactorsRoute />} />
        <Route path="/how-it-works" element={<WithNavigate component={HowItWorksView} />} />
        <Route path="/benefits" element={<WithNavigate component={BenefitsView} />} />
        <Route path="/faq" element={<WithNavigate component={FAQView} />} />
        <Route path="/contact" element={<ContactView />} />
        <Route path="/privacy" element={<PrivacyTermsView key="privacy" initialTab="privacy" />} />
        <Route path="/terms" element={<PrivacyTermsView key="terms" initialTab="terms" />} />
        <Route
          path="/account"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <WithNavigate component={AdminPortalView} />
            </RequireAdmin>
          }
        />
        <Route path="/privacy-terms" element={<Navigate to="/privacy" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
