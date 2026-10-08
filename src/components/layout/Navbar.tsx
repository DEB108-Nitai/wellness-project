import React, { useEffect, useRef, useState } from 'react';
import { Menu, X, ArrowRight, BarChart3, Sparkles, User, LogOut, ChevronDown, PlayCircle, Shield } from 'lucide-react';
import { useActiveSession } from '../../context/ActiveSessionContext';
import { useAuth } from '../../context/AuthContext';
import { PROGRAMS } from '../../api/challenge';
import { BRAND } from '../../lib/brand';
import { PROGRAM_ANCHORS, useSectionNavigate } from '../../lib/routes';
import { BrandLogo } from '../common/BrandLogo';

/** A destination: a routed view (onNavigate) or a section of the home page (/#id). */
interface NavLink {
  label: string;
  view?: string;
  section?: string;
  hint?: string;
}

interface NavItem extends NavLink {
  id: string;
  children?: NavLink[];
  highlight?: boolean;
  /** false = the page is not built yet; the tab stays hidden until its slice ships. */
  ready?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', view: 'landing' },
  {
    id: 'programs',
    label: 'Programs',
    highlight: true,
    children: [
      { label: 'All 60-Day Programs', section: '60-days-challenge', hint: 'Compare STI, PTI and TTI' },
      { label: `${PROGRAMS.STI.name} (STI)`, section: PROGRAM_ANCHORS.STI, hint: 'Program 01' },
      { label: `${PROGRAMS.PTI.name} (PTI)`, section: PROGRAM_ANCHORS.PTI, hint: 'Program 02' },
      { label: `${PROGRAMS.TTI.name} (TTI)`, section: PROGRAM_ANCHORS.TTI, hint: 'Program 03' },
    ],
  },
  {
    id: '16pf',
    label: '16PF Test',
    children: [
      { label: 'Take the test', view: 'test', hint: 'Free · about 20–25 minutes' },
      { label: 'How it works', view: 'how-it-works' },
      { label: 'The 16 factors', view: 'factors' },
      { label: 'Benefits', view: 'benefits' },
      { label: 'FAQ', view: 'faq' },
    ],
  },
  { id: 'research', label: 'Research', view: 'research', ready: false },
  { id: 'consultancy', label: 'Consultancy', view: 'consultancy', ready: false },
  {
    id: 'workshops',
    label: 'Workshops',
    ready: false,
    children: [
      { label: 'Solution Tech Workshop', view: 'workshop-solution-tech' },
      { label: 'Science & Research Workshop', view: 'workshop-science-research' },
    ],
  },
  { id: 'team', label: 'Our Team', view: 'team', ready: false },
  { id: 'contact', label: 'Contact', view: 'contact' },
];

const VISIBLE_ITEMS = NAV_ITEMS.filter((item) => item.ready !== false);

