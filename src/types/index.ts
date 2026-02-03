export interface Employee {
  id: number;
  nom: string;
  role: string;
}

export interface Project {
  id: string;
  nom: string;
  client: string;
}

export interface GeoLocation {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  enabled: boolean;
  error?: string;
}

export interface PhotoMetadata {
  compressedSize?: number;
  originalSize?: number;
  compressionRatio?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface Photo {
  id: string;
  data?: string;
  preview?: string;
  blob?: Blob;
  storagePath?: string;
  storageUrl?: string;
  timestamp: string;
  category: string;
  filename?: string;
  geolocation?: GeoLocation;
  metadata?: PhotoMetadata;
}

export interface Material {
  id: string;
  item: string;
  quantite: string;
  unite: string;
  detectedByAI?: boolean;
  confidence?: number;
  image?: string; // Preview image for AI detection
  error?: boolean;
}

export interface Worker {
  id: string;
  employe: string;
  heureDebut: string;
  heureFin: string;
  description: string;
}

export interface Equipment {
  id: string;
  nom: string;
  heures: string;
  description: string;
}

export interface Subcontractor {
  id: string;
  entreprise: string;
  nbPersonnes: string;
  heures: string;
  description: string;
}

export interface WorkOrder {
  id: string;
  description: string;
  isExtra: boolean;
  montantExtra: string;
  status: 'en_cours' | 'termine' | 'annule';
}

export interface Meeting {
  id: string;
  type: string;
  participants: string;
  notes: string;
}

export interface DailyReport {
  id?: string;
  projet: string;
  projetNom?: string;
  date: string;
  adresse: string;
  meteo: string;
  temperature: string | number;
  redacteur: string;
  
  // Lists
  mainOeuvre: Worker[];
  materiaux: Material[];
  equipements: Equipment[];
  soustraitants: Subcontractor[];
  ordresTravail: WorkOrder[];
  reunions: Meeting[];
  
  // Photos
  photosGenerales: Photo[];
  photosAvant: Photo[];
  photosApres: Photo[];
  photosProblemes: Photo[];
  
  // Text fields
  evenements?: string;
  problemesSecurite?: string;
  notesGenerales?: string;
  
  // Meta
  totalHeuresMO?: number;
  totalPhotos?: number;
  hasExtras?: boolean;
  nbExtras?: number;
  totalExtras?: number;
  hasGPSPhotos?: boolean;
  submittedAt?: string;
  failedAt?: string;
  errorMsg?: string;
}
