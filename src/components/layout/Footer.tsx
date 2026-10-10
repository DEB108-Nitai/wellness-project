import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { siteApi } from '../../api/site';
import { contentApi, Venture } from '../../api/content';
import { CheckCircle2, Linkedin, Mail, Shield } from 'lucide-react';
import { BRAND } from '../../lib/brand';
import { useSettings } from '../../context/SettingsContext';
import { BrandLogo } from '../common/BrandLogo';

/**
 * Company footer (slice S9, owner-approved 2026-10-10): brand blurb with support email and LinkedIn,
 * Company / Programs & 16PF link columns, Our Ventures (plain text: their old domains no longer resolve),
 * newsletter. Links are real <a href> links so search engines can follow them.
 */
interface FooterProps {
  onNavigate?: (view: string) => void;
}

const COMPANY_LINKS = [
  { label: 'Research', to: '/research' },
  { label: 'Consultancy', to: '/consultancy' },
  { label: 'Our Team', to: '/team' },
  { label: 'Contact', to: '/contact' },
];

const PROGRAM_LINKS = [
  { label: '60-Day Programs', to: '/#60-days-challenge' },
  { label: 'Take the 16PF test', to: '/test' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'The 16 factors', to: '/factors' },
  { label: 'FAQ', to: '/faq' },
];

// Shown if the ventures API is unavailable, so the column never disappears.
const FALLBACK_VENTURES = ['Evolve Institute', 'Institute of Life Semantics (ILS)', 'India Tribal Care'];

const linkClass = 'hover:text-white transition-colors focus:outline-hidden focus-visible:text-white focus-visible:underline underline-offset-4';

const Column: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider mb-4">{title}</h3>
    {children}
  </div>
);

export const Footer: React.FC<FooterProps> = () => {
  const { settings } = useSettings();
  const [ventures, setVentures] = useState<string[]>(FALLBACK_VENTURES);

  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot
  const startedAt = useRef(Date.now());

  useEffect(() => {
    contentApi
      .ventures()
      .then((list: Venture[]) => {
        if (list.length) setVentures(list.map((v) => (v.shortName ? `${v.name} (${v.shortName})` : v.name)));
      })
      .catch(() => {});
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeError(null);
    setSubscribing(true);
    try {
      await siteApi.subscribe(email.trim(), { website, formStartedAt: startedAt.current });
      setSubscribed(true);
      setEmail('');
    } catch (err) {
      setSubscribeError(err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : 'Could not subscribe. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="bg-[#181E29] text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-800">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-4">
            <BrandLogo onDark className="h-7" />
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              {BRAND.legalName} designs products and builds technology for social welfare: research, consultancy, the 16PF
              personality assessment and free 60-day programs.
            </p>
            <ul className="space-y-2 text-sm">
              {settings.support_email && (
                <li>
                  <a href={`mailto:${settings.support_email}`} className={`inline-flex items-center gap-2 ${linkClass}`}>
                    <Mail className="w-4 h-4 text-teal-400" aria-hidden="true" />
                    {settings.support_email}
                  </a>
                </li>
              )}
              {settings.linkedin_url && (
                <li>
                  <a href={settings.linkedin_url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 ${linkClass}`}>
                    <Linkedin className="w-4 h-4 text-teal-400" aria-hidden="true" />
                    LinkedIn
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              )}
            </ul>
            <p className="pt-1 text-xs text-slate-500">* The 16PF test is derived from the public-domain IPIP 16-factor construct (ipip.ori.org).</p>
          </div>

          <div className="lg:col-span-2">
            <Column title="Company">
              <ul className="space-y-2.5 text-sm">
                {COMPANY_LINKS.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className={linkClass}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Column>
          </div>

          <div className="lg:col-span-2">
            <Column title="Programs & 16PF">
              <ul className="space-y-2.5 text-sm">
                {PROGRAM_LINKS.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className={linkClass}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Column>
          </div>

          <div className="lg:col-span-2">
            <Column title="Our Ventures">
              <ul className="space-y-2.5 text-sm text-slate-400" aria-label="Our ventures">
                {ventures.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </Column>
          </div>

          {/* Newsletter */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Column title="Transformation Digest">
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
                  <label className="sr-only" htmlFor="footer-newsletter-email">
                    Email address
                  </label>
                  <input
                    id="footer-newsletter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-teal-500"
                  />
                  <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
                    <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                  {subscribeError && <p className="text-[11px] text-rose-300">{subscribeError}</p>}
                  <button
                    type="submit"
                    disabled={subscribing}
                    className="w-full py-2 px-3 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
                  >
                    {subscribing ? 'Subscribing…' : 'Subscribe'}
                  </button>
                </form>
              )}
            </Column>
          </div>
        </div>

        {/* Legal row */}
        <div className="pt-8 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 text-center lg:text-left">
            <Shield className="w-4 h-4 text-teal-500 shrink-0" aria-hidden="true" />
            <p>Disclaimer: For self-understanding, behavioral development, and personal wellness transformation.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link to="/privacy" className={linkClass}>
              Privacy
            </Link>
            <Link to="/terms" className={linkClass}>
              Terms
            </Link>
            <span>
              © {new Date().getFullYear()} {BRAND.legalName}. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
