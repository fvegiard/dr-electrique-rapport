import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchVersionHistory, fetchRapportById, type RapportVersion } from '../services/rapport-service';

export const RapportVersions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [versions, setVersions] = useState<RapportVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [projetNom, setProjetNom] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      const [rapportResult, versionsResult] = await Promise.all([
        fetchRapportById(id),
        fetchVersionHistory(id),
      ]);

      if (rapportResult.error) {
        setError(rapportResult.error.message);
      } else if (rapportResult.data) {
        setCurrentVersion(rapportResult.data.current_version);
        setProjetNom(rapportResult.data.projetNom ?? rapportResult.data.projet);
      }

      if (versionsResult.error) {
        setError(versionsResult.error.message);
      } else {
        setVersions(versionsResult.data ?? []);
      }

      setIsLoading(false);
    };

    load();
  }, [id]);

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to={`/rapport/${id}`}
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
            <div>
              <h1 className="text-xl font-bold">Historique</h1>
              <p className="text-white/40 text-sm">{projetNom}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
            {error}
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white/20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Aucune version</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-white/60 font-medium mb-2">Aucun historique</h2>
            <p className="text-white/40 text-sm">
              Ce rapport n'a pas encore été modifié.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />

            <div className="space-y-6">
              <div className="relative pl-10">
                <div className="absolute left-2.5 w-3 h-3 rounded-full bg-[#E63946] ring-4 ring-[#0a0a0a]" />
                <div className="bg-[#E63946]/10 border border-[#E63946]/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#E63946] font-medium">Version actuelle</span>
                    <span className="text-white/40 text-sm">v{currentVersion}</span>
                  </div>
                  <p className="text-white/60 text-sm">Version en cours</p>
                </div>
              </div>

              {versions.map((version) => (
                <div key={version.id} className="relative pl-10">
                  <div className="absolute left-2.5 w-3 h-3 rounded-full bg-white/20 ring-4 ring-[#0a0a0a]" />
                  <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedVersion(
                          expandedVersion === version.version ? null : version.version
                        )
                      }
                      className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">Version {version.version}</span>
                        <span className="text-white/40 text-sm">
                          {formatDateTime(version.created_at)}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm">
                        Modifié par {version.modifie_par}
                      </p>
                      {version.note_modification && (
                        <p className="text-white/40 text-sm mt-1 italic">
                          "{version.note_modification}"
                        </p>
                      )}
                    </button>

                    {expandedVersion === version.version && (
                      <div className="border-t border-white/10 p-4 bg-black/20">
                        <h4 className="text-white/60 text-xs uppercase tracking-wide mb-3">
                          Données sauvegardées
                        </h4>
                        <pre className="text-white/40 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                          {JSON.stringify(version.donnees, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
