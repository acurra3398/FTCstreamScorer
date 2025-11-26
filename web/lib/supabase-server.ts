import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client factory (uses service role key if available, falls back to anon key)
export function getServerSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer service role key for server operations, fall back to anon key
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.warn('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    return null;
  }
  
  return createClient(url, key);
}

// Hash password using SHA-256 (Node.js compatible)
export async function hashPasswordServer(password: string): Promise<string> {
  const crypto = await import('crypto');
  const hash = crypto.createHash('sha256').update(password).digest('base64url');
  return hash;
}
