import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Service role client — server-side only, bypasses RLS.
// NEVER import this in client components or pages.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
