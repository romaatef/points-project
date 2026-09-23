"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { arabicError } from "@/lib/utils";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success("تم تسجيل الدخول بنجاح");
      router.replace(searchParams.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(arabicError(err instanceof Error ? err.message : "تعذر تسجيل الدخول"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1c3a57,_#12263a_55%)] flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-20 bg-[url('/logo.png')] bg-center bg-no-repeat bg-[length:420px]" />
      <form
        onSubmit={onSubmit}
        className="card relative z-10 w-full max-w-md p-8 space-y-6"
      >
        <div className="text-center space-y-3">
          <Logo src="/logo.png" size={140} className="mx-auto" />
          <div>
            <h1 className="text-2xl font-extrabold text-navy">أسرة أبونا يسطس الأنطوني 5&amp;6</h1>
            <p className="text-muted mt-1 text-lg font-bold">مسابقة الانطوني</p>
          </div>
        </div>
        <label className="block space-y-2">
          <span className="font-bold text-navy">البريد الإلكتروني</span>
          <input
            className="field"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            autoComplete="email"
            dir="ltr"
          />
        </label>
        <label className="block space-y-2">
          <span className="font-bold text-navy">كلمة المرور</span>
          <div className="relative">
            <input
              className="field pr-12"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              dir="ltr"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-md"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
            </button>
          </div>
        </label>
        <button className="gold-btn w-full" disabled={loading}>
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>
      <p className="absolute bottom-4 z-10 text-sm font-bold text-cream/80">
        made by mariam atef
      </p>
    </main>
  );
}
