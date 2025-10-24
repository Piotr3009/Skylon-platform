-- ============================================================================
-- COMPLETE DATABASE MIGRATION FOR SKYLON PLATFORM
-- Copy and paste this entire file into Supabase SQL Editor and click RUN
-- ============================================================================

-- 1. Add expected_completion_date to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS expected_completion_date DATE;

COMMENT ON COLUMN tasks.expected_completion_date IS 'Target deadline for task completion';

CREATE INDEX IF NOT EXISTS idx_tasks_expected_completion_date
ON tasks(expected_completion_date);

-- 2. Add project_type to projects table (if not exists)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_type TEXT DEFAULT 'commercial';

-- 3. Add project_image_url to projects table (if not exists)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS project_image_url TEXT;

COMMENT ON COLUMN projects.project_image_url IS 'URL to project logo or main image';

-- 4. Add check constraint for project_type
DO $$
BEGIN
    ALTER TABLE projects
    DROP CONSTRAINT IF EXISTS check_project_type;

    ALTER TABLE projects
    ADD CONSTRAINT check_project_type
    CHECK (project_type IN ('commercial', 'domestic', 'restaurant', 'other'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 5. Create task_photos table for subcontractor uploads
CREATE TABLE IF NOT EXISTS task_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_photos_task ON task_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_uploader ON task_photos(uploaded_by);

-- 6. Verify task_ratings table exists (for ratings 1-10)
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

CREATE INDEX IF NOT EXISTS idx_task_ratings_subcontractor ON task_ratings(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_task_ratings_task ON task_ratings(task_id);

-- 7. Verify task_documents table exists
CREATE TABLE IF NOT EXISTS task_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_documents_task ON task_documents(task_id);

-- 8. Add RLS policies for task_photos
ALTER TABLE task_photos ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view photos
DROP POLICY IF EXISTS "Anyone can view task photos" ON task_photos;
CREATE POLICY "Anyone can view task photos"
ON task_photos FOR SELECT
USING (true);

-- Allow authenticated users to upload photos
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON task_photos;
CREATE POLICY "Authenticated users can upload photos"
ON task_photos FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

-- Allow users to delete their own photos
DROP POLICY IF EXISTS "Users can delete own photos" ON task_photos;
CREATE POLICY "Users can delete own photos"
ON task_photos FOR DELETE
USING (auth.uid() = uploaded_by);

-- ============================================================================
-- VERIFICATION QUERIES (optional - run separately to check results)
-- ============================================================================

-- Check tasks columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'tasks'
--   AND column_name IN ('expected_completion_date', 'start_date', 'end_date');

-- Check projects columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'projects'
--   AND column_name IN ('project_type', 'project_image_url', 'gantt_image_url');

-- Check task_photos table
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'task_photos';

-- ============================================================================
-- DONE! Migration complete.
-- Refresh your application (Ctrl+F5) and try adding a new task with deadline.
-- ============================================================================
