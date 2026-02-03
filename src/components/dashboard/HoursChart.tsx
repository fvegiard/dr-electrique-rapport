import React from 'react';
import type { EmployeeHours } from '../../hooks/useDashboardData';

interface HoursChartProps {
  data: EmployeeHours[];
  weekLabel: string;
}

const getBarColor = (hours: number): string => {
  if (hours > 48) return '#E63946';
  if (hours >= 40) return '#f59e0b';
  return '#22c55e';
};

const STANDARD_WEEK = 40;

export const HoursChart: React.FC<HoursChartProps> = ({ data, weekLabel }) => {
  const maxHours = Math.max(...data.map(d => d.hours), STANDARD_WEEK + 5);

  if (data.length === 0) {
    return (
      <div className="glass rounded-2xl p-4 animate-slide-up">
        <h3 className="font-bebas text-lg text-white tracking-wide mb-1">HEURES PAR EMPLOYÉ</h3>
        <p className="text-[10px] text-gray-600 mb-4">{weekLabel}</p>
        <p className="text-gray-500 text-sm text-center py-6">Aucune donnée cette semaine</p>
      </div>
    );
  }

  const thresholdPct = Math.round((STANDARD_WEEK / maxHours) * 100);

  return (
    <div className="glass rounded-2xl p-4 animate-slide-up">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bebas text-lg text-white tracking-wide">HEURES PAR EMPLOYÉ</h3>
        <div className="flex items-center gap-3 text-[9px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> &lt;40h</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 40-48h</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#E63946]" /> &gt;48h</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-600 mb-4">{weekLabel}</p>
      <div className="space-y-3 relative">
        <div
          className="absolute top-0 bottom-0 border-l border-dashed border-white/15"
          style={{ left: `calc(${thresholdPct}% + 0px)` }}
        >
          <span className="absolute -top-4 -translate-x-1/2 text-[8px] text-gray-500">40h</span>
        </div>
        {data.map((employee) => {
          const pct = Math.round((employee.hours / maxHours) * 100);
          const color = getBarColor(employee.hours);
          return (
            <div key={employee.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300 truncate max-w-[120px]">{employee.name}</span>
                <span className="text-xs font-medium" style={{ color }}>
                  {employee.hours}h
                  {employee.overtime && <span className="ml-1 text-[9px] text-red-400">OT</span>}
                </span>
              </div>
              <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
