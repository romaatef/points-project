import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("إعدادات Supabase ناقصة. أضف المفاتيح في ملف .env.local");
  }

  browserClient ??= createBrowserClient(url, key);
  return browserClient;
}
