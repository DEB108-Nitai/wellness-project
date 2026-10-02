import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  Plus,
  Copy,
  Check,
  CheckCircle2,
  Download,
  Share2,
  Calendar,
  Sparkles,
  Search,
  Filter,
  Eye,
  ArrowRight,
  ShieldCheck,
  Clock,
  QrCode,
  Layers,
  Award
} from 'lucide-react';
import { Campaign, Researcher, TestSession } from '../../types';
import { storage } from '../../services/storageService';

interface ResearcherPortalViewProps {
  onStartCampaignTest: (slug: string) => void;
  onNavigate: (view: string) => void;
}

export const ResearcherPortalView: React.FC<ResearcherPortalViewProps> = ({
  onStartCampaignTest,
  onNavigate,
}) => {
  const researchers = storage.getResearchers();
  const [currentResearcher, setCurrentResearcher] = useState<Researcher | null>(researchers[0] || null);

  // Authentication & Registration Form
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regCountry, setRegCountry] = useState('US');
  const [regPurpose, setRegPurpose] = useState('');
  const [regSuccessMessage, setRegSuccessMessage] = useState('');

  // Tab: 'campaigns' | 'new-campaign' | 'responses'
  const [activeTab, setActiveTab] = useState<'campaigns' | 'new-campaign' | 'responses'>('campaigns');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('camp_001');

  // New Campaign Form
  const [campTitle, setCampTitle] = useState('');
  const [campSlug, setCampSlug] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campWelcome, setCampWelcome] = useState('');
  const [campTarget, setCampTarget] = useState<number>(100);

  // Copy helpers & QR modal
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [activeQrModal, setActiveQrModal] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected session detail modal
  const [inspectSession, setInspectSession] = useState<TestSession | null>(null);

  // Load campaigns for researcher
  const allCampaigns = storage.getCampaigns();
  const myCampaigns = allCampaigns.filter(
    (c) => c.researcherId === currentResearcher?.id || c.researcherName === currentResearcher?.name
  );

  const selectedCampaign = allCampaigns.find((c) => c.id === selectedCampaignId) || myCampaigns[0] || allCampaigns[0];

  // Get sessions belonging to selected campaign
  const allSessions = storage.getSessions();
  const campaignSessions = allSessions.filter((s) => s.campaignSlug === selectedCampaign?.slug);

  const completedSessions = campaignSessions.filter((s) => s.status === 'completed');
  const completionRate = campaignSessions.length > 0 ? Math.round((completedSessions.length / campaignSessions.length) * 100) : 0;

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regOrg) return;

    const newRes = storage.addResearcher(regName, regEmail, regOrg, regCountry, regPurpose);
    setCurrentResearcher(newRes);
    setRegSuccessMessage(`Account created successfully! Status: ${newRes.status.toUpperCase()}.`);
    setIsRegistering(false);
  };

  const handleCreateCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentResearcher || !campTitle || !campSlug) return;

    storage.createCampaign(
      {
        researcherId: currentResearcher.id,
        researcherName: currentResearcher.name,
        title: campTitle,
        slug: campSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: campDesc,
        welcomeMessage: campWelcome,
        targetSample: campTarget,
      },
      currentResearcher.status === 'approved' // Auto approve if approved researcher
    );

    setCampTitle('');
    setCampSlug('');
    setCampDesc('');
    setCampWelcome('');
    setActiveTab('campaigns');
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/?campaign=${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(slug);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleExportCSV = () => {
    const csvData = storage.exportParticipantsCSV(campaignSessions);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wellness_campaign_${selectedCampaign?.slug || 'export'}_responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const jsonData = storage.exportParticipantsJSON(campaignSessions);
    const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wellness_campaign_${selectedCampaign?.slug || 'export'}_responses.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered campaign sessions
  const filteredSessions = campaignSessions.filter((s) => {
    const matchesSearch =
      s.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.demographics.nickname && s.demographics.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.demographics.country.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 pb-24">
      {/* RESEARCHER HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2.5 py-0.5 rounded-md">
              Researcher & Client Portal
            </span>
            {currentResearcher && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  currentResearcher.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {currentResearcher.status.toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
            {currentResearcher ? currentResearcher.name : 'Researcher Workspace'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {currentResearcher?.organization || 'Academic & Organizational Cohort Study Manager'}
          </p>
        </div>

        {/* Switch / Account selector */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={currentResearcher?.id || ''}
            onChange={(e) => {
              const res = researchers.find((r) => r.id === e.target.value);
              if (res) setCurrentResearcher(res);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white"
          >
            {researchers.map((r) => (
              <option key={r.id} value={r.id}>
                Switch: {r.name} ({r.organization.split(' ')[0]})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
          >
            {isRegistering ? 'Cancel' : '+ New Researcher'}
          </button>
        </div>
      </div>

      {regSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{regSuccessMessage}</span>
        </div>
      )}

      {/* REGISTRATION FORM MODAL / COLLAPSIBLE */}
      {isRegistering && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              Researcher Registration
            </h3>
            <p className="text-xs text-slate-500">
              Apply for an approved campaign manager account to run 16PF group studies.
            </p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Eleanor Vance"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@institution.edu"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / University</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stanford Behavioral Lab"
                  value={regOrg}
                  onChange={(e) => setRegOrg(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                <select
                  value={regCountry}
                  onChange={(e) => setRegCountry(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="US">United States</option>
                  <option value="IN">India</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="DE">Germany</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Research Purpose / Study Scope</label>
              <textarea
                rows={2}
                required
                placeholder="Briefly describe your intended use of 16-factor data..."
                value={regPurpose}
                onChange={(e) => setRegPurpose(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs"
              >
                Submit Application
              </button>
            </div>
          </form>
        </div>
      )}

      {/* WORKSPACE NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'campaigns'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          My Study Campaigns ({myCampaigns.length})
        </button>

        <button
          onClick={() => setActiveTab('new-campaign')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'new-campaign'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          + Create New Campaign
        </button>

        <button
          onClick={() => setActiveTab('responses')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'responses'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Responses & Sten Matrix ({campaignSessions.length})
        </button>
      </div>

      {/* TAB 1: CAMPAIGNS LIST & METRICS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Active Campaign</span>
              <h4 className="text-lg font-bold text-slate-900 truncate">
                {selectedCampaign?.title || 'No Campaign Selected'}
              </h4>
              <span className="text-[11px] font-mono text-teal-700">/{selectedCampaign?.slug}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Total Started Sessions</span>
              <h4 className="text-2xl font-bold text-slate-900 font-mono">
                {campaignSessions.length}
              </h4>
              <span className="text-[11px] text-slate-500">
                Target: {selectedCampaign?.targetSample || 100}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Completed Profiles</span>
              <h4 className="text-2xl font-bold text-teal-700 font-mono">
                {completedSessions.length}
              </h4>
              <span className="text-[11px] text-teal-700 font-medium">
                {completionRate}% Completion Rate
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Export Anonymized Data</span>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> JSON
                </button>
              </div>
            </div>
          </div>

          {/* Campaigns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myCampaigns.map((camp) => {
              const isSelected = selectedCampaign?.id === camp.id;
              const isCopied = copiedLink === camp.slug;

              return (
                <div
                  key={camp.id}
                  className={`bg-white rounded-3xl p-6 border transition-all space-y-5 ${
                    isSelected ? 'border-teal-500 ring-2 ring-teal-100 shadow-md' : 'border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                          /c/{camp.slug}
                        </span>
                        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {camp.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">
                        {camp.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => setSelectedCampaignId(camp.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'Active' : 'Select'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {camp.description || 'Standard academic 16-factor participant cohort.'}
                  </p>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs border border-slate-200">
                    <div className="flex justify-between text-slate-600">
                      <span>Completed / Target:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {camp.completedCount || 0} / {camp.targetSample || 100}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full"
                        style={{
                          width: `${Math.min(100, (((camp.completedCount || 0) / (camp.targetSample || 100)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions: Copy Link, QR Code, Test Link */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyLink(camp.slug)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 flex items-center gap-1.5 font-medium cursor-pointer"
                        title="Copy participant test URL"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                      </button>

                      <button
                        onClick={() => setActiveQrModal(camp.slug)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 flex items-center gap-1.5 font-medium cursor-pointer"
                        title="Display QR code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR</span>
                      </button>
                    </div>

                    <button
                      onClick={() => onStartCampaignTest(camp.slug)}
                      className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Launch Test</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CREATE NEW CAMPAIGN */}
      {activeTab === 'new-campaign' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 font-heading">
              Create New Assessment Campaign
            </h3>
            <p className="text-xs text-slate-500">
              Generate a custom study link with targeted participant tracking and welcome instructions.
            </p>
          </div>

          <form onSubmit={handleCreateCampaignSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campaign Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Q4 Executive Leadership Cohort"
                value={campTitle}
                onChange={(e) => {
                  setCampTitle(e.target.value);
                  if (!campSlug) {
                    setCampSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Slug (/c/...) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="cohort-slug"
                  value={campSlug}
                  onChange={(e) => setCampSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Sample Size
                </label>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={campTarget}
                  onChange={(e) => setCampTarget(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Description / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Research hypotheses, cohort background, or client division..."
                value={campDesc}
                onChange={(e) => setCampDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Welcome Message (Shown to test-takers)
              </label>
              <textarea
                rows={3}
                placeholder="Welcome to our organizational study. Please answer honestly..."
                value={campWelcome}
                onChange={(e) => setCampWelcome(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('campaigns')}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs cursor-pointer"
              >
                Create Campaign
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: RESPONSES TABLE & STEN MATRIX */}
      {activeTab === 'responses' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Campaign Responses & Sten Scores
              </h3>
              <p className="text-xs text-slate-500">
                Viewing anonymized responses for campaign <strong>{selectedCampaign?.title}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Ref ID or country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* DataTable */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Ref ID</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Demographics</th>
                  <th className="py-3 px-4">Completed At</th>
                  <th className="py-3 px-4">Top Factors (Sten)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSessions.length > 0 ? (
                  filteredSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {s.referenceId}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {s.demographics.nickname || 'Anonymous'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {s.demographics.country} · {s.demographics.age}y · {s.demographics.gender}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : 'In Progress'}
                      </td>
                      <td className="py-3 px-4">
                        {s.scores ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200">
                              A:{s.scores.find((x) => x.factorCode === 'A')?.sten}
                            </span>
                            <span className="bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200">
                              C:{s.scores.find((x) => x.factorCode === 'C')?.sten}
                            </span>
                            <span className="bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200">
                              Q3:{s.scores.find((x) => x.factorCode === 'Q3')?.sten}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Draft</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setInspectSession(s)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No responses recorded for this campaign yet. Share your study link to begin collecting data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {activeQrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in fade-in-50 duration-200">
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              Campaign QR Code
            </h3>
            <div className="w-48 h-48 mx-auto bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-4 flex flex-col items-center justify-center space-y-2">
              <QrCode className="w-24 h-24 text-slate-800" />
              <span className="text-[10px] font-mono text-slate-500">/c/{activeQrModal}</span>
            </div>
            <p className="text-xs text-slate-500">
              Scan with mobile camera to start the 16-factor assessment immediately.
            </p>
            <button
              onClick={() => setActiveQrModal(null)}
              className="w-full py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* INSPECT PARTICIPANT MODAL */}
      {inspectSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-teal-700">{inspectSession.referenceId}</span>
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  {inspectSession.demographics.nickname || 'Participant'}’s Score Breakdown
                </h3>
              </div>
              <button
                onClick={() => setInspectSession(null)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                ✕
              </button>
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block">Country</span>
                <span className="font-semibold text-slate-800">{inspectSession.demographics.country}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Age / Gender</span>
                <span className="font-semibold text-slate-800">{inspectSession.demographics.age}y · {inspectSession.demographics.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Education</span>
                <span className="font-semibold text-slate-800">{inspectSession.demographics.education || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Quality Flags</span>
                <span className={`font-semibold ${inspectSession.qualityFlags?.flagged ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {inspectSession.qualityFlags?.flagged ? 'Flagged' : 'Clean'}
                </span>
              </div>
            </div>

            {/* All 16 Sten Scores */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                16 Factor Sten Matrix
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {inspectSession.scores?.map((sc) => (
                  <div key={sc.factorCode} className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-900">{sc.factorCode} ({sc.factorName.split(' ')[0]})</span>
                      <span className="font-mono font-bold text-teal-700">Sten {sc.sten}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {sc.band.toUpperCase()} · Raw: {sc.rawScore}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {inspectSession.review && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
                <span className="font-bold text-amber-900">User Rating: {inspectSession.review.rating} / 5 Stars</span>
                {inspectSession.review.comment && (
                  <p className="text-amber-800 italic">"{inspectSession.review.comment}"</p>
                )}
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setInspectSession(null)}
                className="px-5 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
