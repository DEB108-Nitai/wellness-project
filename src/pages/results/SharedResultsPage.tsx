import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, Share2 } from 'lucide-react';
import { ApiError } from '../../api/client';
import { ResultReport, resultsApi } from '../../api/assessment';
import { ResultsView } from '../../components/views/ResultsView';

/** /r/:token — a read-only report someone chose to share (RES-4). */
export const SharedResultsPage: React.FC = () => {
  const { token = '' } = useParams();
  const [report, setReport] = useState<ResultReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resultsApi
      .shared(token)
      .then(setReport)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this report.'));
  }, [token]);

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Report unavailable</h1>
        <p className="text-slate-600">{error}</p>
        <Link to="/test" className="inline-block text-sm font-semibold text-teal-700 hover:text-teal-800">
          Discover your own 16 factors →
        </Link>
      </div>
    );
  }
  if (!report) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-teal-50 border-b border-teal-100 no-print">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-teal-900">
          <span className="flex items-center gap-2">
            <Share2 className="w-4 h-4" /> This report was shared with you.
          </span>
          <Link to="/test" className="font-semibold underline">
            Take the free assessment yourself
          </Link>
        </div>
      </div>
      <ResultsView report={report} mode="shared" />
    </>
  );
};
