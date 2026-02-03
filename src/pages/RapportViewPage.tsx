import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRapport } from '../hooks/useRapport';
import { useIdentity } from '../hooks/useIdentity';
import { IdentitySelector } from '../components/IdentitySelector';
import type { DailyReport } from '../types';

export const RapportViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { redacteur, hasIdentity, setIdentity } = useIdentity();
  const { rapport, isLoading, isSaving, error, conflict, save, reload } = useRapport({
    id,
    mode: 'view',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<DailyReport>>({});
  const [editNote, setEditNote] = useState('');
  const [showIdentity, setShowIdentity] = useState(false);

  useEffect(() => {
    if (rapport) {
      setEditData({
        evenements: rapport.evenements ?? '',
        problemesSecurite: rapport.problemesSecurite ?? '',
        notesGenerales: rapport.notesGenerales ?? '',
      });
    }
  }, [rapport]);

  const handleSave = async () => {
    if (!hasIdentity) {
      setShowIdentity(true);
      return;
    }

    const success = await save(editData, redacteur, editNote || undefined);
    if (success) {
      setIsEditing(false);
      setEditNote('');
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-CA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !rapport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <h2 className="text-red-400 font-bold mb-2">Erreur</h2>
          <p className="text-white/60 mb-4">{error}</p>
          <Link to="/mes-rapports" className="text-[#E63946] hover:underline">
            Retour aux rapports
          </Link>
        </div>
      </div>
    );
  }

  if (!rapport) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/mes-rapports"
              className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <title>Retour</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{rapport.projetNom ?? rapport.projet}</h1>
              <p className="text-white/40 text-sm">{formatDate(rapport.date)}</p>
            </div>
            {rapport.current_version > 1 && (
              <Link
                to={`/rapport/${id}/versions`}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 
                         rounded-lg text-sm text-white/60 hover:text-white transition-colors"
              >
                v{rapport.current_version}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {conflict && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-yellow-400 text-sm">
              Ce rapport a été modifié par quelqu'un d'autre.
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-2 text-yellow-400 hover:text-yellow-300 text-sm font-medium"
            >
              Rafraîchir
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        <section className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h2 className="text-white/40 text-xs uppercase tracking-wide mb-3">Informations</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-white/40">Adresse</dt>
              <dd className="text-white">{rapport.adresse || '—'}</dd>
            </div>
            <div>
              <dt className="text-white/40">Rédacteur</dt>
              <dd className="text-white">{rapport.redacteur}</dd>
            </div>
            <div>
              <dt className="text-white/40">Météo</dt>
              <dd className="text-white">{rapport.meteo || '—'} {rapport.temperature}°C</dd>
            </div>
            <div>
              <dt className="text-white/40">Heures totales</dt>
              <dd className="text-white">{rapport.totalHeuresMO?.toFixed(1) ?? 0}h</dd>
            </div>
          </dl>
        </section>

        {(rapport.mainOeuvre?.length ?? 0) > 0 && (
          <section className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h2 className="text-white/40 text-xs uppercase tracking-wide mb-3">Main d'oeuvre</h2>
            <div className="space-y-2">
              {rapport.mainOeuvre?.map((worker, idx) => (
                <div
                  key={`worker-${worker.id ?? idx}`}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <span className="text-white">{worker.employe || 'Employé non spécifié'}</span>
                  <span className="text-white/60 text-sm">
                    {worker.heureDebut} - {worker.heureFin}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(rapport.materiaux?.length ?? 0) > 0 && (
          <section className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h2 className="text-white/40 text-xs uppercase tracking-wide mb-3">Matériaux</h2>
            <div className="space-y-2">
              {rapport.materiaux?.map((mat, idx) => (
                <div
                  key={`mat-${mat.id ?? idx}`}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <span className="text-white">{mat.item || 'Matériau'}</span>
                  <span className="text-white/60 text-sm">
                    {mat.quantite} {mat.unite}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white/40 text-xs uppercase tracking-wide">Notes</h2>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-[#E63946] hover:bg-[#E63946]/10 rounded-lg 
                         text-sm font-medium transition-colors"
              >
                Modifier
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="evenements" className="block text-white/60 text-sm mb-1">
                  Événements importants
                </label>
                <textarea
                  id="evenements"
                  value={editData.evenements ?? ''}
                  onChange={(e) => setEditData((prev) => ({ ...prev, evenements: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl 
                           text-white placeholder-white/30 resize-none"
                />
              </div>
              <div>
                <label htmlFor="securite" className="block text-white/60 text-sm mb-1">
                  Problèmes de sécurité
                </label>
                <textarea
                  id="securite"
                  value={editData.problemesSecurite ?? ''}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, problemesSecurite: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl 
                           text-white placeholder-white/30 resize-none"
                />
              </div>
              <div>
                <label htmlFor="notes" className="block text-white/60 text-sm mb-1">
                  Notes générales
                </label>
                <textarea
                  id="notes"
                  value={editData.notesGenerales ?? ''}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, notesGenerales: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl 
                           text-white placeholder-white/30 resize-none"
                />
              </div>
              <div>
                <label htmlFor="edit-note" className="block text-white/60 text-sm mb-1">
                  Raison de la modification (optionnel)
                </label>
                <input
                  id="edit-note"
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Ex: Correction des heures"
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl 
                           text-white placeholder-white/30"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      evenements: rapport.evenements ?? '',
                      problemesSecurite: rapport.problemesSecurite ?? '',
                      notesGenerales: rapport.notesGenerales ?? '',
                    });
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 
                           rounded-xl text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-[#E63946] hover:bg-[#E63946]/80 rounded-xl 
                           text-white font-medium transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              {rapport.evenements && (
                <div>
                  <dt className="text-white/40 mb-1">Événements importants</dt>
                  <dd className="text-white whitespace-pre-wrap">{rapport.evenements}</dd>
                </div>
              )}
              {rapport.problemesSecurite && (
                <div>
                  <dt className="text-white/40 mb-1">Problèmes de sécurité</dt>
                  <dd className="text-red-400 whitespace-pre-wrap">{rapport.problemesSecurite}</dd>
                </div>
              )}
              {rapport.notesGenerales && (
                <div>
                  <dt className="text-white/40 mb-1">Notes générales</dt>
                  <dd className="text-white whitespace-pre-wrap">{rapport.notesGenerales}</dd>
                </div>
              )}
              {!rapport.evenements && !rapport.problemesSecurite && !rapport.notesGenerales && (
                <p className="text-white/40 italic">Aucune note</p>
              )}
            </div>
          )}
        </section>

        {rapport.hasExtras && (
          <section className="bg-[#E63946]/10 border border-[#E63946]/30 rounded-xl p-4">
            <h2 className="text-[#E63946] text-xs uppercase tracking-wide mb-2">Extras</h2>
            <p className="text-white">
              {rapport.nbExtras} extra{(rapport.nbExtras ?? 0) > 1 ? 's' : ''} — Total:{' '}
              {rapport.totalExtras?.toLocaleString('fr-CA', {
                style: 'currency',
                currency: 'CAD',
              })}
            </p>
          </section>
        )}
      </main>

      {showIdentity && (
        <IdentitySelector
          onSelect={(nom) => {
            setIdentity(nom);
            setShowIdentity(false);
            handleSave();
          }}
          onCancel={() => setShowIdentity(false)}
        />
      )}
    </div>
  );
};
