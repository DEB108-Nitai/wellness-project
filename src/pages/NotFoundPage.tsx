import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => (
  <div className="max-w-lg mx-auto px-4 py-28 text-center space-y-4">
    <p className="text-6xl font-bold text-teal-600 font-heading">404</p>
    <h1 className="text-2xl font-bold text-slate-900 font-heading">We couldn't find that page</h1>
    <p className="text-slate-600">The link may be broken, or the page may have moved.</p>
    <Link to="/" className="inline-flex h-11 items-center px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold">
      Go to the home page
    </Link>
  </div>
);
