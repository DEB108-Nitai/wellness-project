import React, { useState } from 'react';
import { Menu, X, ArrowRight, ShieldCheck, UserCheck, BookOpen, BarChart3, HelpCircle, Sparkles, User, LogOut, ChevronDown, PlayCircle, Shield } from 'lucide-react';
import { useActiveSession } from '../../context/ActiveSessionContext';
import { useAuth } from '../../context/AuthContext';

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

  const navItems = [
    { id: 'landing', label: 'Home' },
    { id: 'challenge', label: '60 Days Challenge', isHighlight: true },
    { id: 'factors', label: 'The 16 Factors' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'faq', label: 'FAQ' },
    { id: 'contact', label: 'Contact' },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'challenge') {
      if (currentView !== 'landing') {
        onNavigate('landing');
        setTimeout(() => {
          const el = document.getElementById('60-days-challenge');
          el?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const el = document.getElementById('60-days-challenge');
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      onNavigate(id);
    }
    setMobileMenuOpen(false);
  };

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
                onClick={() => handleNavClick('landing')}
                className="flex items-center gap-2.5 text-left group focus:outline-hidden cursor-pointer"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-teal-600 via-indigo-600 to-amber-600 flex items-center justify-center text-white shadow-md shadow-teal-700/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
                  <span className="font-bold text-base sm:text-lg font-heading">W</span>
                </div>
                <div>
                  <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 group-hover:text-teal-700 transition-colors">
                    Wellness
                  </span>
                </div>
              </button>
            </div>

            {/* Zone 2: Navigation Links (Evenly & judiciously spaced) */}
            <nav className="hidden lg:flex items-center justify-center flex-1 gap-1 xl:gap-3 2xl:gap-5 text-xs xl:text-[13px] font-medium text-slate-600 min-w-0">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`transition-colors py-1 px-1.5 xl:px-2.5 cursor-pointer flex items-center gap-1 whitespace-nowrap rounded-lg ${
                    item.isHighlight
                      ? 'text-amber-800 font-bold bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-200 shadow-2xs'
                      : currentView === item.id
                      ? 'text-teal-700 font-semibold border-b-2 border-teal-600'
                      : 'hover:text-teal-700 hover:bg-slate-50'
                  }`}
                >
                  {item.isHighlight && <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />}
                  <span>{item.label}</span>
                </button>
              ))}
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
            <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    item.isHighlight
                      ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                      : currentView === item.id
                      ? 'bg-teal-50 text-teal-700 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.isHighlight && <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

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
