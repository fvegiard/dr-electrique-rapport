import React from 'react';
import type { TodayStats } from '../../hooks/useDashboardData';

interface TodaySnapshotProps {
  stats: TodayStats;
}

export const TodaySnapshot: React.FC<TodaySnapshotProps> = ({ stats }) => (
  <div className="glass rounded-2xl p-4 animate-slide-up border border-white/5">
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-bebas text-lg text-white tracking-wide">AUJOURD'HUI</h2>
      {stats.alertesSecurite > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[11px] font-medium border border-red-500/30">
          {stats.alertesSecurite} alerte{stats.alertesSecurite > 1 ? 's' : ''}
        </span>
      )}
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div className="text-center">
        <div className="font-bebas text-3xl text-[#E63946]">{stats.chantiersActifs}</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Chantiers</div>
      </div>
      <div className="text-center">
        <div className="font-bebas text-3xl text-blue-400">{stats.travailleursDeployes}</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Travailleurs</div>
      </div>
      <div className="text-center">
        <div className={`font-bebas text-3xl ${stats.rapportsSoumis > 0 ? 'text-green-400' : 'text-gray-600'}`}>
          {stats.rapportsSoumis}
        </div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Rapports</div>
      </div>
    </div>
  </div>
);
