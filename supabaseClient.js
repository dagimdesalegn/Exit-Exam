import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

if (!SUPABASE_URL || SUPABASE_URL.includes("YOUR_PROJECT_ID")) {
  console.warn("Set SUPABASE_URL and SUPABASE_ANON_KEY in config.js");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    multiTab: false,
  },
});
