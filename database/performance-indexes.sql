-- Run these in Supabase SQL editor to improve query performance.
-- All are safe with IF NOT EXISTS.

create index if not exists idx_submissions_student_task
  on public.submissions (student_id, task_id);

create index if not exists idx_submissions_status_created
  on public.submissions (status, created_at desc);

create index if not exists idx_submissions_created_at
  on public.submissions (created_at desc);

create index if not exists idx_students_section
  on public.students (section_id);

create index if not exists idx_students_bootcamp
  on public.students (bootcamp_id);

create index if not exists idx_students_region
  on public.students (region_id);

create index if not exists idx_sections_bootcamp
  on public.sections (bootcamp_id);

create index if not exists idx_sections_slug
  on public.sections (slug);

create index if not exists idx_otp_attempts_mobile_created
  on public.otp_attempts (mobile, created_at desc);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);
