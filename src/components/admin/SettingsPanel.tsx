import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ApiError } from '../../api/client';
import { AdminSettings, adminApi } from '../../api/admin';
import { useSettings } from '../../context/SettingsContext';

const input = 'w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500';

/** Platform settings stored on the server (PRD ADM-8). */
export const SettingsPanel: React.FC = () => {
  const { refresh: refreshPublic } = useSettings();
  const [form, setForm] = useState<AdminSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi
      .settings()
      .then(setForm)
      .catch((err) => setMessage({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not load settings.' }));
  }, []);

  if (!form) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const set = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => setForm({ ...form, [key]: value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const { consent_version: _ignored, ...changes } = form;
      setForm(await adminApi.updateSettings(changes));
      void refreshPublic();
      setMessage({ tone: 'ok', text: 'Settings saved.' });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields);
      setMessage({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs text-rose-600">{errors[k]}</p> : null);
  const toggle = (key: keyof AdminSettings, label: string, hint: string) => (
    <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 cursor-pointer">
      <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => set(key, e.target.checked as never)} className="mt-0.5 w-4 h-4 accent-indigo-600" />
      <span>
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </label>
  );
  const number = (key: 'items_per_page' | 'min_age' | 'too_fast_minutes', label: string, min: number, max: number) => (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      <input type="number" min={min} max={max} value={form[key]} onChange={(e) => set(key, Number(e.target.value))} className={`mt-1 ${input} ${errors[key] ? 'border-rose-400' : 'border-slate-300'}`} />
      {err(key)}
    </label>
  );

  return (
    <form onSubmit={save} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 max-w-3xl">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 font-heading">Platform Settings</h2>
        <p className="text-xs text-slate-500">Changes take effect immediately for every visitor and are recorded in the audit log.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-xs font-semibold text-slate-700">
          Platform name
          <input value={form.site_name} maxLength={60} onChange={(e) => set('site_name', e.target.value)} className={`mt-1 ${input} ${errors.site_name ? 'border-rose-400' : 'border-slate-300'}`} />
          {err('site_name')}
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          Support email
          <input type="email" value={form.support_email} onChange={(e) => set('support_email', e.target.value)} placeholder="support@yourdomain.com" className={`mt-1 ${input} ${errors.support_email ? 'border-rose-400' : 'border-slate-300'}`} />
          {err('support_email')}
        </label>
      </div>

      <label className="block text-xs font-semibold text-slate-700">
        Company LinkedIn page
        <input type="url" value={form.linkedin_url} maxLength={255} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="https://www.linkedin.com/company/…" className={`mt-1 ${input} ${errors.linkedin_url ? 'border-rose-400' : 'border-slate-300'}`} />
        <span className="mt-1 block font-normal text-slate-500">Shown in the site footer. Leave empty to hide it.</span>
        {err('linkedin_url')}
      </label>

      <label className="block text-xs font-semibold text-slate-700">
        Announcement banner text
        <input value={form.announcement_text} maxLength={200} onChange={(e) => set('announcement_text', e.target.value)} className={`mt-1 ${input} ${errors.announcement_text ? 'border-rose-400' : 'border-slate-300'}`} />
        {err('announcement_text')}
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        {toggle('announcement_active', 'Show announcement banner', 'Displays the text above at the top of every page.')}
        {toggle('signup_open', 'Allow new sign-ups', 'When off, nobody can create a new account.')}
        {toggle('challenge_registration_open', 'Open 60-Day registrations', 'When off, the registration form shows "closed".')}
        {toggle('maintenance_mode', 'Maintenance mode', 'Public site shows a maintenance page; admins keep access.')}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {number('items_per_page', 'Statements per page (5–10)', 5, 10)}
        {number('min_age', 'Minimum age (18+)', 18, 99)}
        {number('too_fast_minutes', '"Too fast" threshold (minutes)', 1, 60)}
      </div>

      <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-sm rounded-xl disabled:opacity-60 cursor-pointer">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {message && <span className={`text-sm ${message.tone === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>{message.text}</span>}
      </div>
    </form>
  );
};
