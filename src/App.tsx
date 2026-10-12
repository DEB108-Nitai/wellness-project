/**
 * Transenigma — company site, 16 Personality Factors assessment and 60-Day programs
 * Main React Application Root — real URLs via react-router (PRD SITE-6).
 */

import React from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigationType, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useSettings } from './context/SettingsContext';
import { useAuth } from './context/AuthContext';
import { useAppNavigate, viewForPath } from './lib/routes';
import { applyPageMeta } from './lib/pageMeta';
import { recordVisit } from './api/visits';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { CookieNotice } from './components/layout/CookieNotice';
import { VerifyEmailBanner } from './components/layout/VerifyEmailBanner';
import { RequireAdmin, RequireAuth } from './components/auth/RouteGuards';
import { PageSpinner } from './components/auth/FormControls';
import { LandingView } from './components/views/LandingView';
import { FactorsDirectoryView } from './components/views/FactorsDirectoryView';
import { HowItWorksView } from './components/views/HowItWorksView';
import { BenefitsView } from './components/views/BenefitsView';
import { FAQView } from './components/views/FAQView';
import { TeamView } from './components/views/TeamView';
import { ResearchView } from './components/views/ResearchView';
import { ConsultancyView } from './components/views/ConsultancyView';
import { ContactView } from './components/views/ContactView';
import { PrivacyTermsView } from './components/views/PrivacyTermsView';
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

/**
 * New pages open at the top, as on a normal website (links don't do this by themselves in a single-page app).
 * Section links (/#id, /research#slug) also start from the top; the page then scrolls to its section.
 * Skipped for the browser's back/forward buttons, which restore the previous position.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  React.useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the page itself changes
  }, [pathname]);
  return null;
}

/** Per-page title, description, canonical URL and robots rule (src/lib/pageMeta.ts), and the private visit count. */
function PageMeta() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  React.useEffect(() => applyPageMeta(pathname), [pathname]);
  // Counted once the sign-in state is known, so the first visit shares AuthContext's /auth/me request.
  React.useEffect(() => {
    if (!loading) recordVisit(pathname, user?.role === 'admin');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, loading]);
  return null;
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

// The admin console is a separate bundle, downloaded only when an admin opens it (PRD §5).
const AdminApp = React.lazy(() => import('./components/admin/AdminApp'));

export default function App() {
  return (
    <>
    {/* Every page, including the full-screen sign-in pages */}
    <ScrollToTop />
    <PageMeta />
    <Routes>
      {/* Focused onboarding screens (no site chrome) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Admin console: its own layout, no public site chrome */}
      <Route
        path="/admin/*"
        element={
          <RequireAdmin>
            <React.Suspense fallback={<PageSpinner />}>
              <AdminApp />
            </React.Suspense>
          </RequireAdmin>
        }
      />

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
        <Route path="/research" element={<ResearchView />} />
        <Route path="/consultancy" element={<WithNavigate component={ConsultancyView} />} />
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
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
        <Route path="/privacy-terms" element={<Navigate to="/privacy" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </>
  );
}
