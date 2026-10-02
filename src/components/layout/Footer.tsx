import React, { useState } from 'react';
import { Mail, CheckCircle2, Shield, Heart, ExternalLink } from 'lucide-react';

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
          {/* Col 1: Brand & Scientific Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold text-base">
                W
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Wellness</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              An open, standardized 16 Personality Factors assessment platform built on the scientific International Personality Item Pool (IPIP) model. Providing deep behavioral self-understanding and research-grade psychometrics.
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
                <button onClick={() => onNavigate('landing')} className="hover:text-white transition-colors">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('factors')} className="hover:text-white transition-colors">
                  The 16 Factors
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how-it-works')} className="hover:text-white transition-colors">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('benefits')} className="hover:text-white transition-colors">
                  Key Benefits
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('test')} className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
                  Take the Assessment
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Research & Admin */}
          <div>
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider mb-4">
              Platform & Legal
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('researcher')} className="hover:text-white transition-colors">
                  Researcher Portal
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin')} className="hover:text-white transition-colors">
                  Admin Console
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy-terms')} className="hover:text-white transition-colors">
                  Privacy Policy & GDPR
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy-terms')} className="hover:text-white transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('delete-data')} className="text-rose-400 hover:text-rose-300 transition-colors">
                  Delete My Data
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Newsletter & Updates */}
          <div>
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider mb-4">
              Psychometrics Digest
            </h3>
            <p className="text-xs text-slate-400 mb-3 leading-normal">
              Receive quarterly research insights on organizational psychology and personality dynamics.
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
              Disclaimer: For self-understanding, research, and team development. Not a medical or clinical psychological diagnosis.
            </p>
          </div>
          <div>
            <p>© {new Date().getFullYear()} Wellness 16 Personality Factors. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
