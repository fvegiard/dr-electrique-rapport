import React from 'react';
import type { Alert } from '../../hooks/useDashboardData';

interface AlertsPanelProps {
  alerts: Alert[];
}

const formatDate = (d: string): string => {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
};

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  if (alerts.length === 0) return null;

  const safetyAlerts = alerts.filter(a => a.type === 'safety');
  const extrasAlerts = alerts.filter(a => a.type === 'extras');

  return (
    <div className="animate-slide-up space-y-2">
      <h3 className="font-bebas text-lg text-white tracking-wide flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <title>Alertes</title>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        ALERTES ({alerts.length})
      </h3>

      {safetyAlerts.map((a, i) => (
        <div key={`safety-${a.date}-${a.projet}-${i}`} className="glass rounded-xl p-3 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-red-400 uppercase font-medium tracking-wider">Sécurité</span>
            <span className="text-[10px] text-gray-500">{formatDate(a.date)}</span>
          </div>
          <div className="text-xs text-gray-300 font-medium mb-0.5">{a.projet}</div>
          <p className="text-[11px] text-gray-400 leading-relaxed">{a.text}</p>
        </div>
      ))}

      {extrasAlerts.map((a, i) => (
        <div key={`extras-${a.date}-${a.projet}-${i}`} className="glass rounded-xl p-3 border-l-4 border-amber-500">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-amber-400 uppercase font-medium tracking-wider">Extras élevés</span>
            <span className="text-[10px] text-gray-500">{formatDate(a.date)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300 font-medium">{a.projet}</span>
            <span className="text-sm text-amber-400 font-bebas">{a.amount?.toLocaleString('fr-CA')} $</span>
          </div>
        </div>
      ))}
    </div>
  );
};
