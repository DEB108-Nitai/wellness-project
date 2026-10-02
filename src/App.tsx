/**
 * Wellness 16 Personality Factors Platform
 * Main React Application Root
 */

import React, { useState, useEffect } from 'react';
import { storage } from './services/storageService';
import { TestSession } from './types';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { CookieNotice } from './components/layout/CookieNotice';
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
import { AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [activeFactorCode, setActiveFactorCode] = useState<string | undefined>(undefined);
  const [activeCampaignSlug, setActiveCampaignSlug] = useState<string | undefined>(undefined);
  const [activeResultsToken, setActiveResultsToken] = useState<string | null>(null);

  const settings = storage.getSettings();

  // Parse URL parameters on initial load (e.g. ?results=token, ?campaign=slug)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultsToken = params.get('results');
    const campaignParam = params.get('campaign');

    if (resultsToken) {
      setActiveResultsToken(resultsToken);
      setCurrentView('results');
    } else if (campaignParam) {
      setActiveCampaignSlug(campaignParam);
      setCurrentView('test');
    }
  }, []);

  const handleNavigate = (view: string, param?: string) => {
    if (view === 'factors' && param) {
      setActiveFactorCode(param);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTestComplete = (token: string) => {
    setActiveResultsToken(token);
    setCurrentView('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetakeTest = () => {
    setActiveResultsToken(null);
    setCurrentView('test');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Find active session for results view
  let activeSession: TestSession | undefined;
  if (activeResultsToken) {
    activeSession = storage.getSessionByToken(activeResultsToken);
  }
  // Fallback to latest completed session if available
  if (!activeSession && currentView === 'results') {
    const all = storage.getSessions();
    activeSession = all.find((s) => s.status === 'completed') || all[0];
  }

  // Maintenance mode handling
  if (settings.maintenanceMode && currentView !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-slate-800 p-8 rounded-3xl border border-slate-700">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-2xl font-bold font-heading">Maintenance in Progress</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            The Wellness psychometrics platform is currently undergoing scheduled database maintenance. Please check back shortly.
          </p>
          <button
            onClick={() => setCurrentView('admin')}
            className="text-xs text-teal-400 hover:underline pt-2 inline-block cursor-pointer"
          >
            Administrator Login →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E2430]">
      {/* Top Announcement Bar (Admin-configurable) */}
      {settings.announcementActive && (
        <AnnouncementBar text={settings.announcementText} />
      )}

      {/* Sticky Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        activeCampaignSlug={activeCampaignSlug}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingView onNavigate={handleNavigate} />
        )}

        {currentView === 'test' && (
          <TestFlowView
            onComplete={handleTestComplete}
            onNavigate={handleNavigate}
            campaignSlug={activeCampaignSlug}
          />
        )}

        {currentView === 'results' && activeSession && (
          <ResultsView
            session={activeSession}
            onRetake={handleRetakeTest}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'factors' && (
          <FactorsDirectoryView
            initialFactorCode={activeFactorCode}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'how-it-works' && (
          <HowItWorksView onNavigate={handleNavigate} />
        )}

        {currentView === 'benefits' && (
          <BenefitsView onNavigate={handleNavigate} />
        )}

        {currentView === 'faq' && (
          <FAQView onNavigate={handleNavigate} />
        )}

        {currentView === 'contact' && (
          <ContactView />
        )}

        {currentView === 'privacy-terms' && (
          <PrivacyTermsView initialTab="privacy" />
        )}

        {currentView === 'admin' && (
          <AdminPortalView onNavigate={handleNavigate} />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Essential Cookies Consent Banner */}
      <CookieNotice />
    </div>
  );
}
