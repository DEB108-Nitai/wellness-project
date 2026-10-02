import React, { useState } from 'react';
import { Menu, X, ArrowRight, ShieldCheck, UserCheck, BookOpen, BarChart3, HelpCircle } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  activeCampaignSlug?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, activeCampaignSlug }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'landing', label: 'Home' },
    { id: 'factors', label: 'The 16 Factors' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'faq', label: 'FAQ' },
    { id: 'contact', label: 'Contact' },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNavClick('landing')}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-teal-700/20 group-hover:scale-105 transition-transform duration-200">
                <span className="font-bold text-lg font-heading">W</span>
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-teal-700 transition-colors">
                  Wellness
                </span>
                <span className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider -mt-1">
                  16 Personality Factors
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`transition-colors hover:text-teal-700 py-1 cursor-pointer ${
                  currentView === item.id ? 'text-teal-700 font-semibold border-b-2 border-teal-600' : ''
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Portal Switches & Primary CTA */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => handleNavClick('researcher')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                currentView === 'researcher'
                  ? 'bg-slate-100 text-slate-900 border-slate-300'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Researcher
            </button>

            <button
              onClick={() => handleNavClick('admin')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                currentView === 'admin'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              Admin
            </button>

            <button
              onClick={() => handleNavClick('test')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-sm hover:shadow-md hover:shadow-teal-700/20 transition-all flex items-center gap-2 group cursor-pointer"
            >
              <span>Take the Test</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => handleNavClick('test')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-lg"
            >
              Take Test
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentView === item.id ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              onClick={() => handleNavClick('researcher')}
              className="flex-1 py-2 text-xs font-medium text-center text-slate-700 bg-slate-100 rounded-lg"
            >
              Researcher Portal
            </button>
            <button
              onClick={() => handleNavClick('admin')}
              className="flex-1 py-2 text-xs font-medium text-center text-indigo-700 bg-indigo-50 rounded-lg"
            >
              Admin Console
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
