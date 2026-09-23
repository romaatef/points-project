import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function cairoToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  }
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ar")
  );
}

export function arabicError(message: string) {
  const map: Record<string, string> = {
    "Invalid login credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    "Email not confirmed": "البريد الإلكتروني غير مؤكد بعد",
    "User already registered": "هذا المستخدم مسجّل بالفعل",
  };
  if (map[message]) return map[message];
  if (message.includes("تم تسجيل القراءة")) return message;
  if (message.toLowerCase().includes("duplicate") || message.includes("unique")) {
    return "هذه البيانات موجودة بالفعل";
  }
  return message || "حدث خطأ غير متوقع";
}
