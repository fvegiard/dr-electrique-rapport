import React, { useState } from 'react';

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
}

const METEO_ICONS: Record<string, string> = {
  soleil: '☀️',
  nuageux: '☁️',
  pluie: '🌧️',
  neige: '❄️',
};

const formatDate = (d: string): string => {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const ReportsList: React.FC<ReportsListProps> = ({ rapports, photos }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (rapports.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center animate-slide-up">
        <p className="text-gray-500">Aucun rapport trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-slide-up">
      <h3 className="font-bebas text-lg text-white tracking-wide mb-3">RAPPORTS RÉCENTS</h3>
      {rapports.slice(0, 20).map((r) => {
        const isExpanded = expandedId === r.id;
        const rapportPhotos = photos.get(r.id) ?? [];

        return (
          <div key={r.id} className="glass rounded-xl overflow-hidden">
            {/* Header row — clickable */}
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
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3 animate-slide-up">
                {/* Address */}
                {r.adresse && (
                  <div className="text-xs text-gray-400">
                    📍 {r.adresse}
                  </div>
                )}

                {/* Workers */}
                {(r.main_oeuvre ?? []).length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Main d'oeuvre</div>
                    <div className="space-y-1">
                      {(r.main_oeuvre ?? []).filter(w => w.employe).map((w, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{w.employe}</span>
                          <span className="text-blue-400">{w.heureDebut} → {w.heureFin}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materials */}
                {(r.materiaux ?? []).filter(m => m.item).length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Matériaux</div>
                    <div className="flex flex-wrap gap-1">
                      {(r.materiaux ?? []).filter(m => m.item).map((m, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {m.quantite} {m.unite} {m.item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extras */}
                {r.has_extras && (r.total_extras ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#E63946] font-medium">💰 Extras: {r.total_extras?.toFixed(2)} $</span>
                  </div>
                )}

                {/* Photos */}
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

                {/* Notes */}
                {r.notes_generales && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase mb-1">Notes</div>
                    <p className="text-xs text-gray-400">{r.notes_generales}</p>
                  </div>
                )}

                {/* Safety */}
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
