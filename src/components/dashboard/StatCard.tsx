import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  changePercent?: number;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accent = '#E63946', changePercent, subtitle }) => {
  const showTrend = changePercent !== undefined && changePercent !== 0;
  const trendUp = (changePercent ?? 0) > 0;

  return (
    <div className="glass rounded-2xl p-4 animate-slide-up">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}20`, color: accent }}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="font-bebas text-2xl text-white tracking-wide" style={{ color: accent }}>
          {value}
        </span>
        {showTrend && (
          <span className={`text-[10px] font-medium pb-1 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
            {trendUp ? '↑' : '↓'} {Math.abs(changePercent ?? 0)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p>}
    </div>
  );
};
