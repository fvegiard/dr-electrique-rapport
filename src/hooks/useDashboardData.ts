import { useState, useEffect, useCallback, useMemo } from 'react';
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

export interface EmployeeHours {
  name: string;
  hours: number;
  overtime: boolean;
}

export interface ProjectCard {
  id: string;
  name: string;
  rapportsThisMonth: number;
  hoursThisMonth: number;
  uniqueWorkers: number;
  latestDate: string;
  hasReportToday: boolean;
}

export interface Alert {
  type: 'safety' | 'extras';
  projet: string;
  date: string;
  text: string;
  amount?: number;
}

export interface TodayStats {
  chantiersActifs: number;
  travailleursDeployes: number;
  rapportsSoumis: number;
  alertesSecurite: number;
}

export interface WeeklyKPI {
  value: number;
  previousValue: number;
  changePercent: number;
  label: string;
}

export type ReportFilter = 'tous' | 'aujourdhui' | 'semaine';

export interface DashboardData {
  rapports: RapportRow[];
  photos: Map<string, PhotoRow[]>;
  todayStats: TodayStats;
  weeklyKPIs: {
    heures: WeeklyKPI;
    rapports: WeeklyKPI;
    extras: WeeklyKPI;
    securite: WeeklyKPI;
  };
  alerts: Alert[];
  projectCards: ProjectCard[];
  employeeHours: EmployeeHours[];
  weekLabel: string;
  filter: ReportFilter;
  setFilter: (f: ReportFilter) => void;
  filteredRapports: RapportRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const getDateStr = (d: Date): string => d.toISOString().split('T')[0];

const getWeekBounds = (offset = 0): { start: string; end: string } => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: getDateStr(monday), end: getDateStr(sunday) };
};

const getMonthStart = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

const calculateHours = (debut: string, fin: string): number => {
  if (!debut || !fin) return 0;
  const [h1, m1] = debut.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  return Math.max(0, (h2 + m2 / 60) - (h1 + m1 / 60));
};

const formatWeekLabel = (start: string, end: string): string => {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
  return `${fmt(s)} — ${fmt(e)}`;
};

