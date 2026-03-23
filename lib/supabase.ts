import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
