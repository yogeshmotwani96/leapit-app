-- CLEANUP: Dropping old forensic tables to start fresh
DROP TABLE IF EXISTS public.activity_logs;
DROP TABLE IF EXISTS public.user_videos;

-- Optional: Reset onboarding status if you've already added it
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS has_setup_tracking;
