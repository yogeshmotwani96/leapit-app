-- 1. Create Proof of Presence Table
CREATE TABLE IF NOT EXISTS public.proof_of_presence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_title TEXT,
    photo_url TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.proof_of_presence ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can view their own photos
DROP POLICY IF EXISTS "Users can view own photos" ON public.proof_of_presence;
CREATE POLICY "Users can view own photos" ON public.proof_of_presence
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own photos
DROP POLICY IF EXISTS "Users can insert own photos" ON public.proof_of_presence;
CREATE POLICY "Users can insert own photos" ON public.proof_of_presence
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all photos
DROP POLICY IF EXISTS "Admins can view all photos" ON public.proof_of_presence;
CREATE POLICY "Admins can view all photos" ON public.proof_of_presence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 4. Provide instructions for Storage Bucket (Manual setup often required if no API access)
-- Note: Create a 'proof-of-presence' bucket in Supabase Storage with:
-- - RLS enabled
-- - Policy: "Users can upload to their own folder" (e.g., 'proof-of-presence/user_id/*')
-- - Policy: "Users/Admins can read"
