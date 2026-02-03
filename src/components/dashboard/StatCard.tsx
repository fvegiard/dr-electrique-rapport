import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, accent = '#E63946', subtitle }) => (
  <div className="glass rounded-2xl p-4 animate-slide-up">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">{label}</span>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}20`, color: accent }}>
        {icon}
      </div>
    </div>
    <div className="font-bebas text-3xl text-white tracking-wide" style={{ color: accent }}>
      {value}
    </div>
    {subtitle && <p className="text-[11px] text-gray-600 mt-1">{subtitle}</p>}
  </div>
);
