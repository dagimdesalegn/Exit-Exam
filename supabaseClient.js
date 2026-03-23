import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Use Vercel environment variables for frontend config
const SUPABASE_URL = window.env?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.env?.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase environment variables are not set. Check your deployment config.");
  }

  export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
            autoRefreshToken: true,
                detectSessionInUrl: true,
                    multiTab: false,
                      },
                      });
                      