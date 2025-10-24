-- ============================================================================
-- SIMPLIFIED DATABASE MIGRATION - TYLKO NIEZBĘDNE KOLUMNY
-- Skopiuj i wklej do Supabase SQL Editor, kliknij RUN
-- ============================================================================

-- KROK 1: Dodaj kolumnę expected_completion_date do tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS expected_completion_date DATE;

-- KROK 2: Dodaj kolumnę project_type do projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'commercial';

-- KROK 3: Dodaj kolumnę project_image_url do projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_image_url TEXT;

-- KROK 4: Dodaj indeks dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_tasks_expected_completion_date
ON tasks(expected_completion_date);

-- ============================================================================
-- WERYFIKACJA - uruchom to zapytanie aby sprawdzić czy działa:
-- ============================================================================

-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'tasks' AND column_name = 'expected_completion_date';

-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'projects' AND column_name IN ('project_type', 'project_image_url');

-- ============================================================================
-- GOTOWE! Teraz odśwież aplikację (Ctrl+F5)
-- ============================================================================
