import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Settings,
  Search,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  FileText,
  Lock,
  Sparkles,
  Award,
  Globe,
  HelpCircle,
  Sliders,
  History,
  Check,
  Volume2
} from 'lucide-react';
import {
  AuditLogEntry,
  ChallengeRegistration,
  SystemSettings,
  TestSession,
} from '../../types';
import { storage } from '../../services/storageService';
import { QUESTIONS_POOL } from '../../data/questionsData';
import { FACTORS_DATA } from '../../data/factorsData';

interface AdminPortalViewProps {
  onNavigate: (view: string) => void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({ onNavigate }) => {
  const currentUser = storage.getCurrentUser();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => currentUser?.role === 'admin');
  const [adminEmail, setAdminEmail] = useState('admin@wellness.org');
  const [adminPassword, setAdminPassword] = useState('wellness2026');
  const [authError, setAuthError] = useState('');

  const [activeAdminTab, setActiveAdminTab] = useState<
    'dashboard' | 'participants' | 'challenge-regs' | 'settings' | 'audit' | 'questions'
  >('dashboard');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail.trim() && adminPassword.trim()) {
      storage.loginUser(adminEmail.trim(), 'Super Admin');
      setIsAdminAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Please enter valid administrator credentials.');
    }
  };

  const handleQuickDemoAdminLogin = () => {
    storage.loginUser('admin@wellness.org', 'Super Admin');
    setIsAdminAuthenticated(true);
    setAuthError('');
  };

  // Search & Filter states for participants
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFlagged, setFilterFlagged] = useState('all');

  // Challenge Registrations filter states
  const [challengeSearch, setChallengeSearch] = useState('');
  const [challengeTrackFilter, setChallengeTrackFilter] = useState<'all' | 'tti-intensive' | 'mind-consciousness'>('all');
  const [challengeStatusFilter, setChallengeStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'waitlisted' | 'completed'>('all');
  const [inspectChallenge, setInspectChallenge] = useState<ChallengeRegistration | null>(null);

  // Selected participant for deep inspection
  const [inspectSession, setInspectSession] = useState<TestSession | null>(null);

  // Settings form state
  const [settingsState, setSettingsState] = useState<SystemSettings>(storage.getSettings());
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Reload trigger
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  // Load real records
  const sessions = storage.getSessions();
  const auditLogs = storage.getAuditLogs();
  const challengeRegistrations = storage.getChallengeRegistrations();

  // Statistics
  const totalStarted = sessions.length;
  const totalCompleted = sessions.filter((s) => s.status === 'completed').length;
  const completionRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;
  const flaggedSessions = sessions.filter((s) => s.qualityFlags?.flagged);
  const pendingChallenges = challengeRegistrations.filter((c) => c.status === 'pending');

  // Filtered challenge registrations
  const filteredChallenges = challengeRegistrations.filter((c) => {
    const matchesSearch =
      c.referenceCode.toLowerCase().includes(challengeSearch.toLowerCase()) ||
      c.name.toLowerCase().includes(challengeSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(challengeSearch.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(challengeSearch.toLowerCase())) ||
      c.phone.toLowerCase().includes(challengeSearch.toLowerCase());

    const matchesTrack = challengeTrackFilter === 'all' || c.programTrack === challengeTrackFilter;
    const matchesStatus = challengeStatusFilter === 'all' || c.status === challengeStatusFilter;

    return matchesSearch && matchesTrack && matchesStatus;
  });

  const handleUpdateChallengeStatus = (id: string, status: ChallengeRegistration['status']) => {
    storage.updateChallengeRegistrationStatus(id, status);
    refresh();
  };

  const handleExportChallengeCSV = () => {
    const csvData = storage.exportChallengeRegistrationsCSV();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wellness_60day_challenge_registrations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered participants list
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.demographics.nickname && s.demographics.nickname.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFlag =
      filterFlagged === 'all'
        ? true
        : filterFlagged === 'flagged'
        ? s.qualityFlags?.flagged
        : !s.qualityFlags?.flagged;

    return matchesSearch && matchesFlag;
  });

  const handleExportCSV = () => {
    const csvData = storage.exportParticipantsCSV();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wellness_16pf_data_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const jsonData = storage.exportParticipantsJSON();
    const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wellness_16pf_backup_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateSettings(settingsState);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">Admin Console Login</h2>
              <p className="text-xs text-slate-500 mt-1">Superadmin credentials required to access platform data.</p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@wellness.org"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Passkey</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
            >
              Sign In to Console
            </button>

            <button
              type="button"
              onClick={handleQuickDemoAdminLogin}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              ⚡ Quick 1-Click Demo Admin Access
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-100">
            <button
              onClick={() => onNavigate('landing')}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              ← Return to Public Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-28">
      {/* ADMIN HEADER & METRICS */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono text-teal-400 bg-slate-800 px-2.5 py-0.5 rounded">
              ADMIN CONSOLE · WELLNESS PLATFORM
            </span>
            {settingsState.maintenanceMode && (
              <span className="text-xs font-bold text-rose-300 bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700">
                MAINTENANCE MODE ACTIVE
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">
            Wellness Platform Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Psychometric database console, 60-day challenge candidate dossiers, and system settings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('landing')}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <span>← Exit to Site</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>Full DB CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>JSON Backup</span>
          </button>
        </div>
      </div>

      {/* ADMIN NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'dashboard', label: 'Overview Metrics', badge: undefined },
          { id: 'participants', label: 'Participants & Sten Data', badge: totalStarted },
          { id: 'challenge-regs', label: '60-Day Challenge Registrations', badge: challengeRegistrations.length },
          { id: 'questions', label: 'Question Set & Norms', badge: '163 items' },
          { id: 'settings', label: 'System Settings', badge: undefined },
          { id: 'audit', label: 'Audit Log', badge: auditLogs.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id as any)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === tab.id
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeAdminTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeAdminTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">16PF Started Sessions</span>
              <h3 className="text-2xl font-bold text-slate-900 font-mono">{totalStarted}</h3>
              <span className="text-[11px] text-teal-700 font-medium">All sessions recorded</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Completed Assessments</span>
              <h3 className="text-2xl font-bold text-teal-700 font-mono">{totalCompleted}</h3>
              <span className="text-[11px] text-slate-500 font-medium">{completionRate}% Completion Rate</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-xs space-y-1">
              <span className="text-xs font-medium text-amber-900">60-Day Challenge Enrolled</span>
              <h3 className="text-2xl font-bold text-amber-700 font-mono">{challengeRegistrations.length}</h3>
              <span className="text-[11px] text-amber-800 font-semibold">{pendingChallenges.length} pending review</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Quality Flagged</span>
              <h3 className="text-2xl font-bold text-slate-700 font-mono">{flaggedSessions.length}</h3>
              <span className="text-[11px] text-slate-500">Speed / Repetition checks</span>
            </div>
          </div>

          {/* Recent Audit Action & Quick Challenge Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent 60-Day Challenge Applications */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 font-heading">
                  Latest 60-Day Challenge Applicants
                </h4>
                <button
                  onClick={() => setActiveAdminTab('challenge-regs')}
                  className="text-xs text-teal-700 hover:underline font-semibold"
                >
                  View All →
                </button>
              </div>

              {challengeRegistrations.length > 0 ? (
                <div className="space-y-2.5">
                  {challengeRegistrations.slice(0, 5).map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{c.name}</span>
                        <span className="text-[11px] text-slate-500">{c.email} · {c.cohortTiming} cohort</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">No challenge applications yet.</p>
              )}
            </div>

            {/* Recent Audit Trail */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900 font-heading">
                Recent Security & System Events
              </h4>
              <div className="space-y-2.5">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-100">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-mono font-bold text-teal-700">{log.action}</span>
                      <span className="font-mono text-[10px]">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-700">{log.details || `Action performed on ${log.entityType} (${log.entityId})`}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARTICIPANTS & RESPONSES CONSOLE */}
      {activeAdminTab === 'participants' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Participant Submissions Console
              </h3>
              <p className="text-xs text-slate-500">
                Inspect 163-statement answers, Sten scale calculations, and export records.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Ref ID or nickname..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <select
                value={filterFlagged}
                onChange={(e) => setFilterFlagged(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="all">All Quality States</option>
                <option value="clean">Clean Submissions</option>
                <option value="flagged">Quality Flagged</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Country & Age</th>
                  <th className="py-3 px-4">Answered</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Quality Flag</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.referenceId}</td>
                    <td className="py-3 px-4">{s.demographics.nickname || 'Anonymous'}</td>
                    <td className="py-3 px-4">{s.demographics.country} · {s.demographics.age}y</td>
                    <td className="py-3 px-4 font-mono">{s.answeredCount} / 163</td>
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
                    <td className="py-3 px-4">
                      {s.qualityFlags?.flagged ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Flagged
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectSession(s)}
                        className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer"
                      >
                        Inspect Scores
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 60-DAY CHALLENGE REGISTRATIONS */}
      {activeAdminTab === 'challenge-regs' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  60-Day Transformation Challenge Registrations
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Review incoming candidate intakes for Sonic (STI) and Transcendental (TTI) programs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, code, city..."
                  value={challengeSearch}
                  onChange={(e) => setChallengeSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <select
                value={challengeStatusFilter}
                onChange={(e) => setChallengeStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="waitlisted">Waitlisted</option>
                <option value="completed">Completed</option>
              </select>

              <button
                onClick={handleExportChallengeCSV}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Program & Cohort</th>
                  <th className="py-3 px-4">Focus / Struggles</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredChallenges.length > 0 ? (
                  filteredChallenges.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-amber-800">{reg.referenceCode}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{reg.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {reg.age ? `${reg.age}y` : ''} {reg.city ? `· ${reg.city}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800">{reg.email}</div>
                        <div className="text-[11px] font-mono text-slate-500">{reg.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {reg.programTrack === 'tti-intensive' ? (
                            <span className="text-amber-800">Transcendental (TTI)</span>
                          ) : (
                            <span className="text-teal-800">Sonic (STI)</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 uppercase font-mono">
                          {reg.cohortTiming} cohort
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {reg.currentStruggles.slice(0, 2).map((st, i) => (
                            <span key={i} className="text-[10px] bg-rose-50 text-rose-800 px-1.5 py-0.5 rounded border border-rose-200 truncate">
                              {st}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            reg.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : reg.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : reg.status === 'waitlisted'
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {reg.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => setInspectChallenge(reg)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                        >
                          Details
                        </button>
                        {reg.status !== 'confirmed' && (
                          <button
                            onClick={() => handleUpdateChallengeStatus(reg.id, 'confirmed')}
                            className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                            title="Confirm Enrollment"
                          >
                            Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No 60-Day Challenge applications match the current filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECT CHALLENGE REGISTRATION MODAL */}
      {inspectChallenge && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-amber-800">{inspectChallenge.referenceCode}</span>
                <h3 className="text-xl font-bold text-slate-900 font-heading">
                  {inspectChallenge.name} — Intake Dossier
                </h3>
              </div>
              <button
                onClick={() => setInspectChallenge(null)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl text-xs">
              <div>
                <span className="text-slate-400 block">Email</span>
                <span className="font-semibold text-slate-800 break-all">{inspectChallenge.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone</span>
                <span className="font-semibold text-slate-800">{inspectChallenge.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Program Track</span>
                <span className="font-semibold text-amber-800">
                  {inspectChallenge.programTrack === 'tti-intensive' ? 'Transcendental (TTI)' : 'Sonic (STI)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Cohort Timing</span>
                <span className="font-semibold text-slate-800 uppercase font-mono">{inspectChallenge.cohortTiming}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Reported Struggles:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {inspectChallenge.currentStruggles.map((st, i) => (
                  <span key={i} className="text-xs bg-rose-50 text-rose-800 px-2.5 py-1 rounded-lg border border-rose-200">
                    {st}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200 text-xs">
              <span className="font-bold text-amber-900 block">Primary 60-Day Transformation Goal:</span>
              <p className="text-amber-950 italic leading-relaxed">
                "{inspectChallenge.primaryGoal}"
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  storage.deleteChallengeRegistration(inspectChallenge.id);
                  setInspectChallenge(null);
                  refresh();
                }}
                className="px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Delete Intake
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleUpdateChallengeStatus(inspectChallenge.id, 'confirmed');
                    setInspectChallenge(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Confirm Candidate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: QUESTION POOL & FACTORS */}
      {activeAdminTab === 'questions' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Calibrated IPIP-16 Item Pool (163 Statements)
              </h3>
              <p className="text-xs text-slate-500">
                16 factors, reverse-keyed items, and embedded attention check statements.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-lg">
              Active Set: IPIP16-v1
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0 bg-slate-100">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Statement Text</th>
                  <th className="py-2.5 px-3">Factor</th>
                  <th className="py-2.5 px-3">Keying</th>
                  <th className="py-2.5 px-3">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {QUESTIONS_POOL.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{q.position}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{q.text}</td>
                    <td className="py-2.5 px-3">
                      {q.factorCode ? (
                        <span className="font-bold text-teal-700 font-mono">Factor {q.factorCode}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {q.reverseKeyed ? <span className="text-rose-600">Reverse (5-x)</span> : <span className="text-slate-500">Direct</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {q.isAttentionCheck ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          Attention Check
                        </span>
                      ) : (
                        <span className="text-slate-400">Standard Item</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM SETTINGS */}
      {activeAdminTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 max-w-2xl">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              Platform Configuration & Global Flags
            </h3>
            <p className="text-xs text-slate-500">
              Update site title, announcement banner, and maintenance mode.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Platform Name
              </label>
              <input
                type="text"
                value={settingsState.siteName}
                onChange={(e) => setSettingsState({ ...settingsState, siteName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Support Email
              </label>
              <input
                type="email"
                value={settingsState.supportEmail}
                onChange={(e) => setSettingsState({ ...settingsState, supportEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Announcement Banner Text
              </label>
              <input
                type="text"
                value={settingsState.announcementText}
                onChange={(e) => setSettingsState({ ...settingsState, announcementText: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="announcementActive"
                checked={settingsState.announcementActive}
                onChange={(e) => setSettingsState({ ...settingsState, announcementActive: e.target.checked })}
                className="w-4 h-4 text-teal-600 rounded"
              />
              <label htmlFor="announcementActive" className="text-xs font-medium text-slate-700">
                Display Announcement Banner
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <input
                type="checkbox"
                id="maintenanceMode"
                checked={settingsState.maintenanceMode}
                onChange={(e) => setSettingsState({ ...settingsState, maintenanceMode: e.target.checked })}
                className="w-4 h-4 text-rose-600 rounded"
              />
              <label htmlFor="maintenanceMode" className="text-xs font-medium text-slate-700">
                Enable Maintenance Mode (locks public assessment flow)
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Save System Settings
              </button>
              {settingsSaved && (
                <span className="text-xs text-emerald-600 font-semibold ml-3 animate-in fade-in-50">
                  ✓ Settings saved successfully!
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeAdminTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              Live Security & Administrative Audit Log
            </h3>
            <p className="text-xs text-slate-500">
              Immutable logging of administrative actions, test submissions, and exports.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0 bg-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Target Entity</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{log.actorName}</td>
                    <td className="py-2.5 px-3 font-bold text-teal-700">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-600">{log.entityType} ({log.entityId})</td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                <h3 className="text-xl font-bold text-slate-900 font-heading">
                  {inspectSession.demographics.nickname || 'Participant'} — Sten Scores
                </h3>
              </div>
              <button
                onClick={() => setInspectSession(null)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-4 rounded-2xl text-xs">
              <div>
                <span className="text-slate-400 block">Status</span>
                <span className="font-semibold text-slate-800">{inspectSession.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Country</span>
                <span className="font-semibold text-slate-800">{inspectSession.demographics.country}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Age</span>
                <span className="font-semibold text-slate-800">{inspectSession.demographics.age}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Answered</span>
                <span className="font-semibold text-slate-800">{inspectSession.answeredCount} / 163</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Computed 16-Factor Sten Scores:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {inspectSession.scores?.map((s) => (
                  <div key={s.factorCode} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="font-bold text-teal-800 block">Factor {s.factorCode}</span>
                    <span className="text-[11px] text-slate-600 truncate block">{s.factorName}</span>
                    <span className="text-base font-bold font-mono text-slate-900">Sten {s.sten}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setInspectSession(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
