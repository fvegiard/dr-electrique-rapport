import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { StatCard } from '../components/dashboard/StatCard';
import { HoursChart } from '../components/dashboard/HoursChart';
import { ReportsList } from '../components/dashboard/ReportsList';

const ClockIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" />
  </svg>
);

const CameraIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const Dashboard: React.FC = () => {
  const { stats, rapports, photos, employeeHours, projects, loading, error, refresh } = useDashboardData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-6 text-center max-w-sm">
          <p className="text-red-400 mb-4">{error}</p>
          <button type="button" onClick={refresh} className="px-6 py-2 bg-[#E63946] rounded-xl text-white text-sm">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="glass sticky top-0 z-40 px-4 py-3 safe-area-top">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bebas text-2xl text-white tracking-wide">TABLEAU DE BORD</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">DR Électrique</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors"
              aria-label="Rafraîchir"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6" /><path d="M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
            </button>
            <Link
              to="/"
              className="px-3 py-1.5 rounded-lg bg-[#E63946]/10 text-[#E63946] text-xs font-medium border border-[#E63946]/20 hover:bg-[#E63946]/20 transition-colors"
            >
              + Rapport
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Rapports" value={stats.totalRapports} icon={<FileIcon />} accent="#E63946" />
          <StatCard label="Heures (sem.)" value={`${stats.totalHeuresWeek.toFixed(1)}h`} icon={<ClockIcon />} accent="#3b82f6" />
          <StatCard label="Photos" value={stats.totalPhotos} icon={<CameraIcon />} accent="#22c55e" />
          <StatCard label="Extras" value={`${stats.totalExtras.toFixed(0)} $`} icon={<DollarIcon />} accent="#f59e0b" />
        </div>

        <HoursChart data={employeeHours} />

        {projects.length > 0 && (
          <div className="glass rounded-2xl p-4 animate-slide-up">
            <h3 className="font-bebas text-lg text-white tracking-wide mb-3">PROJETS ACTIFS</h3>
            <div className="space-y-2">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-gray-300">{p.name}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-500">{p.reportCount} rapports</span>
                    <span className="text-blue-400 font-medium">{p.totalHours}h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ReportsList rapports={rapports} photos={photos} />
      </main>
    </div>
  );
};
