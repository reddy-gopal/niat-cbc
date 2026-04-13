-- Prevent duplicate (student_id, task_id) rows for one-time tasks.
-- Exclude task 5 (repeatable referral) and task 9 (streak challenge).
CREATE UNIQUE INDEX IF NOT EXISTS unique_student_task
ON public.submissions (student_id, task_id)
WHERE streak_day IS NULL AND task_id <> 5;

-- Also add constraint-equivalent uniqueness for task 9 streak rows
CREATE UNIQUE INDEX IF NOT EXISTS unique_student_task_streak
ON public.submissions (student_id, task_id, streak_day)
WHERE streak_day IS NOT NULL;
