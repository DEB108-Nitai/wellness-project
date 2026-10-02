import React, { useState } from 'react';
import { Mail, CheckCircle2, Shield, Heart, Sparkles, Volume2 } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-[#181E29] text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Col 1: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 via-indigo-600 to-amber-500 flex items-center justify-center text-white font-bold text-base">
                W
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Wellness</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Standardized 16 Personality Factors assessment and holistic 60-Day Life Transformation programs. Empowering deep self-awareness, cognitive mastery, and conscious living.
            </p>
            <div className="pt-2 text-xs text-slate-500">
              <span>* Derived from the public-domain IPIP 16-factor construct (ipip.ori.org).</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider mb-4">
              Explore
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('landing')} className="hover:text-white transition-colors cursor-pointer">
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigate('landing');
                    setTimeout(() => {
                      document.getElementById('60-days-challenge')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>60 Days Challenges</span>
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('factors')} className="hover:text-white transition-colors cursor-pointer">
                  The 16 Factors
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how-it-works')} className="hover:text-white transition-colors cursor-pointer">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('benefits')} className="hover:text-white transition-colors cursor-pointer">
                  Key Benefits
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('test')} className="text-teal-400 hover:text-teal-300 font-medium transition-colors cursor-pointer">
                  Take Free Assessment
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Admin */}
          <div>
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider mb-4">
              Platform & Legal
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('admin')} className="hover:text-white transition-colors cursor-pointer">
                  Admin Console
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy-terms')} className="hover:text-white transition-colors cursor-pointer">
                  Privacy Policy & Data
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy-terms')} className="hover:text-white transition-colors cursor-pointer">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-white transition-colors cursor-pointer">
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors cursor-pointer">
                  Contact Support
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter & Updates */}
          <div>
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider mb-4">
              Transformation Digest
            </h3>
            <p className="text-xs text-slate-400 mb-3 leading-normal">
              Receive updates on upcoming 60-day challenge cohorts, psychometrics, and mental wellness.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-teal-400 text-xs py-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Thank you for subscribing!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors cursor-pointer"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Legal Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-500 shrink-0" />
            <p>
              Disclaimer: For self-understanding, behavioral development, and personal wellness transformation.
            </p>
          </div>
          <div className="text-slate-500">
            © {new Date().getFullYear()} Wellness Platform. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
