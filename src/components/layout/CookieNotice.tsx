import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

export const CookieNotice: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('wellness_cookies_accepted');
    if (!accepted) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('wellness_cookies_accepted', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-4.5 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-teal-50 text-teal-700 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 flex-1">
          <h4 className="text-sm font-semibold text-slate-900">Essential Cookies Only</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            We use strictly essential local storage to save your test progress and ensure a seamless session. No third-party ad tracking.
          </p>
          <div className="pt-1 flex items-center gap-2">
            <button
              onClick={handleAccept}
              className="px-3.5 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
