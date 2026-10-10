import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ApiError } from '../../api/client';
import { ResultReport, resultsApi } from '../../api/assessment';
import { useAuth } from '../../context/AuthContext';
import { ResultsView } from '../../components/views/ResultsView';
import { ResultsGate } from '../../components/results/ResultsGate';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; report: ResultReport }
  | { kind: 'locked' }
  | { kind: 'missing'; message: string }
  | { kind: 'error'; message: string };

const Message: React.FC<{ title: string; text: string; action?: React.ReactNode }> = ({ title, text, action }) => (
  <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
    <h1 className="text-2xl font-bold text-slate-900 font-heading">{title}</h1>
    <p className="text-slate-600">{text}</p>
    {action}
  </div>
);

/** /results/:ref — the owner's (or an admin's) report; guests see the sign-up gate. */
export const ResultsPage: React.FC = () => {
  const { ref = '' } = useParams();
  const { user, loading } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setState({ kind: 'loading' });
    resultsApi
      .get(ref)
      .then((report) => !cancelled && setState({ kind: 'ready', report }))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === 'RESULTS_LOCKED') setState({ kind: 'locked' });
        else if (err instanceof ApiError && (err.status === 404 || err.code === 'NOT_COMPLETED')) setState({ kind: 'missing', message: err.message });
        else setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Could not load the report.' });
      });
    return () => {
      cancelled = true;
    };
  }, [ref, loading, user?.id]);

  switch (state.kind) {
    case 'loading':
      return (
        <div className="min-h-[60vh] flex items-center justify-center" role="status">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        </div>
      );
    case 'locked':
      return (
        <div className="max-w-3xl mx-auto px-4 py-12">
          <ResultsGate reference={ref} />
        </div>
      );
    case 'missing':
      return (
        <Message
          title="Report not found"
          text={state.message}
          action={
            <Link to="/my-results" className="inline-block text-sm font-semibold text-teal-700 hover:text-teal-800">
              Go to My Results →
            </Link>
          }
        />
      );
    case 'error':
      return <Message title="Something went wrong" text={state.message} />;
    case 'ready':
      return <ResultsView report={state.report} mode="private" />;
  }
};
