import { supabase } from './supabase';
import type { DailyReport } from '../types';

export interface RapportSummary {
  id: string;
  projet: string;
  projetNom?: string;
  date: string;
  redacteur: string;
  adresse: string;
  totalHeuresMO?: number;
  totalPhotos?: number;
  hasExtras?: boolean;
  nbExtras?: number;
  totalExtras?: number;
  current_version: number;
  updated_at: string;
  created_at: string;
}

export interface RapportVersion {
  id: string;
  rapport_id: string;
  version: number;
  modifie_par: string;
  donnees: DailyReport;
  photo_ids: string[];
  note_modification: string | null;
  created_at: string;
}

export interface RapportWithMeta extends DailyReport {
  current_version: number;
  updated_at: string;
  created_at: string;
}

export async function fetchRapportsForRedacteur(
  redacteur: string,
  limit = 50
): Promise<{ data: RapportSummary[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('rapports')
    .select(`
      id,
      projet,
      date,
      redacteur,
      adresse,
      total_heures_mo,
      total_photos,
      has_extras,
      nb_extras,
      total_extras,
      current_version,
      updated_at,
      created_at
    `)
    .eq('redacteur', redacteur)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const mapped = (data ?? []).map((r) => ({
    id: r.id,
    projet: r.projet,
    date: r.date,
    redacteur: r.redacteur,
    adresse: r.adresse,
    totalHeuresMO: r.total_heures_mo,
    totalPhotos: r.total_photos,
    hasExtras: r.has_extras,
    nbExtras: r.nb_extras,
    totalExtras: r.total_extras,
    current_version: r.current_version ?? 1,
    updated_at: r.updated_at,
    created_at: r.created_at,
  }));

  return { data: mapped, error: null };
}

export async function fetchRapportById(
  id: string
): Promise<{ data: RapportWithMeta | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('rapports')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  if (!data) {
    return { data: null, error: new Error('Rapport non trouvé') };
  }

  const rapport: RapportWithMeta = {
    id: data.id,
    projet: data.projet,
    projetNom: data.projet_nom,
    date: data.date,
    adresse: data.adresse,
    meteo: data.meteo,
    temperature: data.temperature,
    redacteur: data.redacteur,
    mainOeuvre: data.main_oeuvre ?? [],
    materiaux: data.materiaux ?? [],
    equipements: data.equipements ?? [],
    soustraitants: data.soustraitants ?? [],
    ordresTravail: data.ordres_travail ?? [],
    reunions: data.reunions ?? [],
    photosGenerales: [],
    photosAvant: [],
    photosApres: [],
    photosProblemes: [],
    evenements: data.evenements,
    problemesSecurite: data.problemes_securite,
    notesGenerales: data.notes_generales,
    totalHeuresMO: data.total_heures_mo,
    totalPhotos: data.total_photos,
    hasExtras: data.has_extras,
    nbExtras: data.nb_extras,
    totalExtras: data.total_extras,
    hasGPSPhotos: data.has_gps_photos,
    submittedAt: data.submitted_at,
    current_version: data.current_version ?? 1,
    updated_at: data.updated_at,
    created_at: data.created_at,
  };

  return { data: rapport, error: null };
}

export async function updateRapport(
  id: string,
  updates: Partial<DailyReport>,
  expectedUpdatedAt: string,
  modifiePar: string,
  noteModification?: string
): Promise<{ success: boolean; error: Error | null; conflict?: boolean }> {
  const { data: current, error: fetchError } = await supabase
    .from('rapports')
    .select('updated_at, current_version')
    .eq('id', id)
    .single();

  if (fetchError) {
    return { success: false, error: new Error(fetchError.message) };
  }

  if (current.updated_at !== expectedUpdatedAt) {
    return {
      success: false,
      error: new Error('Ce rapport a été modifié par quelqu\'un d\'autre. Veuillez rafraîchir.'),
      conflict: true,
    };
  }

  const currentVersion = current.current_version ?? 1;

  const { data: rapportData, error: rapportError } = await supabase
    .from('rapports')
    .select('*')
    .eq('id', id)
    .single();

  if (rapportError) {
    return { success: false, error: new Error(rapportError.message) };
  }

  const { error: versionError } = await supabase
    .from('rapport_versions')
    .insert({
      rapport_id: id,
      version: currentVersion,
      modifie_par: modifiePar,
      donnees: rapportData,
      photo_ids: [],
      note_modification: noteModification ?? null,
    });

  if (versionError) {
    console.error('Failed to create version snapshot:', versionError);
  }

  const dbUpdates: Record<string, unknown> = {};
  
  if (updates.projet !== undefined) dbUpdates.projet = updates.projet;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.adresse !== undefined) dbUpdates.adresse = updates.adresse;
  if (updates.meteo !== undefined) dbUpdates.meteo = updates.meteo;
  if (updates.temperature !== undefined) dbUpdates.temperature = updates.temperature;
  if (updates.redacteur !== undefined) dbUpdates.redacteur = updates.redacteur;
  if (updates.mainOeuvre !== undefined) dbUpdates.main_oeuvre = updates.mainOeuvre;
  if (updates.materiaux !== undefined) dbUpdates.materiaux = updates.materiaux;
  if (updates.equipements !== undefined) dbUpdates.equipements = updates.equipements;
  if (updates.soustraitants !== undefined) dbUpdates.soustraitants = updates.soustraitants;
  if (updates.ordresTravail !== undefined) dbUpdates.ordres_travail = updates.ordresTravail;
  if (updates.reunions !== undefined) dbUpdates.reunions = updates.reunions;
  if (updates.evenements !== undefined) dbUpdates.evenements = updates.evenements;
  if (updates.problemesSecurite !== undefined) dbUpdates.problemes_securite = updates.problemesSecurite;
  if (updates.notesGenerales !== undefined) dbUpdates.notes_generales = updates.notesGenerales;
  if (updates.totalHeuresMO !== undefined) dbUpdates.total_heures_mo = updates.totalHeuresMO;
  if (updates.totalPhotos !== undefined) dbUpdates.total_photos = updates.totalPhotos;
  if (updates.hasExtras !== undefined) dbUpdates.has_extras = updates.hasExtras;
  if (updates.nbExtras !== undefined) dbUpdates.nb_extras = updates.nbExtras;
  if (updates.totalExtras !== undefined) dbUpdates.total_extras = updates.totalExtras;

  const { error: updateError } = await supabase
    .from('rapports')
    .update(dbUpdates)
    .eq('id', id);

  if (updateError) {
    return { success: false, error: new Error(updateError.message) };
  }

  return { success: true, error: null };
}

export async function fetchVersionHistory(
  rapportId: string
): Promise<{ data: RapportVersion[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('rapport_versions')
    .select('*')
    .eq('rapport_id', rapportId)
    .order('version', { ascending: false });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data ?? [], error: null };
}

export async function fetchVersion(
  rapportId: string,
  version: number
): Promise<{ data: RapportVersion | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('rapport_versions')
    .select('*')
    .eq('rapport_id', rapportId)
    .eq('version', version)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data, error: null };
}
