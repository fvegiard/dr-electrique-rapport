import { useState, useEffect, useCallback } from 'react';
import {
  fetchRapportById,
  updateRapport,
  fetchVersionHistory,
  type RapportWithMeta,
  type RapportVersion,
} from '../services/rapport-service';
import type { DailyReport } from '../types';

export type RapportMode = 'create' | 'view' | 'edit';

interface UseRapportOptions {
  id?: string;
  mode: RapportMode;
}

interface UseRapportReturn {
  rapport: RapportWithMeta | null;
  versions: RapportVersion[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  conflict: boolean;
  mode: RapportMode;
  save: (
    updates: Partial<DailyReport>,
    modifiePar: string,
    noteModification?: string
  ) => Promise<boolean>;
  reload: () => Promise<void>;
  loadVersions: () => Promise<void>;
}

export function useRapport({ id, mode }: UseRapportOptions): UseRapportReturn {
  const [rapport, setRapport] = useState<RapportWithMeta | null>(null);
  const [versions, setVersions] = useState<RapportVersion[]>([]);
  const [isLoading, setIsLoading] = useState(mode !== 'create');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const load = useCallback(async () => {
    if (!id || mode === 'create') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchRapportById(id);

    if (fetchError) {
      setError(fetchError.message);
      setRapport(null);
    } else {
      setRapport(data);
    }

    setIsLoading(false);
  }, [id, mode]);

  useEffect(() => {
    load();
  }, [load]);

  const loadVersions = useCallback(async () => {
    if (!id) return;

    const { data, error: versionError } = await fetchVersionHistory(id);

    if (versionError) {
      console.error('Failed to load versions:', versionError);
      return;
    }

    setVersions(data ?? []);
  }, [id]);

  const save = useCallback(
    async (
      updates: Partial<DailyReport>,
      modifiePar: string,
      noteModification?: string
    ): Promise<boolean> => {
      if (!id || !rapport) {
        setError('Rapport non chargé');
        return false;
      }

      setIsSaving(true);
      setError(null);
      setConflict(false);

      const result = await updateRapport(
        id,
        updates,
        rapport.updated_at,
        modifiePar,
        noteModification
      );

      if (!result.success) {
        setError(result.error?.message ?? 'Erreur lors de la sauvegarde');
        if (result.conflict) {
          setConflict(true);
        }
        setIsSaving(false);
        return false;
      }

      await load();
      setIsSaving(false);
      return true;
    },
    [id, rapport, load]
  );

  return {
    rapport,
    versions,
    isLoading,
    isSaving,
    error,
    conflict,
    mode,
    save,
    reload: load,
    loadVersions,
  };
}
