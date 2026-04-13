-- Allow repeatable task 5 rows while preserving one-time constraints for others.
DROP INDEX IF EXISTS public.unique_student_task;

CREATE UNIQUE INDEX IF NOT EXISTS unique_student_task
ON public.submissions (student_id, task_id)
WHERE streak_day IS NULL AND task_id <> 5;
