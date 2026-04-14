import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
  console.warn('⚠️ [Supabase] Using placeholder credentials. Check your deployment environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
