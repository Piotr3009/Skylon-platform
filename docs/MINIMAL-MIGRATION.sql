-- ============================================================================
-- MINIMALNA MIGRACJA - TYLKO BRAKUJĄCA KOLUMNA
-- Skopiuj i wklej do Supabase SQL Editor, kliknij RUN
-- ============================================================================

-- Dodaj kolumnę expected_completion_date do tasks
-- (wszystkie inne kolumny i tabele już istnieją w bazie!)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS expected_completion_date DATE;

-- Dodaj komentarz opisujący pole
COMMENT ON COLUMN tasks.expected_completion_date IS 'Target deadline/expected completion date set by admin/coordinator';

-- Dodaj indeks dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_tasks_expected_completion_date
ON tasks(expected_completion_date);

-- ============================================================================
-- WERYFIKACJA - uruchom to aby sprawdzić czy działa:
-- ============================================================================

-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'tasks'
-- AND column_name = 'expected_completion_date';

-- Powinno zwrócić:
-- expected_completion_date | date | YES

-- ============================================================================
-- GOTOWE! Odśwież aplikację (Ctrl+F5) i spróbuj dodać zadanie z deadline
-- ============================================================================
