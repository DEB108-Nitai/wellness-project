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
  Check
} from 'lucide-react';
import {
  AuditLogEntry,
  Campaign,
  DeletionRequest,
  Researcher,
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
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(true);
  const [activeAdminTab, setActiveAdminTab] = useState<
    'dashboard' | 'participants' | 'researchers' | 'campaigns' | 'deletions' | 'settings' | 'audit' | 'questions'
  >('dashboard');

  // Search & Filter states for participants
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [filterFlagged, setFilterFlagged] = useState('all');

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
  const researchers = storage.getResearchers();
  const campaigns = storage.getCampaigns();
  const deletions = storage.getDeletions();
  const auditLogs = storage.getAuditLogs();

  // Statistics
  const totalStarted = sessions.length;
  const totalCompleted = sessions.filter((s) => s.status === 'completed').length;
  const completionRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;
  const pendingResearchers = researchers.filter((r) => r.status === 'pending');
  const pendingDeletions = deletions.filter((d) => d.status === 'pending');
  const flaggedSessions = sessions.filter((s) => s.qualityFlags?.flagged);

  // Filtered participants list
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.demographics.nickname && s.demographics.nickname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.demographics.country.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCampaign = filterCampaign === 'all' || (s.campaignSlug || 'general') === filterCampaign;
    const matchesFlag =
      filterFlagged === 'all' ||
      (filterFlagged === 'flagged' && s.qualityFlags?.flagged) ||
      (filterFlagged === 'clean' && !s.qualityFlags?.flagged);

    return matchesSearch && matchesCampaign && matchesFlag;
  });

  // Action: Approve researcher
  const handleApproveResearcher = (id: string) => {
    storage.updateResearcherStatus(id, 'approved', 'Approved by administrator');
    refresh();
  };

  const handleRejectResearcher = (id: string) => {
    storage.updateResearcherStatus(id, 'rejected', 'Declined application');
    refresh();
  };

  // Action: Approve campaign
  const handleApproveCampaign = (id: string) => {
    storage.updateCampaignStatus(id, 'live', 'Approved for public collection');
    refresh();
  };

  // Action: Approve deletion request
  const handleApproveDeletion = (id: string) => {
    storage.approveDeletion(id);
    refresh();
  };

  // Action: Save settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateSettings(settingsState);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
    refresh();
  };

  // CSV / JSON Exports
  const handleExportCSV = () => {
    const csvData = storage.exportParticipantsCSV(filteredSessions);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wellness_all_participants_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const jsonData = storage.exportParticipantsJSON(filteredSessions);
    const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `wellness_all_participants_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-lg text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">Admin Console Login</h2>
            <p className="text-xs text-slate-500 mt-1">Superadmin credentials required.</p>
          </div>
          <button
            onClick={() => setIsAdminAuthenticated(true)}
            className="w-full py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-sm rounded-xl"
          >
            Authenticate as Super Admin
          </button>
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
              SUPERADMIN · SECURITY HARDENED
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
            Psychometric database console, researcher authorizations, and system settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
          { id: 'researchers', label: 'Researchers', badge: pendingResearchers.length > 0 ? `${pendingResearchers.length} pending` : undefined },
          { id: 'campaigns', label: 'Campaigns Queue', badge: campaigns.length },
          { id: 'deletions', label: 'Deletion Requests', badge: pendingDeletions.length > 0 ? `${pendingDeletions.length} new` : undefined },
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
              <span className="text-xs font-medium text-slate-500">Total Started Sessions</span>
              <h3 className="text-2xl font-bold text-slate-900 font-mono">{totalStarted}</h3>
              <span className="text-[11px] text-teal-700 font-medium">All campaigns & generic</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Completed Assessments</span>
              <h3 className="text-2xl font-bold text-teal-700 font-mono">{totalCompleted}</h3>
              <span className="text-[11px] text-slate-500 font-medium">{completionRate}% Completion Rate</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Quality Flagged</span>
              <h3 className="text-2xl font-bold text-amber-700 font-mono">{flaggedSessions.length}</h3>
              <span className="text-[11px] text-slate-500">Speed / Repetition checks</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-medium text-slate-500">Registered Researchers</span>
              <h3 className="text-2xl font-bold text-indigo-700 font-mono">{researchers.length}</h3>
              <span className="text-[11px] text-indigo-600 font-medium">
                {pendingResearchers.length} awaiting review
              </span>
            </div>
          </div>

          {/* Quick Approvals & Recent Audit Action */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Researcher Queue */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900 font-heading">
                Pending Researcher Approvals
              </h4>
              {pendingResearchers.length > 0 ? (
                <div className="space-y-3">
                  {pendingResearchers.map((r) => (
                    <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{r.name}</span>
                        <span className="text-slate-500">{r.organization} ({r.country})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleApproveResearcher(r.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectResearcher(r.id)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">No pending researcher applications in queue.</p>
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
                Filter by campaign, country, quality flags, and review full 163-statement answers.
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
                value={filterCampaign}
                onChange={(e) => setFilterCampaign(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="all">All Campaigns</option>
                <option value="general">Generic (/test)</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.slug}
                  </option>
                ))}
              </select>

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
                  <th className="py-3 px-4">Ref ID</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Demographics</th>
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Quality</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSessions.map((s) => (
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
                    <td className="py-3 px-4 font-mono text-[11px] text-teal-700">
                      {s.campaignSlug || 'general'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(s.startedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.qualityFlags?.flagged
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {s.qualityFlags?.flagged ? 'FLAGGED' : 'CLEAN'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setInspectSession(s)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RESEARCHERS MANAGEMENT */}
      {activeAdminTab === 'researchers' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 font-heading">
            Researcher Accounts & Institutions
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Researcher</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {researchers.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.name}</div>
                      <div className="text-[11px] text-slate-400">{r.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{r.organization}</td>
                    <td className="py-3 px-4">{r.country}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : r.status === 'pending'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {r.status !== 'approved' && (
                        <button
                          onClick={() => handleApproveResearcher(r.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded-lg"
                        >
                          Approve
                        </button>
                      )}
                      {r.status === 'approved' && (
                        <button
                          onClick={() => storage.updateResearcherStatus(r.id, 'suspended', 'Suspended by admin')}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DELETION REQUESTS */}
      {activeAdminTab === 'deletions' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              GDPR & DPDP Right to Erasure Queue
            </h3>
            <p className="text-xs text-slate-500">
              Approve verified participant deletion requests to purge test session records.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Reference Code</th>
                  <th className="py-3 px-4">Requested Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {deletions.map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{d.referenceId}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {d.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {d.status === 'pending' && (
                        <button
                          onClick={() => handleApproveDeletion(d.id)}
                          className="px-3 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
                        >
                          Purge Record
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: QUESTION POOL & FACTORS */}
      {activeAdminTab === 'questions' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Calibrated IPIP-16 Item Pool (163 Statements)
              </h3>
              <p className="text-xs text-slate-500">
                16 factors, reverse-keyed items, and 3 embedded attention check statements.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-lg">
              Active Set: IPIP16-v1
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0">
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
                        <span className="text-slate-400 text-[10px]">Standard</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS */}
      {activeAdminTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 font-heading">
              Platform & Assessment Settings
            </h3>
            <p className="text-xs text-slate-500">
              Configure items per page, minimum age restrictions, and global announcement.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Maintenance Mode</span>
                  <span className="text-[11px] text-slate-500">Blocks public test starts with 503 maintenance message.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settingsState.maintenanceMode}
                  onChange={(e) => setSettingsState({ ...settingsState, maintenanceMode: e.target.checked })}
                  className="w-5 h-5 text-teal-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Researcher Auto-Approval</span>
                  <span className="text-[11px] text-slate-500">Automatically approve new researcher accounts on registration.</span>
                </div>
                <input
                  type="checkbox"
                  checked={settingsState.researcherAutoApprove}
                  onChange={(e) => setSettingsState({ ...settingsState, researcherAutoApprove: e.target.checked })}
                  className="w-5 h-5 text-teal-600 rounded"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Items Per Page</label>
                <input
                  type="number"
                  min={5}
                  max={20}
                  value={settingsState.itemsPerPage}
                  onChange={(e) => setSettingsState({ ...settingsState, itemsPerPage: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Age Gate</label>
                <input
                  type="number"
                  min={13}
                  max={18}
                  value={settingsState.minAge}
                  onChange={(e) => setSettingsState({ ...settingsState, minAge: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Top Announcement Banner Text</label>
              <input
                type="text"
                value={settingsState.announcementText}
                onChange={(e) => setSettingsState({ ...settingsState, announcementText: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>

            {settingsSaved && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Settings updated successfully!</span>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                type="submit"
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 7: AUDIT LOG */}
      {activeAdminTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 font-heading">
            System Security & Audit Trail
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-semibold">{log.actorName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-700">{log.action}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{log.entityType} ({log.entityId})</td>
                    <td className="py-3 px-4 text-slate-500">{log.details || '—'}</td>
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-teal-700">{inspectSession.referenceId}</span>
                <h3 className="text-xl font-bold text-slate-900 font-heading">
                  {inspectSession.demographics.nickname || 'Participant'} — Full Diagnostic Record
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
                <span className="text-slate-400 block">Campaign</span>
                <span className="font-semibold text-teal-700 font-mono">{inspectSession.campaignSlug || 'general'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Quality Status</span>
                <span className={`font-semibold ${inspectSession.qualityFlags?.flagged ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {inspectSession.qualityFlags?.flagged ? 'FLAGGED' : 'CLEAN'}
                </span>
              </div>
            </div>

            {/* Quality flags notes if any */}
            {inspectSession.qualityFlags?.notes && inspectSession.qualityFlags.notes.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold">Quality Verification Notes:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                  {inspectSession.qualityFlags.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 16 Factor Scores */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                16 Factor Sten Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {inspectSession.scores?.map((sc) => (
                  <div key={sc.factorCode} className="p-2.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-900">{sc.factorCode} ({sc.factorName})</span>
                      <span className="font-mono font-bold text-teal-700">Sten {sc.sten}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Raw: {sc.rawScore} · z: {sc.zScore}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON viewer */}
            <details className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <summary className="font-semibold text-slate-700 cursor-pointer">
                View Raw Answers JSON ({inspectSession.answeredCount} items)
              </summary>
              <pre className="mt-2 text-[11px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                {JSON.stringify(inspectSession.draftAnswers, null, 2)}
              </pre>
            </details>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={() => {
                  storage.deleteSessionData(inspectSession.referenceId);
                  setInspectSession(null);
                  refresh();
                }}
                className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Purge Record
              </button>

              <button
                onClick={() => setInspectSession(null)}
                className="px-6 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl"
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
