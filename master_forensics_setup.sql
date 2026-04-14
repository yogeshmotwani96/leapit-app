-- 1. Create Forensic Monitoring Tables
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    app_name TEXT,
    window_title TEXT,
    duration_seconds INTEGER,
    is_idle BOOLEAN DEFAULT false,
    timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    video_url TEXT,
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add Onboarding Status to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_setup_tracking BOOLEAN DEFAULT false;

-- 3. Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_videos ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Activity Logs: Users see their own, Admins see all
DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_logs;
CREATE POLICY "Users can view own activity" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all activity" ON public.activity_logs;
CREATE POLICY "Admins can view all activity" ON public.activity_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- User Videos: Users upload/view own, Admins see all
DROP POLICY IF EXISTS "Users can manage own videos" ON public.user_videos;
CREATE POLICY "Users can manage own videos" ON public.user_videos
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all videos" ON public.user_videos;
CREATE POLICY "Admins can view all videos" ON public.user_videos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );
