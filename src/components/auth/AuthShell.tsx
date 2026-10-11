import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { BRAND } from '../../lib/brand';
import { BrandLogo } from '../common/BrandLogo';

/**
 * Full-page layout for sign-in / sign-up / password / verification pages.
 * The brand side uses the home page's dark hero style (CompanyHero); the form side stays light.
 * Desktop: brand panel left, form right. Phone/tablet: a short dark band above the form.
 * Owner-approved copy (2026-10-10): kept general so it fits whatever the account is used for.
 */
const DarkBackdrop: React.FC = () => (
  <>
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]"
    />
    <div aria-hidden="true" className="absolute -top-40 -left-24 w-[32rem] h-[32rem] rounded-full bg-teal-500/20 blur-3xl" />
    <div aria-hidden="true" className="absolute -bottom-48 right-0 w-[30rem] h-[30rem] rounded-full bg-indigo-500/20 blur-3xl" />
  </>
);

const Eyebrow: React.FC = () => (
  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">Research · Health · Education</p>
);

const Welcome: React.FC<{ className: string }> = ({ className }) => (
  <p className={`font-['Poppins'] font-extrabold tracking-tight leading-[1.05] text-balance ${className}`}>
    Welcome to
    <span className="block mt-1 pb-[0.12em] bg-gradient-to-r from-teal-300 via-teal-200 to-emerald-200 bg-clip-text text-transparent">
      {BRAND.name}.
    </span>
  </p>
);

export const AuthShell: React.FC<{ title: string; subtitle?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-white">
    {/* Brand panel (desktop) */}
    <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <DarkBackdrop />

      <Link to="/" aria-label={`${BRAND.name} home`} className="relative w-fit">
        <BrandLogo onDark className="h-8" />
      </Link>

      <div className="relative max-w-md space-y-6">
        <Eyebrow />
        <Welcome className="text-5xl xl:text-6xl" />
        <p className="text-lg text-slate-300 leading-relaxed">One account for everything you do with us.</p>
      </div>

      <p className="relative inline-flex items-center gap-2 text-sm text-slate-400">
        <ShieldCheck className="w-4 h-4 text-teal-300" aria-hidden="true" />
        Private and secure. Your data is never sold.
      </p>
    </aside>

    <main className="flex flex-col min-h-screen">
      {/* Brand band (phone/tablet) */}
      <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
        <DarkBackdrop />
        <div className="relative px-5 sm:px-10 pt-5 pb-8">
          <div className="flex items-center justify-between">
            <Link to="/" aria-label={`${BRAND.name} home`}>
              <BrandLogo onDark className="h-6" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
          </div>
          <div className="mt-7 space-y-3">
            <Eyebrow />
            <Welcome className="text-3xl sm:text-4xl" />
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="hidden lg:flex px-10 pt-6">
        <Link
          to="/"
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
      </div>

      <div className="flex-1 flex lg:items-center justify-center px-5 sm:px-10 py-8 sm:py-10">
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
