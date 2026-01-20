import { Employee, Project } from '../types';

export const EMPLOYES: Employee[] = [
  { id: 1, nom: 'Maxime Robert', role: 'Contremaitre' },
  { id: 2, nom: 'Martin B.', role: 'Ajoute' },
  { id: 3, nom: 'Patrick R.', role: 'Ajoute' },
  { id: 4, nom: 'Nathael', role: 'Ajoute' },
  { id: 5, nom: 'Benjamin M.', role: 'Ajoute' },
  { id: 6, nom: 'Jonathan F.', role: 'Ajoute' },
  { id: 7, nom: 'Ahmad', role: 'Ajoute' },
  { id: 8, nom: 'Vincent Tibeault', role: 'Ajoute' },
];

export const WORKERS_NAMES: string[] = EMPLOYES.map(e => e.nom);

export const PROJETS: Project[] = [
  { id: 'PRJ-001', nom: 'Alexis Nihon', client: 'Cominar' },
  { id: 'PRJ-002', nom: 'Electric Kahnawake', client: 'MCK' },
  { id: 'PRJ-003', nom: 'Fairview Pointe-Claire', client: 'Cadillac Fairview' },
  { id: 'PRJ-004', nom: 'Data Center MTL-01', client: 'SIP Électrique' },
  { id: 'PRJ-005', nom: 'Tour des Canadiens 4', client: 'Canderel' },
];

export const MATERIAUX_COMMUNS: string[] = [
  'Fil 14/2 NMD',
  'Fil 12/2 NMD',
  'Fil 10/3 NMD',
  'Câble TECK 3C #10',
  'Boîte 4x4',
  'Boîte octogonale',
  'Conduit EMT 3/4"',
  'Conduit EMT 1"',
  'Connecteur EMT 3/4"',
  'Disjoncteur 15A',
  'Disjoncteur 20A',
  'Disjoncteur 30A 2P',
  'Prise 15A',
  'Prise 20A',
  'Prise GFCI',
  'Interrupteur simple',
  'Interrupteur 3-way',
  'Luminaire LED 2x4',
  'Luminaire LED 1x4',
  'Pot light 4"',
  'Pot light 6"',
  'Panneau 100A',
  'Panneau 200A',
  'Barre de mise à terre',
  'Câble Teck 4C #8',
  'Conduit rigide 1"',
  'Connecteur étanche',
  'Boîte de jonction 6x6',
  'Fil THHN #12',
  'Fil THHN #10',
  'Fil THHN #8',
  'Câble AC90 #12',
];

export const SUPABASE_CONFIG = {
  URL: 'https://iawsshgkogntmdzrfjyw.supabase.co',
  // Note: In a real prod env, this should be in .env, but keeping consistent with existing code for now
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlhd3NzaGdrb2dudG1kenJmanl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDkwMDUsImV4cCI6MjA4MzIyNTAwNX0.1BxhI5SWLL5786qsshidOMpTsOrGeNob6xpcKQjI4s4'
};

export const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_drelectrique',
  TEMPLATE_ID: 'template_rapport',
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY', // Placeholder from original code
  BACKUP_EMAIL: 'fvegiard@dreelectrique.com'
};

export const LOCAL_STORAGE_KEY = 'dr_rapports_pending';
