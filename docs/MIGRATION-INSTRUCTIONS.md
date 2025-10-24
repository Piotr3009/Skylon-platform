# Database Migration Instructions

## Required Database Changes

Po dodaniu nowych funkcji, musisz zaktualizować bazę danych Supabase.

---

## 1. Dodanie kolumny `expected_completion_date` do tabeli `tasks`

### Opcja A: Przez Supabase Dashboard (ZALECANE dla początkujących)

1. Otwórz swój projekt w Supabase Dashboard
2. Przejdź do **Table Editor** → **tasks**
3. Kliknij **"+ Add Column"**
4. Wypełnij:
   - **Name**: `expected_completion_date`
   - **Type**: `date`
   - **Default value**: `NULL`
   - **Is Nullable**: ✅ (zaznacz)
5. Kliknij **Save**

### Opcja B: Przez SQL Editor (dla zaawansowanych)

1. Otwórz Supabase Dashboard → **SQL Editor**
2. Kliknij **"New Query"**
3. Wklej poniższy kod:

```sql
-- Add expected_completion_date column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS expected_completion_date DATE;

-- Add comment
COMMENT ON COLUMN tasks.expected_completion_date IS 'Target deadline/expected completion date for the task';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_expected_completion_date
ON tasks(expected_completion_date);
```

4. Kliknij **Run** (lub Ctrl+Enter)

---

## 2. Sprawdzenie istniejących tabel (opcjonalne)

Upewnij się, że te tabele istnieją w twojej bazie:

### Tabela: `task_ratings`
Dla ocen subcontractorów (1-10)

```sql
CREATE TABLE IF NOT EXISTS task_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  subcontractor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_ratings_subcontractor
ON task_ratings(subcontractor_id);

CREATE INDEX IF NOT EXISTS idx_task_ratings_task
ON task_ratings(task_id);
```

### Tabela: `task_documents`
Dla dokumentów projektowych

```sql
CREATE TABLE IF NOT EXISTS task_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_documents_task
ON task_documents(task_id);
```

### Tabela: `task_photos` (nowa - dla zdjęć subcontractorów)
Dla uploadowanych zdjęć z postępu prac

```sql
CREATE TABLE IF NOT EXISTS task_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  bid_id UUID REFERENCES bids(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_photos_task
ON task_photos(task_id);

CREATE INDEX IF NOT EXISTS idx_task_photos_uploader
ON task_photos(uploaded_by);
```

---

## 3. Dodanie kolumny `project_type` do `projects` (jeśli nie istnieje)

```sql
-- Add project_type column if it doesn't exist
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'commercial';

-- Add check constraint for valid types
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS check_project_type;

ALTER TABLE projects
ADD CONSTRAINT check_project_type
CHECK (project_type IN ('commercial', 'domestic', 'restaurant', 'other'));
```

---

## 4. Dodanie kolumny `project_image_url` do `projects` (jeśli nie istnieje)

```sql
-- Add project_image_url column for project logos/images
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_image_url TEXT;

COMMENT ON COLUMN projects.project_image_url IS 'URL to project logo or main image';
```

---

## 5. Weryfikacja zmian

Po wykonaniu migracji, uruchom to zapytanie aby zweryfikować:

```sql
-- Check tasks table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('expected_completion_date', 'start_date', 'end_date')
ORDER BY column_name;

-- Check projects table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('project_type', 'project_image_url', 'gantt_image_url')
ORDER BY column_name;
```

Powinno zwrócić:
- `expected_completion_date | date | YES`
- `project_type | text | YES`
- `project_image_url | text | YES`

---

## 🔒 Row Level Security (RLS)

Jeśli masz włączone RLS, upewnij się że policies pozwalają na:

```sql
-- Task photos policies (przykład)
CREATE POLICY "Users can view task photos"
ON task_photos FOR SELECT
USING (true);

CREATE POLICY "Subcontractors can upload photos to their tasks"
ON task_photos FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM bids
    WHERE bids.id = task_photos.bid_id
    AND bids.subcontractor_id = auth.uid()
    AND bids.status = 'accepted'
  )
);
```

---

## ✅ Gotowe!

Po wykonaniu tych kroków:
1. Odśwież stronę aplikacji (Ctrl+F5)
2. Spróbuj dodać nowe zadanie z deadline
3. Wszystko powinno działać!

---

## 🆘 Troubleshooting

**Problem**: Nadal błąd "column not found"
- Rozwiązanie: Wyloguj się i zaloguj ponownie (czasami Supabase cache'uje schemat)

**Problem**: "permission denied"
- Rozwiązanie: Sprawdź RLS policies w Supabase Dashboard

**Problem**: Migracja się nie wykonuje
- Rozwiązanie: Sprawdź czy masz uprawnienia admin w projekcie Supabase
