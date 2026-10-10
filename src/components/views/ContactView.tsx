import React, { useRef, useState } from 'react';
import { Mail, Send, CheckCircle2, MessageSquare, Shield, Clock } from 'lucide-react';
import { ApiError } from '../../api/client';
import { siteApi } from '../../api/site';
import { useSettings } from '../../context/SettingsContext';

export const ContactView: React.FC = () => {
  const { settings } = useSettings();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState(''); // honeypot
  const startedAt = useRef(Date.now());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSending(true);
    setError(null);
    try {
      await siteApi.contact({
        name: name.trim(),
        email: email.trim(),
        ...(subject.trim() ? { subject: subject.trim() } : {}),
        message: message.trim(),
        website,
        formStartedAt: startedAt.current,
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? Object.values(err.fields)[0] ?? err.message
          : 'Could not send your message. Please try again.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12 pb-24">
      <div className="text-center space-y-3">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-3 py-1 rounded-full">
          Contact
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">
          We’d love to hear from you.
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Questions about our research, a consultancy project, the 16PF assessment or the 60-day programs? Write to us.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Info Column */}
        <div className="md:col-span-5 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-6">
          <h3 className="text-xl font-bold font-heading">Reach us</h3>

          <div className="space-y-4 text-xs text-slate-300 pt-2 border-t border-slate-800">
            {settings.support_email && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-teal-400 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Email</span>
                  <a href={`mailto:${settings.support_email}`} className="hover:text-white underline-offset-4 hover:underline">
                    {settings.support_email}
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-teal-400 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">Response Time</span>
                <span>Within 24–48 business hours</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-teal-400 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">Confidentiality</span>
                <span>All institutional inquiries are strictly private</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Column */}
        <div className="md:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="maya@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Consultancy project enquiry"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="How can we help?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
                <label>
                  Website
                  <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </label>
              </div>

              {error && (
                <p role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{sending ? 'Sending…' : 'Send Message'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <div className="py-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Message Received
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Thank you, {name}. Your message has reached our team and we’ll reply soon.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
              >
                Send Another Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
