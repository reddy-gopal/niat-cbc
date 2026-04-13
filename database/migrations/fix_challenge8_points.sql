-- Ensure challenge 8 accepted submissions always use 3 points.
UPDATE public.submissions
SET points = 3
WHERE task_id = 8
  AND status = 'accepted'
  AND points <> 3;

UPDATE public.submission_attempts
SET points = 3
WHERE task_id = 8
  AND status = 'accepted'
  AND points <> 3;
