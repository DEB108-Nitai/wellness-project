import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AnnouncementBarProps {
  text: string;
}

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ text }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !text) return null;

  return (
    <div className="bg-[#1E2430] text-slate-100 text-xs sm:text-sm py-2 px-4 relative flex items-center justify-between border-b border-slate-800 z-50">
      <div className="flex items-center justify-center gap-2 mx-auto text-center px-4 font-medium">
        <span className="text-slate-200">{text}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
