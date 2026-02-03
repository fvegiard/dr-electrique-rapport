import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

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
  created_at?: string;
}

interface PhotoRow {
  id: string;
  rapport_id: string;
  category: string;
  url: string;
  timestamp: string | null;
}

interface EmployeeHours {
  name: string;
  hours: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  reportCount: number;
  totalHours: number;
}

interface DashboardStats {
  totalRapports: number;
  totalHeuresWeek: number;
  totalPhotos: number;
  totalExtras: number;
}

interface DashboardData {
  stats: DashboardStats;
  rapports: RapportRow[];
  photos: Map<string, PhotoRow[]>;
  employeeHours: EmployeeHours[];
  projects: ProjectSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const getWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
};

const calculateHours = (debut: string, fin: string): number => {
  if (!debut || !fin) return 0;
  const [h1, m1] = debut.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  return Math.max(0, (h2 + m2 / 60) - (h1 + m1 / 60));
};

export const useDashboardData = (): DashboardData => {
  const [rapports, setRapports] = useState<RapportRow[]>([]);
  const [photos, setPhotos] = useState<Map<string, PhotoRow[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: rapportData, error: rapportErr } = await supabase
        .from('rapports')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

      if (rapportErr) throw rapportErr;

      const rows = (rapportData ?? []) as RapportRow[];
      setRapports(rows);

      // Fetch photos for all rapports
      const rapportIds = rows.map(r => r.id);
      if (rapportIds.length > 0) {
        const { data: photoData } = await supabase
          .from('photos')
          .select('*')
          .in('rapport_id', rapportIds);

        const photoMap = new Map<string, PhotoRow[]>();
        for (const photo of (photoData ?? []) as PhotoRow[]) {
          const existing = photoMap.get(photo.rapport_id) ?? [];
          existing.push(photo);
          photoMap.set(photo.rapport_id, existing);
        }
        setPhotos(photoMap);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const weekStart = getWeekStart();
  const weekRapports = rapports.filter(r => r.date >= weekStart);

  const stats: DashboardStats = {
    totalRapports: rapports.length,
    totalHeuresWeek: weekRapports.reduce((acc, r) => acc + (r.total_heures_mo ?? 0), 0),
    totalPhotos: rapports.reduce((acc, r) => acc + (r.total_photos ?? 0), 0),
    totalExtras: rapports.reduce((acc, r) => acc + (r.total_extras ?? 0), 0),
  };

  // Employee hours this week
  const hoursMap = new Map<string, number>();
  for (const r of weekRapports) {
    for (const w of r.main_oeuvre ?? []) {
      if (!w.employe) continue;
      const h = calculateHours(w.heureDebut, w.heureFin);
      hoursMap.set(w.employe, (hoursMap.get(w.employe) ?? 0) + h);
    }
  }
  const employeeHours: EmployeeHours[] = [...hoursMap.entries()]
    .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours);

  // Projects
  const projectMap = new Map<string, { count: number; hours: number }>();
  for (const r of rapports) {
    const existing = projectMap.get(r.projet) ?? { count: 0, hours: 0 };
    existing.count += 1;
    existing.hours += r.total_heures_mo ?? 0;
    projectMap.set(r.projet, existing);
  }
  const projects: ProjectSummary[] = [...projectMap.entries()]
    .map(([id, data]) => ({ id, name: id, reportCount: data.count, totalHours: Math.round(data.hours * 10) / 10 }))
    .sort((a, b) => b.reportCount - a.reportCount);

  return { stats, rapports, photos, employeeHours, projects, loading, error, refresh: fetchData };
};
