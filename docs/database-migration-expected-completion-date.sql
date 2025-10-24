-- Migration: Add expected_completion_date column to tasks table
-- Description: Adds a deadline/expected completion date field for tasks
-- Date: 2025-10-24

-- Add expected_completion_date column to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS expected_completion_date DATE;

-- Add comment to document the column
COMMENT ON COLUMN tasks.expected_completion_date IS 'Target deadline/expected completion date for the task set by admin/coordinator';

-- Optional: Add index for performance if you'll be querying by this date often
CREATE INDEX IF NOT EXISTS idx_tasks_expected_completion_date
ON tasks(expected_completion_date);

-- Optional: Add check constraint to ensure expected_completion_date is not before start_date
ALTER TABLE tasks
ADD CONSTRAINT check_expected_completion_after_start
CHECK (expected_completion_date IS NULL OR start_date IS NULL OR expected_completion_date >= start_date);
