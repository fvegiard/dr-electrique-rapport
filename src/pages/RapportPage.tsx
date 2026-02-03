import React from 'react';
import { Link } from 'react-router-dom';
import RapportForm from '../components/RapportForm';

export const RapportPage: React.FC = () => (
  <div className="min-h-screen bg-[#0a0a0a]">
    <RapportForm />
    <Link
      to="/dashboard"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full glass border border-white/10 text-white text-sm font-medium shadow-lg shadow-black/40 hover:bg-white/[0.06] transition-colors active:scale-95"
    >
      <svg className="w-4 h-4 text-[#E63946]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3h7v7H3z" /><path d="M14 3h7v7h-7z" /><path d="M14 14h7v7h-7z" /><path d="M3 14h7v7H3z" />
      </svg>
      Dashboard
    </Link>
  </div>
);
