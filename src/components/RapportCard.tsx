import React from 'react';
import { Link } from 'react-router-dom';
import type { RapportSummary } from '../services/rapport-service';

interface RapportCardProps {
  rapport: RapportSummary;
}

export const RapportCard: React.FC<RapportCardProps> = ({ rapport }) => {
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-CA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const isToday = (dateStr: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  return (
    <Link
      to={`/rapport/${rapport.id}`}
      className="block bg-white/5 hover:bg-white/10 border border-white/10 
               rounded-xl p-4 transition-all hover:border-[#E63946]/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                isToday(rapport.date)
                  ? 'bg-[#E63946]/20 text-[#E63946]'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {formatDate(rapport.date)}
            </span>
            {rapport.current_version > 1 && (
              <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                v{rapport.current_version}
              </span>
            )}
          </div>

          <h3 className="text-white font-medium truncate">
            {rapport.projetNom ?? rapport.projet}
          </h3>

          <p className="text-white/40 text-sm truncate mt-1">{rapport.adresse}</p>
        </div>

        <div className="text-right flex-shrink-0">
          {rapport.totalHeuresMO !== undefined && rapport.totalHeuresMO > 0 && (
            <div className="text-white/60 text-sm">
              {rapport.totalHeuresMO.toFixed(1)}h
            </div>
          )}
          {rapport.hasExtras && (
            <div className="text-[#E63946] text-sm font-medium">
              {rapport.nbExtras} extra{(rapport.nbExtras ?? 0) > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
        {rapport.totalPhotos !== undefined && rapport.totalPhotos > 0 && (
          <div className="flex items-center gap-1 text-white/40 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>Photos</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {rapport.totalPhotos}
          </div>
        )}

        <div className="flex-1" />

        <svg className="w-5 h-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <title>Voir le rapport</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </Link>
  );
};
