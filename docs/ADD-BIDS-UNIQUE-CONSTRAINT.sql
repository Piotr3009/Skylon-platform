-- ============================================================================
-- ADD UNIQUE CONSTRAINT TO BIDS TABLE
-- This allows subcontractors to update their existing bids (upsert)
-- ============================================================================

-- Add unique constraint on (task_id, subcontractor_id)
-- This ensures one subcontractor can only have one bid per task
ALTER TABLE bids
DROP CONSTRAINT IF EXISTS unique_bid_per_task_subcontractor;

ALTER TABLE bids
ADD CONSTRAINT unique_bid_per_task_subcontractor
UNIQUE (task_id, subcontractor_id);

-- Add comment to explain the constraint
COMMENT ON CONSTRAINT unique_bid_per_task_subcontractor ON bids IS
'Ensures each subcontractor can only have one bid per task, enabling bid updates via upsert';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify the constraint was created:
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'bids'::regclass;
