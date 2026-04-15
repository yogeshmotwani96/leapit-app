import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (supabaseUrl.includes('placeholder')) {
  console.warn('⚠️ [Supabase] VITE_SUPABASE_URL is missing or using placeholder.');
}
if (supabaseAnonKey.includes('placeholder')) {
  console.warn('⚠️ [Supabase] VITE_SUPABASE_ANON_KEY is missing or using placeholder.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
