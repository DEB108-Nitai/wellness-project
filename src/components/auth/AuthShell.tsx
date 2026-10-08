import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, LineChart, ShieldCheck, Sparkles } from 'lucide-react';
import { BRAND } from '../../lib/brand';
import { BrandLogo } from '../common/BrandLogo';

/**
 * Full-page onboarding layout for sign-in / sign-up / password flows:
 * brand panel on the left (desktop), focused form on the right.
 */
export const AuthShell: React.FC<{ title: string; subtitle?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-white">
    {/* Brand panel */}
    <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-teal-700 via-teal-800 to-indigo-900 text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }}
      />
      <div aria-hidden="true" className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-amber-400/20 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-teal-300/20 blur-3xl" />

      <Link to="/" aria-label={`${BRAND.name} home`} className="relative w-fit">
        <BrandLogo onDark className="h-8" />
      </Link>

      <div className="relative space-y-8 max-w-md">
        <div className="space-y-3">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-200">
            <Sparkles className="w-4 h-4" /> 16 Personality Factors · 60-Day Transformation
          </p>
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight font-heading">
            Understand yourself.
            <br />
            <span className="text-amber-300">Transform your life.</span>
          </h2>
        </div>
        <ul className="space-y-4 text-teal-50">
          {[
            { icon: BarChart3, text: 'A private, science-based report on all 16 of your personality factors' },
            { icon: LineChart, text: 'Pick up where you left off — your progress follows you on every device' },
            { icon: ShieldCheck, text: 'Your answers stay confidential and are never sold' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="mt-0.5 w-8 h-8 shrink-0 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-[15px] leading-relaxed">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-teal-100/70">
        Scored against norms from 35,000+ people using the public-domain IPIP 16-factor scales.
      </p>
    </aside>

    {/* Form panel */}
    <main className="flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-5 sm:px-10 pt-6">
        <Link to="/" aria-label={`${BRAND.name} home`} className="lg:hidden">
          <BrandLogo className="h-6" />
        </Link>
        <Link
          to="/"
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 sm:px-10 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">{title}</h1>
            {subtitle && <p className="text-[15px] text-slate-500 leading-relaxed">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </main>
  </div>
);
