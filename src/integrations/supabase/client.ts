import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_PUBLISHABLE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ""
).trim();

const missingVars: string[] = [];
if (!SUPABASE_URL) missingVars.push("VITE_SUPABASE_URL");
if (!SUPABASE_PUBLISHABLE_KEY) missingVars.push("VITE_SUPABASE_PUBLISHABLE_KEY");

if (missingVars.length > 0) {
  const errorMsg = `Missing environment variable:\n${missingVars.join("\n")}`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
