import React from 'react';

interface EmployeeHours {
  name: string;
  hours: number;
}

interface HoursChartProps {
  data: EmployeeHours[];
}

export const HoursChart: React.FC<HoursChartProps> = ({ data }) => {
  const maxHours = Math.max(...data.map(d => d.hours), 1);

  if (data.length === 0) {
    return (
      <div className="glass rounded-2xl p-4 animate-slide-up">
        <h3 className="font-bebas text-lg text-white tracking-wide mb-4">HEURES PAR EMPLOYÉ (SEMAINE)</h3>
        <p className="text-gray-500 text-sm text-center py-6">Aucune donnée cette semaine</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 animate-slide-up">
      <h3 className="font-bebas text-lg text-white tracking-wide mb-4">HEURES PAR EMPLOYÉ (SEMAINE)</h3>
      <div className="space-y-3">
        {data.map((employee) => {
          const pct = Math.round((employee.hours / maxHours) * 100);
          return (
            <div key={employee.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300 truncate max-w-[120px]">{employee.name}</span>
                <span className="text-xs font-medium text-white">{employee.hours}h</span>
              </div>
              <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, #E63946, #ff6b6b)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
