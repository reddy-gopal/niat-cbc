-- Fix video_events table so all 5 event types work
-- Root cause: event_type column may be a restrictive enum missing visit/share/preview/photo_upload

-- 1. If event_type is an enum, convert it to TEXT so any string value is accepted
DO $$
BEGIN
  -- Only alter if the column is NOT already text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_events'
      AND column_name = 'event_type'
      AND data_type != 'text'
  ) THEN
    ALTER TABLE video_events ALTER COLUMN event_type TYPE TEXT;
  END IF;
END $$;

-- 2. Add unique constraint (student_id, event_type) so each student maps to one row per event
--    Enforces dedup at DB level in addition to the API-level check
ALTER TABLE video_events
  DROP CONSTRAINT IF EXISTS video_events_student_event_unique;

ALTER TABLE video_events
  ADD CONSTRAINT video_events_student_event_unique
  UNIQUE (student_id, event_type);