const isItemActive = (item: NavItem, currentView: string): boolean =>
  item.children ? item.children.some((c) => c.view === currentView) : item.view === currentView;

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const { user: currentUser, logout } = useAuth();
  // In-progress assessment for this visitor (account or guest browser), from the API.
  const { active: activeDraft, progress: draftProgress } = useActiveSession();
  const goToSection = useSectionNavigate();

  // Desktop dropdown that is open (by id), and the expanded groups in the mobile drawer.
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileGroups, setMobileGroups] = useState<string[]>([]);
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  // Close everything after a page change, and close a dropdown on an outside click.
  useEffect(() => {
    setOpenMenu(null);
    setMobileMenuOpen(false);
  }, [currentView]);
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openMenu]);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const go = (link: NavLink) => {
    if (link.section) goToSection(link.section);
    else if (link.view) onNavigate(link.view);
    setOpenMenu(null);
    setMobileMenuOpen(false);
  };

  const handleNavClick = (view: string) => go({ label: view, view });

  // Hover opens a dropdown at once and closes it after a short grace period,
  // so moving the pointer from the tab into the panel does not close it.
  const hoverOpen = (id: string) => {
    window.clearTimeout(closeTimer.current);
    setOpenMenu(id);
  };
  const hoverClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 150);
  };

  // Keyboard: Down opens the menu on its first link, Up/Down move, Esc closes and returns focus.
  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, id: string) => {
    const root = e.currentTarget;
    const links = Array.from(root.querySelectorAll<HTMLElement>('[data-menu-link]'));
    const index = links.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      setOpenMenu(null);
      root.querySelector<HTMLElement>('[data-menu-trigger]')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (openMenu !== id) setOpenMenu(id);
      window.requestAnimationFrame(() => {
        const fresh = Array.from(root.querySelectorAll<HTMLElement>('[data-menu-link]'));
        fresh[index < 0 ? 0 : Math.min(index + 1, fresh.length - 1)]?.focus();
      });
    } else if (e.key === 'ArrowUp' && index >= 0) {
      e.preventDefault();
      if (index === 0) root.querySelector<HTMLElement>('[data-menu-trigger]')?.focus();
      else links[index - 1]?.focus();
    }
  };

  const toggleMobileGroup = (id: string) =>
    setMobileGroups((open) => (open.includes(id) ? open.filter((g) => g !== id) : [...open, id]));

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    onNavigate('landing');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 gap-4 lg:gap-6">
            {/* Zone 1: Brand Wordmark */}
            <div className="flex items-center shrink-0">
              <button
                onClick={() => go({ label: 'Home', view: 'landing' })}
                aria-label={`${BRAND.name} home`}
                className="flex items-center text-left rounded-lg focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/20 cursor-pointer"
              >
                <BrandLogo className="h-6 sm:h-7" />
              </button>
            </div>

            {/* Zone 2: Navigation Links (Evenly & judiciously spaced) */}
            <nav
              ref={navRef}
              aria-label="Main"
              className="hidden lg:flex items-center justify-center flex-1 gap-1 xl:gap-3 2xl:gap-5 text-xs xl:text-[13px] font-medium text-slate-600 min-w-0"
            >
              {VISIBLE_ITEMS.map((item) => {
                const active = isItemActive(item, currentView);
                const tabClass = `transition-colors py-1 px-1.5 xl:px-2.5 cursor-pointer flex items-center gap-1 whitespace-nowrap rounded-lg focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/20 ${
                  item.highlight
                    ? 'text-amber-800 font-bold bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-200 shadow-2xs'
                    : active
                    ? 'text-teal-700 font-semibold border-b-2 border-teal-600 rounded-b-none'
                    : 'hover:text-teal-700 hover:bg-slate-50'
                }`;

                if (!item.children) {
                  return (
                    <button key={item.id} onClick={() => go(item)} aria-current={active ? 'page' : undefined} className={tabClass}>
                      <span>{item.label}</span>
                    </button>
                  );
                }

                const open = openMenu === item.id;
                const panelId = `nav-menu-${item.id}`;
                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => hoverOpen(item.id)}
                    onMouseLeave={hoverClose}
                    onKeyDown={(e) => onMenuKeyDown(e, item.id)}
                  >
                    <button
                      data-menu-trigger
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenMenu(open ? null : item.id)}
                      className={tabClass}
                    >
                      {item.highlight && <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />}
                      <span>{item.label}</span>
                      <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </button>

                    {open && (
                      // pt-2 bridges the gap under the tab so hovering into the panel keeps it open.
                      <div id={panelId} className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50">
                        <ul className="w-max min-w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 animate-in fade-in-50 duration-150">
                          {item.children.map((child) => {
                            const current = !!child.view && child.view === currentView;
                            return (
                              <li key={child.label}>
                                <button
                                  data-menu-link
                                  onClick={() => go(child)}
                                  aria-current={current ? 'page' : undefined}
                                  className={`w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer focus:outline-hidden focus-visible:bg-teal-50 ${
                                    current ? 'bg-teal-50' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <span className={`block whitespace-nowrap text-[13px] font-semibold ${current ? 'text-teal-700' : 'text-slate-800'}`}>{child.label}</span>
                                  {child.hint && <span className="block text-[11px] text-slate-500 mt-0.5">{child.hint}</span>}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Zone 3: Auth & Primary CTA (Desktop >= 1024px) */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {/* Sleek Admin Console shortcut for admin users */}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-colors border flex items-center gap-1 shadow-2xs cursor-pointer ${
                    currentView === 'admin'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                  title="Open Admin Console"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden xl:inline">Admin</span>
                </button>
              )}

              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[70px] xl:max-w-[95px] truncate">{currentUser.name}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in-50 duration-150">
                      <div className="px-3.5 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 uppercase">
                          {currentUser.role}
                        </span>
                      </div>

                      {activeDraft && activeDraft.answeredCount > 0 && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('test');
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-medium text-teal-700 bg-teal-50/70 hover:bg-teal-100/70 flex items-center justify-between transition-colors cursor-pointer border-b border-slate-100"
                        >
                          <div className="flex items-center gap-2">
                            <PlayCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>Continue Test</span>
                          </div>
                          <span className="text-[10px] font-bold bg-teal-600 text-white px-1.5 py-0.5 rounded-full">
                            {draftProgress}%
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onNavigate('account');
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer border-b border-slate-100"
                      >
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>My Account</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onNavigate('my-results');
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer border-b border-slate-100"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>My Results</span>
                      </button>

                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('admin');
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-medium text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors cursor-pointer border-b border-slate-100"
                        >
                          <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Admin Console</span>
                        </button>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-300 shadow-2xs transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              )}

              {/* Assessment CTA: Compact & beautifully styled without screen overflow */}
              <button
                onClick={() => onNavigate('test')}
                className={`px-3 xl:px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeDraft && activeDraft.answeredCount > 0
                    ? 'text-slate-950 bg-teal-400 hover:bg-teal-300 ring-2 ring-teal-500/50 shadow-teal-500/20'
                    : 'text-slate-950 bg-teal-500 hover:bg-teal-400 active:bg-teal-600'
                }`}
              >
                {activeDraft && activeDraft.answeredCount > 0 ? (
                  <>
                    <PlayCircle className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                    <span>Continue ({draftProgress}%)</span>
                  </>
                ) : (
                  <>
                    <span>Take Test</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </>
                )}
              </button>
            </div>

            {/* Mobile Controls */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => onNavigate('test')}
                className="px-3 py-1 text-xs font-semibold text-slate-950 bg-teal-500 rounded-lg whitespace-nowrap"
              >
                {activeDraft && activeDraft.answeredCount > 0 ? `Resume (${draftProgress}%)` : 'Take Test'}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <nav aria-label="Main" className="pb-3 border-b border-slate-100 space-y-1">
              {VISIBLE_ITEMS.map((item) => {
                const active = isItemActive(item, currentView);
                const rowClass = `w-full text-left px-3 py-2.5 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
                  item.highlight
                    ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                    : active
                    ? 'bg-teal-50 text-teal-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`;

                if (!item.children) {
                  return (
                    <button key={item.id} onClick={() => go(item)} aria-current={active ? 'page' : undefined} className={rowClass}>
                      {item.label}
                    </button>
                  );
                }

                const expanded = mobileGroups.includes(item.id);
                const groupId = `mobile-nav-${item.id}`;
                return (
                  <div key={item.id}>
                    <button onClick={() => toggleMobileGroup(item.id)} aria-expanded={expanded} aria-controls={groupId} className={rowClass}>
                      {item.highlight && <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      <span className="flex-1">{item.label}</span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded && (
                      <ul id={groupId} className="mt-1 mb-2 ml-3 pl-3 border-l-2 border-slate-100 space-y-0.5">
                        {item.children.map((child) => {
                          const current = !!child.view && child.view === currentView;
                          return (
                            <li key={child.label}>
                              <button
                                onClick={() => go(child)}
                                aria-current={current ? 'page' : undefined}
                                className={`w-full text-left px-3 py-2 text-[13px] rounded-lg transition-colors ${
                                  current ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {child.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </nav>

            {activeDraft && activeDraft.answeredCount > 0 && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('test');
                }}
                className="w-full py-2.5 px-3 text-xs font-bold text-center text-teal-950 bg-teal-400 hover:bg-teal-300 rounded-xl flex items-center justify-center gap-2 shadow-xs"
              >
                <PlayCircle className="w-4 h-4 shrink-0" />
                <span>Continue Assessment ({draftProgress}% Done)</span>
              </button>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              {currentUser?.role === 'admin' ? (
                <button
                  onClick={() => handleNavClick('admin')}
                  className="flex-1 py-2 text-xs font-medium text-center text-indigo-700 bg-indigo-50 rounded-lg border border-indigo-200 flex items-center justify-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Admin Console</span>
                </button>
              ) : null}

              {!currentUser ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('login');
                  }}
                  className="flex-1 py-2 text-xs font-bold text-center text-teal-800 bg-teal-50 rounded-lg border border-teal-300 shadow-2xs"
                >
                  Sign In
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('my-results');
                    }}
                    className="flex-1 py-2 text-xs font-medium text-center text-slate-700 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    My Results
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate('account');
                    }}
                    className="flex-1 py-2 text-xs font-medium text-center text-slate-700 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    My Account
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 py-2 text-xs font-medium text-center text-rose-600 bg-rose-50 rounded-lg"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};
