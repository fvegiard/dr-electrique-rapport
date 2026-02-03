import React, { useState } from 'react';

interface IdentitySelectorProps {
  onSelect: (nom: string) => void;
  onCancel?: () => void;
  currentName?: string;
}

const KNOWN_EMPLOYEES = [
  'Francis Vegiard',
  'Jean-Pierre Dubois',
  'Marc-André Tremblay',
  'Éric Gagnon',
  'Stéphane Lavoie',
  'Patrick Roy',
  'Martin Pelletier',
];

export const IdentitySelector: React.FC<IdentitySelectorProps> = ({
  onSelect,
  onCancel,
  currentName = '',
}) => {
  const [customName, setCustomName] = useState(currentName);
  const [showCustom, setShowCustom] = useState(
    currentName !== '' && !KNOWN_EMPLOYEES.includes(currentName)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customName.trim()) {
      onSelect(customName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-2">Qui êtes-vous?</h2>
        <p className="text-white/60 text-sm mb-6">
          Sélectionnez votre nom pour accéder à vos rapports
        </p>

        {!showCustom ? (
          <div className="space-y-2 mb-4">
            {KNOWN_EMPLOYEES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onSelect(name)}
                className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 
                         border border-white/10 rounded-xl text-white transition-colors"
              >
                {name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="w-full text-left px-4 py-3 bg-[#E63946]/10 hover:bg-[#E63946]/20 
                       border border-[#E63946]/30 rounded-xl text-[#E63946] transition-colors"
            >
              Autre nom...
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="identity-name" className="block text-white/60 text-sm mb-2">
                Votre nom complet
              </label>
              <input
                id="identity-name"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ex: Jean-Pierre Dubois"

                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                         text-white placeholder-white/30 focus:outline-none focus:border-[#E63946]/50"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 
                         border border-white/10 rounded-xl text-white transition-colors"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={!customName.trim()}
                className="flex-1 px-4 py-3 bg-[#E63946] hover:bg-[#E63946]/80 
                         rounded-xl text-white font-medium transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmer
              </button>
            </div>
          </form>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full mt-4 px-4 py-2 text-white/40 hover:text-white/60 
                     text-sm transition-colors"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
};
