"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Medal,
  Menu,
  NotebookPen,
  Settings2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/children", label: "المخدومين", icon: Users },
  { href: "/reading", label: "تسجيل القراءة", icon: BookOpen },
  { href: "/history", label: "سجل النقاط", icon: NotebookPen },
  { href: "/leaderboard", label: "الترتيب", icon: Medal },
  { href: "/activities", label: "الأنشطة والنقاط", icon: Settings2 },
  { href: "/import", label: "استيراد Excel", icon: Upload },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    router.replace("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition",
              active
                ? "bg-gold text-navy"
                : "text-cream/85 hover:bg-white/10"
            )}
          >
            <Icon size={18} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden lg:flex flex-col bg-navy text-cream p-6 sticky top-0 h-screen">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo src="/logo.png" size={52} className="rounded-full" />
          <p className="mt-3 font-extrabold text-gold-soft">أسرة الأنطوني</p>
        </div>
        <div className="flex-1">{nav}</div>
        <p className="mb-3 text-center text-xs font-bold text-cream/60">made by mariam atef</p>
        <button onClick={logout} className="ghost-btn border-white/20 !text-cream flex items-center justify-center gap-2 px-4 py-3 font-bold">
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </aside>

      <div className="min-h-screen">
        <header className="lg:hidden sticky top-0 z-30 bg-navy text-cream px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo src="/logo.png" size={40} />
            <span className="font-extrabold">نقاط الأطفال</span>
          </div>
          <button onClick={() => setOpen((v) => !v)} className="p-2">
            {open ? <X /> : <Menu />}
          </button>
        </header>
        {open && (
          <div className="lg:hidden bg-navy text-cream p-4 space-y-4">
            {nav}
            <p className="text-center text-xs font-bold text-cream/60">made by mariam atef</p>
            <button onClick={logout} className="ghost-btn w-full border-white/20 !text-cream px-4 py-3 font-bold">
              تسجيل الخروج
            </button>
          </div>
        )}
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
