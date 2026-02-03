import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useIdentity } from '../hooks/useIdentity';
import { fetchRapportsForRedacteur, type RapportSummary } from '../services/rapport-service';
import { IdentitySelector } from '../components/IdentitySelector';
import { RapportCard } from '../components/RapportCard';

export const MesRapports: React.FC = () => {
  const { redacteur, hasIdentity, isLoading: identityLoading, setIdentity } = useIdentity();
  const [rapports, setRapports] = useState<RapportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIdentityModal, setShowIdentityModal] = useState(false);

  useEffect(() => {
    if (!hasIdentity || !redacteur) return;

    const loadRapports = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await fetchRapportsForRedacteur(redacteur);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setRapports(data ?? []);
      }

      setIsLoading(false);
    };

    loadRapports();
  }, [hasIdentity, redacteur]);

  if (identityLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasIdentity) {
    return (
      <IdentitySelector
        onSelect={(nom) => {
          setIdentity(nom);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Mes Rapports</h1>
              <button
                type="button"
                onClick={() => setShowIdentityModal(true)}
                className="text-white/40 text-sm hover:text-white/60 transition-colors"
              >
                {redacteur}
              </button>
            </div>
            <Link
              to="/"
              className="px-4 py-2 bg-[#E63946] hover:bg-[#E63946]/80 rounded-lg 
                       text-white text-sm font-medium transition-colors"
            >
              Nouveau
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#E63946] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
            {error}
          </div>
        ) : rapports.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white/20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Aucun rapport</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-white/60 font-medium mb-2">Aucun rapport</h2>
            <p className="text-white/40 text-sm mb-6">
              Vous n'avez pas encore soumis de rapport.
            </p>
            <Link
              to="/"
              className="inline-flex px-6 py-3 bg-[#E63946] hover:bg-[#E63946]/80 
                       rounded-xl text-white font-medium transition-colors"
            >
              Créer un rapport
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rapports.map((rapport) => (
              <RapportCard key={rapport.id} rapport={rapport} />
            ))}
          </div>
        )}
      </main>

      {showIdentityModal && (
        <IdentitySelector
          currentName={redacteur}
          onSelect={(nom) => {
            setIdentity(nom);
            setShowIdentityModal(false);
          }}
          onCancel={() => setShowIdentityModal(false)}
        />
      )}
    </div>
  );
};