export const useDashboardData = (): DashboardData => {
  const [rapports, setRapports] = useState<RapportRow[]>([]);
  const [photos, setPhotos] = useState<Map<string, PhotoRow[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReportFilter>('tous');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: rapportData, error: rapportErr } = await supabase
        .from('rapports')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);

      if (rapportErr) throw rapportErr;

      const rows = (rapportData ?? []) as RapportRow[];
      setRapports(rows);

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

  const today = getDateStr(new Date());
  const thisWeek = getWeekBounds(0);
  const lastWeek = getWeekBounds(-1);
  const monthStart = getMonthStart();
  const weekLabel = formatWeekLabel(thisWeek.start, thisWeek.end);

  const computed = useMemo(() => {
    const todayRapports = rapports.filter(r => r.date === today);
    const weekRapports = rapports.filter(r => r.date >= thisWeek.start && r.date <= thisWeek.end);
    const lastWeekRapports = rapports.filter(r => r.date >= lastWeek.start && r.date <= lastWeek.end);
    const monthRapports = rapports.filter(r => r.date >= monthStart);

    // --- TODAY ---
    const todayProjects = new Set(todayRapports.map(r => r.projet));
    const todayWorkers = new Set<string>();
    let todaySafety = 0;
    for (const r of todayRapports) {
      for (const w of r.main_oeuvre ?? []) {
        if (w.employe) todayWorkers.add(w.employe);
      }
      if (r.problemes_securite && r.problemes_securite.trim().length > 0) todaySafety++;
    }

    const todayStats: TodayStats = {
      chantiersActifs: todayProjects.size,
      travailleursDeployes: todayWorkers.size,
      rapportsSoumis: todayRapports.length,
      alertesSecurite: todaySafety,
    };

    // --- WEEKLY KPIs ---
    const weekHours = weekRapports.reduce((a, r) => a + (r.total_heures_mo ?? 0), 0);
    const lastWeekHours = lastWeekRapports.reduce((a, r) => a + (r.total_heures_mo ?? 0), 0);
    const weekExtras = weekRapports.reduce((a, r) => a + (r.total_extras ?? 0), 0);
    const lastWeekExtras = lastWeekRapports.reduce((a, r) => a + (r.total_extras ?? 0), 0);
    const weekSafety = weekRapports.filter(r => r.problemes_securite && r.problemes_securite.trim().length > 0).length;
    const lastWeekSafety = lastWeekRapports.filter(r => r.problemes_securite && r.problemes_securite.trim().length > 0).length;

    const pct = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    const weeklyKPIs = {
      heures: { value: Math.round(weekHours * 10) / 10, previousValue: lastWeekHours, changePercent: pct(weekHours, lastWeekHours), label: 'Heures travaillées' },
      rapports: { value: weekRapports.length, previousValue: lastWeekRapports.length, changePercent: pct(weekRapports.length, lastWeekRapports.length), label: 'Rapports soumis' },
      extras: { value: Math.round(weekExtras), previousValue: lastWeekExtras, changePercent: pct(weekExtras, lastWeekExtras), label: 'Extras ($)' },
      securite: { value: weekSafety, previousValue: lastWeekSafety, changePercent: pct(weekSafety, lastWeekSafety), label: 'Alertes sécurité' },
    };

    // --- ALERTS ---
    const alerts: Alert[] = [];
    for (const r of weekRapports) {
      if (r.problemes_securite && r.problemes_securite.trim().length > 0) {
        alerts.push({
          type: 'safety',
          projet: r.projet,
          date: r.date,
          text: r.problemes_securite.slice(0, 120),
        });
      }
      if ((r.total_extras ?? 0) > 500) {
        alerts.push({
          type: 'extras',
          projet: r.projet,
          date: r.date,
          text: `Extras élevés`,
          amount: r.total_extras ?? 0,
        });
      }
    }

    // --- PROJECTS ---
    const projMap = new Map<string, { count: number; hours: number; workers: Set<string>; latestDate: string; hasToday: boolean }>();
    for (const r of monthRapports) {
      const existing = projMap.get(r.projet) ?? { count: 0, hours: 0, workers: new Set<string>(), latestDate: r.date, hasToday: false };
      existing.count += 1;
      existing.hours += r.total_heures_mo ?? 0;
      for (const w of r.main_oeuvre ?? []) {
        if (w.employe) existing.workers.add(w.employe);
      }
      if (r.date > existing.latestDate) existing.latestDate = r.date;
      if (r.date === today) existing.hasToday = true;
      projMap.set(r.projet, existing);
    }
    const projectCards: ProjectCard[] = [...projMap.entries()]
      .map(([id, d]) => ({
        id,
        name: id,
        rapportsThisMonth: d.count,
        hoursThisMonth: Math.round(d.hours * 10) / 10,
        uniqueWorkers: d.workers.size,
        latestDate: d.latestDate,
        hasReportToday: d.hasToday,
      }))
      .sort((a, b) => b.rapportsThisMonth - a.rapportsThisMonth);

    // --- EMPLOYEE HOURS (this week) ---
    const hoursMap = new Map<string, number>();
    for (const r of weekRapports) {
      for (const w of r.main_oeuvre ?? []) {
        if (!w.employe) continue;
        const h = calculateHours(w.heureDebut, w.heureFin);
        hoursMap.set(w.employe, (hoursMap.get(w.employe) ?? 0) + h);
      }
    }
    const employeeHours: EmployeeHours[] = [...hoursMap.entries()]
      .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10, overtime: hours > 40 }))
      .sort((a, b) => b.hours - a.hours);

    // --- FILTERED RAPPORTS ---
    let filteredRapports: RapportRow[];
    switch (filter) {
      case 'aujourdhui':
        filteredRapports = todayRapports;
        break;
      case 'semaine':
        filteredRapports = weekRapports;
        break;
      default:
        filteredRapports = rapports;
    }

    return { todayStats, weeklyKPIs, alerts, projectCards, employeeHours, filteredRapports };
  }, [rapports, today, thisWeek.start, thisWeek.end, lastWeek.start, lastWeek.end, monthStart, filter]);

  return {
    rapports,
    photos,
    ...computed,
    weekLabel,
    filter,
    setFilter,
    loading,
    error,
    refresh: fetchData,
  };
};
