import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { StatCard } from '../components/dashboard/StatCard';
import { HoursChart } from '../components/dashboard/HoursChart';
import { ReportsList } from '../components/dashboard/ReportsList';
import { TodaySnapshot } from '../components/dashboard/TodaySnapshot';
import { AlertsPanel } from '../components/dashboard/AlertsPanel';
import { ProjectCards } from '../components/dashboard/ProjectCards';

const ClockIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Heures</title>
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Rapports</title>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Extras</title>
    <path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <title>Sécurité</title>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const todayFormatted = (): string => {
  return new Date().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const Dashboard: React.FC = () => {
  const {
    todayStats, weeklyKPIs, alerts, projectCards, employeeHours,
    filteredRapports, photos, weekLabel, filter, setFilter,
    loading, error, refresh,
  } = useDashboardData();

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

  const securiteDisplay = weeklyKPIs.securite.value === 0 ? '✓ RAS' : String(weeklyKPIs.securite.value);
  const securiteAccent = weeklyKPIs.securite.value === 0 ? '#22c55e' : '#E63946';

  return (
    <div className="min-h-screen pb-24">
      <header className="glass sticky top-0 z-40 px-4 py-3 safe-area-top">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bebas text-2xl text-white tracking-wide">TABLEAU DE BORD</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{todayFormatted()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors"
              aria-label="Rafraîchir"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <title>Rafraîchir</title>
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
        <TodaySnapshot stats={todayStats} />

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Heures (sem.)"
            value={`${weeklyKPIs.heures.value}h`}
            icon={<ClockIcon />}
            accent="#3b82f6"
            changePercent={weeklyKPIs.heures.changePercent}
            subtitle="vs semaine dernière"
          />
          <StatCard
            label="Rapports (sem.)"
            value={weeklyKPIs.rapports.value}
            icon={<FileIcon />}
            accent="#E63946"
            changePercent={weeklyKPIs.rapports.changePercent}
            subtitle="vs semaine dernière"
          />
          <StatCard
            label="Extras (sem.)"
            value={`${weeklyKPIs.extras.value} $`}
            icon={<DollarIcon />}
            accent="#f59e0b"
            changePercent={weeklyKPIs.extras.changePercent}
            subtitle="vs semaine dernière"
          />
          <StatCard
            label="Sécurité"
            value={securiteDisplay}
            icon={<ShieldIcon />}
            accent={securiteAccent}
            subtitle={weeklyKPIs.securite.value === 0 ? 'Aucun incident' : 'Cette semaine'}
          />
        </div>

        <AlertsPanel alerts={alerts} />

        <ProjectCards projects={projectCards} />

        <HoursChart data={employeeHours} weekLabel={weekLabel} />

        <ReportsList
          rapports={filteredRapports}
          photos={photos}
          filter={filter}
          onFilterChange={setFilter}
        />
      </main>
    </div>
  );
};
