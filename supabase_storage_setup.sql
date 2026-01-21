-- ============== SUPABASE STORAGE SETUP - DR ÉLECTRIQUE ==============
-- Exécuter dans Supabase SQL Editor (Dashboard > SQL Editor)
-- Crée le bucket pour stocker les photos de rapport

-- 1. Créer le bucket pour les photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rapport-photos',
  'rapport-photos', 
  true,  -- Public pour accès facile aux URLs
  5242880,  -- 5MB max par fichier
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Policy: Permettre upload anonyme (pour l'app mobile)
CREATE POLICY "Allow anonymous uploads"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'rapport-photos');

-- 3. Policy: Permettre lecture publique
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'rapport-photos');

-- 4. Policy: Permettre suppression par les utilisateurs authentifiés
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'rapport-photos');

-- 5. Ajouter colonnes photos à la table rapports si pas déjà présentes
ALTER TABLE rapports 
ADD COLUMN IF NOT EXISTS photos_generales JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS photos_avant JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS photos_apres JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS photos_problemes JSONB DEFAULT '[]'::jsonb;

-- 6. Index pour recherche par projet
CREATE INDEX IF NOT EXISTS idx_rapports_projet ON rapports(projet);
CREATE INDEX IF NOT EXISTS idx_rapports_date ON rapports(date DESC);

-- 7. Fonction pour nettoyer les vieilles photos (optionnel - après 90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_photos()
RETURNS void AS $$
BEGIN
  -- Supprime les fichiers de plus de 90 jours dans le bucket
  DELETE FROM storage.objects
  WHERE bucket_id = 'rapport-photos'
  AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 8. Vérification
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'rapport-photos';
