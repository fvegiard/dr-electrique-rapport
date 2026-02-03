-- Migration: Add versioning support to rapports
-- Date: 2026-02-02
-- Description: Adds updated_at tracking and rapport_versions table for audit trail

-- Step 1: Add versioning columns to rapports table
ALTER TABLE rapports 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS current_version INT DEFAULT 1;

-- Step 2: Create index for foreman report lookup (mes-rapports page)
CREATE INDEX IF NOT EXISTS idx_rapports_redacteur_date 
  ON rapports(redacteur, date DESC);

-- Step 3: Create rapport_versions table for audit trail
CREATE TABLE IF NOT EXISTS rapport_versions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rapport_id      UUID NOT NULL REFERENCES rapports(id) ON DELETE CASCADE,
  version         INT NOT NULL,
  modifie_par     TEXT NOT NULL,
  donnees         JSONB NOT NULL,
  photo_ids       UUID[] DEFAULT '{}',
  note_modification TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rapport_id, version)
);

-- Step 4: Create index for version history lookup
CREATE INDEX IF NOT EXISTS idx_versions_lookup 
  ON rapport_versions(rapport_id, version DESC);

-- Step 5: Create trigger to auto-update updated_at on rapports
CREATE OR REPLACE FUNCTION update_rapport_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.current_version = COALESCE(NEW.current_version, 1) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trg_rapport_updated ON rapports;
CREATE TRIGGER trg_rapport_updated
  BEFORE UPDATE ON rapports
  FOR EACH ROW
  EXECUTE FUNCTION update_rapport_timestamp();

-- Step 6: Enable RLS on rapport_versions
ALTER TABLE rapport_versions ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS policies for rapport_versions
-- Allow anonymous insert (for creating versions)
CREATE POLICY "Allow anonymous insert versions" 
  ON rapport_versions FOR INSERT TO anon 
  WITH CHECK (true);

-- Allow public read (for viewing history)
CREATE POLICY "Allow public read versions" 
  ON rapport_versions FOR SELECT TO public 
  USING (true);

-- Step 8: Grant permissions
GRANT SELECT, INSERT ON rapport_versions TO anon;
GRANT SELECT, INSERT ON rapport_versions TO authenticated;
