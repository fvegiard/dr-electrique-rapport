import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'dr_redacteur';

export interface Identity {
  nom: string;
  savedAt: string;
}

export function useIdentity() {
  const [identity, setIdentityState] = useState<Identity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Identity;
        setIdentityState(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setIdentity = useCallback((nom: string) => {
    const newIdentity: Identity = {
      nom,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newIdentity));
    setIdentityState(newIdentity);
  }, []);

  const clearIdentity = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIdentityState(null);
  }, []);

  const hasIdentity = identity !== null && identity.nom.trim().length > 0;

  return {
    identity,
    redacteur: identity?.nom ?? '',
    hasIdentity,
    isLoading,
    setIdentity,
    clearIdentity,
  };
}
