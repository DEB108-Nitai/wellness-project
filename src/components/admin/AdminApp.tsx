import React, { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Briefcase,
  ClipboardList,
  Contact,
  Crown,
  FileQuestion,
  History,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Mail,
  Menu,
  Settings,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { AdminOverview } from './AdminOverview';
import { AdminsAdmin } from './AdminsAdmin';
import { AuditAdmin } from './AuditAdmin';
import { ConsultancyAdmin } from './ConsultancyAdmin';
import { FaqsAdmin } from './FaqsAdmin';
import { MessagesAdmin } from './MessagesAdmin';
import { ParticipantDetail } from './ParticipantDetail';
import { ParticipantsAdmin } from './ParticipantsAdmin';
import { QuestionSetAdmin } from './QuestionSetAdmin';
import { RegistrationsAdmin } from './RegistrationsAdmin';
import { ResearchAdmin } from './ResearchAdmin';
import { SecurityAdmin } from './SecurityAdmin';
import { SettingsPanel } from './SettingsPanel';
import { SubscribersAdmin } from './SubscribersAdmin';
import { UserDetail, UsersAdmin } from './UsersAdmin';
import { VisitorsAdmin } from './VisitorsAdmin';
import { PageHeader } from './ui';

/**
 * The admin console (Phase 5): its own layout and URLs (/admin/...), loaded only when an admin opens it.
 * Access is enforced by <RequireAdmin> around this route and by the API on every /admin endpoint.
 */
type NavItem = { to: string; label: string; icon: React.ElementType; end?: boolean };
const NAV: { heading: string | null; items: NavItem[] }[] = [
  { heading: null, items: [{ to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true }] },
  {
    heading: 'People & numbers',
    items: [
      { to: '/admin/visitors', label: 'Visitors', icon: BarChart3 },
      { to: '/admin/participants', label: 'Participants & results', icon: UsersRound },
      { to: '/admin/registrations', label: '60-Day registrations', icon: ClipboardList },
      { to: '/admin/users', label: 'Users', icon: Contact },
    ],
  },
  {
    heading: 'Inbox',
    items: [
      { to: '/admin/messages', label: 'Messages', icon: Inbox },
      { to: '/admin/subscribers', label: 'Newsletter subscribers', icon: Mail },
    ],
  },
  {
    heading: 'Website content',
    items: [
      { to: '/admin/research', label: 'Research papers', icon: BookOpen },
      { to: '/admin/consultancy', label: 'Consultancy projects', icon: Briefcase },
      { to: '/admin/faqs', label: 'FAQs', icon: FileQuestion },
    ],
  },
  {
    heading: 'System',
    items: [
      { to: '/admin/question-set', label: 'Question set & norms', icon: ListChecks },
      { to: '/admin/admins', label: 'Admins', icon: Crown },
      { to: '/admin/audit', label: 'Audit log', icon: History },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
      { to: '/admin/security', label: 'Security', icon: ShieldCheck },
    ],
  },
];

const SideNav: React.FC<{ onPick?: () => void }> = ({ onPick }) => (
  <nav aria-label="Admin sections" className="space-y-5">
    {NAV.map((group) => (
      <div key={group.heading ?? 'top'} className="space-y-1">
        {group.heading && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group.heading}</p>}
        {group.items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onPick}
            className={({ isActive }) =>
              `flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium transition-colors focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-400/30 ${
                isActive ? 'bg-teal-500/15 text-teal-200' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>
    ))}
  </nav>
);

const Brand: React.FC = () => (
  <div>
    <p className="text-lg font-bold text-white font-heading">
      trans<span className="text-teal-300">enigma</span>
    </p>
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Admin console</p>
  </div>
);

export default function AdminApp() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  const footer = (
    <div className="space-y-3 pt-4 border-t border-white/10">
      <p className="text-xs text-slate-400 truncate" title={user?.email}>
        Signed in as <span className="text-slate-200">{user?.name}</span>
      </p>
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to the site
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-slate-900 px-4 py-6 gap-8">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <SideNav />
        </div>
        {footer}
      </aside>

      {/* Phone / tablet top bar + drawer */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-slate-900 px-4 h-14">
        <Brand />
        <button onClick={() => setDrawer(true)} className="inline-flex w-11 h-11 items-center justify-center rounded-xl text-slate-200 hover:bg-white/10" aria-label="Open admin menu" aria-expanded={drawer}>
          <Menu className="w-6 h-6" />
        </button>
      </header>
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/60" onClick={() => setDrawer(false)}>
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 p-4 flex flex-col gap-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Admin menu">
            <div className="flex items-center justify-between">
              <Brand />
              <button onClick={() => setDrawer(false)} className="inline-flex w-11 h-11 items-center justify-center rounded-xl text-slate-200 hover:bg-white/10" aria-label="Close admin menu">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SideNav onPick={() => setDrawer(false)} />
            </div>
            {footer}
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
        {settings.maintenance_mode && (
          <p role="status" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            Maintenance mode is on: visitors see the maintenance page. Turn it off in <Link to="/admin/settings" className="font-semibold underline">Settings</Link>.
          </p>
        )}
        <div className="max-w-6xl mx-auto">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="registrations" element={<RegistrationsAdmin />} />
            <Route path="visitors" element={<VisitorsAdmin />} />
            <Route path="participants" element={<ParticipantsAdmin />} />
            <Route path="participants/:ref" element={<ParticipantDetail />} />
            <Route path="research" element={<ResearchAdmin />} />
            <Route path="consultancy" element={<ConsultancyAdmin />} />
            <Route
              path="settings"
              element={
                <div className="space-y-6">
                  <PageHeader title="Settings" description="Site-wide switches and details. Changes apply immediately and are recorded in the audit log." />
                  <SettingsPanel />
                </div>
              }
            />
            <Route path="security" element={<SecurityAdmin />} />
            <Route path="users" element={<UsersAdmin />} />
            <Route path="users/:id" element={<UserDetail />} />
            <Route path="admins" element={<AdminsAdmin />} />
            <Route path="messages" element={<MessagesAdmin />} />
            <Route path="subscribers" element={<SubscribersAdmin />} />
            <Route path="faqs" element={<FaqsAdmin />} />
            <Route path="audit" element={<AuditAdmin />} />
            <Route path="question-set" element={<QuestionSetAdmin />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
