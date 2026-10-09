/**
 * Transenigma — company site, 16 Personality Factors assessment and 60-Day programs
 * Main React Application Root — real URLs via react-router (PRD SITE-6).
 */

import React from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useSettings } from './context/SettingsContext';
import { useAuth } from './context/AuthContext';
import { useAppNavigate, viewForPath } from './lib/routes';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { CookieNotice } from './components/layout/CookieNotice';
import { VerifyEmailBanner } from './components/layout/VerifyEmailBanner';
import { RequireAdmin, RequireAuth } from './components/auth/RouteGuards';
import { LandingView } from './components/views/LandingView';
import { FactorsDirectoryView } from './components/views/FactorsDirectoryView';
import { HowItWorksView } from './components/views/HowItWorksView';
import { BenefitsView } from './components/views/BenefitsView';
import { FAQView } from './components/views/FAQView';
import { TeamView } from './components/views/TeamView';
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
import { UnsubscribePage } from './pages/UnsubscribePage';
import { AssessmentPage } from './pages/test/AssessmentPage';
import { ResultsPage } from './pages/results/ResultsPage';
import { SharedResultsPage } from './pages/results/SharedResultsPage';
import { MyResultsPage } from './pages/results/MyResultsPage';

/** Public site chrome: announcement, navbar, verification reminder, footer, cookie notice. */
function SiteLayout() {
  const location = useLocation();
  const onNavigate = useAppNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();

  // Maintenance mode: the API also refuses public requests (503); admins keep full access (SITE-5).
  if (settings.maintenance_mode && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-slate-800 p-8 rounded-3xl border border-slate-700">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-2xl font-bold font-heading">Maintenance in Progress</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            The Transenigma website is undergoing scheduled maintenance. Please check back shortly.
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
      {settings.announcement_active && settings.announcement_text && <AnnouncementBar text={settings.announcement_text} />}
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
        <Route path="/test" element={<AssessmentPage />} />
        <Route path="/results/:ref" element={<ResultsPage />} />
        <Route path="/r/:token" element={<SharedResultsPage />} />
        <Route
          path="/my-results"
          element={
            <RequireAuth>
              <MyResultsPage />
            </RequireAuth>
          }
        />
        <Route path="/factors" element={<FactorsRoute />} />
        <Route path="/factors/:code" element={<FactorsRoute />} />
        <Route path="/how-it-works" element={<WithNavigate component={HowItWorksView} />} />
        <Route path="/benefits" element={<WithNavigate component={BenefitsView} />} />
        <Route path="/faq" element={<WithNavigate component={FAQView} />} />
        <Route path="/team" element={<WithNavigate component={TeamView} />} />
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
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
        <Route path="/privacy-terms" element={<Navigate to="/privacy" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
