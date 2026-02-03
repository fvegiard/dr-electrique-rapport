import React from 'react';
import type { ProjectCard } from '../../hooks/useDashboardData';

interface ProjectCardsProps {
  projects: ProjectCard[];
}

const formatDate = (d: string): string => {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
};

export const ProjectCards: React.FC<ProjectCardsProps> = ({ projects }) => {
  if (projects.length === 0) return null;

  return (
    <div className="animate-slide-up">
      <h3 className="font-bebas text-lg text-white tracking-wide mb-3">PROJETS EN COURS</h3>
      <div className="space-y-2">
        {projects.map((p) => (
          <div
            key={p.id}
            className={`glass rounded-xl p-3 border-l-4 transition-colors ${
              p.hasReportToday ? 'border-green-500' : 'border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white font-medium truncate mr-2">{p.name}</span>
              {p.hasReportToday && (
                <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  actif
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-sm font-medium text-white">{p.rapportsThisMonth}</div>
                <div className="text-[9px] text-gray-500 uppercase">Rapports</div>
              </div>
              <div>
                <div className="text-sm font-medium text-blue-400">{p.hoursThisMonth}h</div>
                <div className="text-[9px] text-gray-500 uppercase">Heures</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-300">{p.uniqueWorkers}</div>
                <div className="text-[9px] text-gray-500 uppercase">Équipe</div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-400">{formatDate(p.latestDate)}</div>
                <div className="text-[9px] text-gray-500 uppercase">Dernier</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
