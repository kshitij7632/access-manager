import { createClient } from "@supabase/supabase-js";

// Prefer env vars (production builds) but fall back to the project defaults
// so a fresh clone works out of the box.
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://tiucewmkpsplbkhxyrxv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "sb_publishable_lGJwSrkuxCITcKUqrWaDww_wacWhdWW";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
