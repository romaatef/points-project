import type { PostgrestError } from "@supabase/supabase-js";

export function throwSupabaseError(error: PostgrestError, context: string): never {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[Supabase] ${context}`, {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }
  throw error;
}
