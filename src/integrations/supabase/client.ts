import { createClient } from "@supabase/supabase-js";

// Public values — safe to live in frontend code.
const SUPABASE_URL = "https://tiucewmkpsplbkhxyrxv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lGJwSrkuxCITcKUqrWaDww_wacWhdWW";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
});
