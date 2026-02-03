import React, { useState } from 'react';
import type { ReportFilter } from '../../hooks/useDashboardData';

interface RapportRow {
  id: string;
  date: string;
  redacteur: string;
  projet: string;
  adresse: string | null;
  meteo: string | null;
  temperature: number | null;
  main_oeuvre: Array<{ employe: string; heureDebut: string; heureFin: string }>;
  materiaux: Array<{ item: string; quantite: string; unite: string }>;
  total_heures_mo: number | null;
  total_photos: number | null;
  has_extras: boolean | null;
  total_extras: number | null;
  notes_generales: string | null;
  problemes_securite: string | null;
}

interface PhotoRow {
  id: string;
  category: string;
  url: string;
}

interface ReportsListProps {
  rapports: RapportRow[];
  photos: Map<string, PhotoRow[]>;
  filter: ReportFilter;
  onFilterChange: (f: ReportFilter) => void;
}

const METEO_ICONS: Record<string, string> = {
  soleil: '☀️',
  nuageux: '☁️',
  pluie: '🌧️',
  neige: '❄️',
};

const FILTER_LABELS: { key: ReportFilter; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'aujourdhui', label: "Aujourd'hui" },
  { key: 'semaine', label: 'Semaine' },
];

const formatDate = (d: string): string => {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const ReportsList: React.FC<ReportsListProps> = ({ rapports, photos, filter, onFilterChange }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-2 animate-slide-up">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bebas text-lg text-white tracking-wide">
          RAPPORTS RÉCENTS ({rapports.length})
        </h3>
      </div>

      <div className="flex gap-1 mb-3">
        {FILTER_LABELS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilterChange(f.key)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              filter === f.key
                ? 'bg-[#E63946]/20 text-[#E63946] border border-[#E63946]/30'
                : 'bg-white/5 text-gray-500 border border-white/5 hover:text-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rapports.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-gray-500">Aucun rapport pour cette période</p>
        </div>
      )}

      {rapports.slice(0, 25).map((r) => {
        const isExpanded = expandedId === r.id;
        const rapportPhotos = photos.get(r.id) ?? [];

        return (
          <div key={r.id} className="glass rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : r.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-center shrink-0">
                  <div className="text-[10px] text-gray-500 uppercase">{formatDate(r.date).split(' ')[0]}</div>
                  <div className="font-bebas text-xl text-white leading-none">{new Date(r.date + 'T00:00:00').getDate()}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{r.projet}</div>
                  <div className="text-[11px] text-gray-500 truncate">{r.redacteur}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {r.meteo && <span className="text-sm">{METEO_ICONS[r.meteo] ?? ''}</span>}
                {(r.total_heures_mo ?? 0) > 0 && (
                  <span className="text-xs text-blue-400 font-medium">{r.total_heures_mo}h</span>
                )}
                {r.problemes_securite && r.problemes_securite.trim().length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">⚠</span>
                )}
                {(r.total_photos ?? 0) > 0 && (
                  <span className="text-xs text-green-400">{r.total_photos}📷</span>
                )}
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <title>Détails</title>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3 animate-slide-up">
                {r.adresse && (
                  <div className="text-xs text-gray-400">📍 {r.adresse}</div>
                )}

                {(r.main_oeuvre ?? []).length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Main d'oeuvre</div>
                    <div className="space-y-1">
                      {(r.main_oeuvre ?? []).filter(w => w.employe).map((w) => (
                        <div key={`${r.id}-${w.employe}-${w.heureDebut}`} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{w.employe}</span>
                          <span className="text-blue-400">{w.heureDebut} → {w.heureFin}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(r.materiaux ?? []).filter(m => m.item).length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Matériaux</div>
                    <div className="flex flex-wrap gap-1">
                      {(r.materiaux ?? []).filter(m => m.item).map((m) => (
                        <span key={`${r.id}-${m.item}-${m.quantite}`} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {m.quantite} {m.unite} {m.item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {r.has_extras && (r.total_extras ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#E63946] font-medium">💰 Extras: {r.total_extras?.toFixed(2)} $</span>
                  </div>
                )}

                {rapportPhotos.length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Photos ({rapportPhotos.length})</div>
                    <div className="grid grid-cols-4 gap-1">
                      {rapportPhotos.slice(0, 8).map((p) => (
                        <img
                          key={p.id}
                          src={p.url}
                          alt={p.category}
                          className="w-full aspect-square object-cover rounded-lg"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {r.notes_generales && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Notes</div>
                    <p className="text-xs text-gray-400">{r.notes_generales}</p>
                  </div>
                )}

                {r.problemes_securite && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2">
                    <div className="text-[10px] text-red-400 uppercase mb-1">⚠️ Sécurité</div>
                    <p className="text-xs text-red-300">{r.problemes_securite}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
