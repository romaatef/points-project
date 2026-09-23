"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { createClient } from "@/lib/supabase/client";
import { throwSupabaseError } from "@/lib/supabase/errors";
import { fetchChildren } from "@/lib/data";
import { downloadChildrenTemplate, markDuplicates, parseChildrenWorkbook } from "@/lib/excel";
import type { Child, ExcelChildRow } from "@/lib/types";
import { arabicError } from "@/lib/utils";

export default function ImportPage() {
  const [existing, setExisting] = useState<Child[]>([]);
  const [rows, setRows] = useState<ExcelChildRow[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setExisting(await fetchChildren());
      } catch (err) {
        setError(arabicError(err instanceof Error ? err.message : "تعذر قراءة الأطفال الحاليين"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const ok = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (!ok) {
      toast.error("ارفع ملف Excel بصيغة xlsx أو xls");
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseChildrenWorkbook(buffer);
      if (!parsed.length) {
        toast.error("الملف فارغ أو الأعمدة غير معروفة");
        return;
      }
      setRows(markDuplicates(parsed, existing));
      toast.success("تم قراءة الملف. راجع المعاينة قبل الحفظ.");
    } catch (err) {
      toast.error(arabicError(err instanceof Error ? err.message : "تعذر قراءة ملف Excel"));
    }
  }

  const valid = rows.filter((r) => r.status === "ok");
  const duplicates = rows.filter((r) => r.status === "duplicate");
  const missing = rows.filter((r) => r.status === "missing");

  async function confirmImport() {
    const toInsert = skipDuplicates
      ? valid
      : rows.filter((r) => r.status === "ok" || r.status === "duplicate");
    const uniqueInsert = skipDuplicates
      ? toInsert
      : toInsert.filter((r) => !r.errors.includes("الطفل موجود بالفعل في قاعدة البيانات"));

    if (missing.length) {
      toast.error("يوجد صفوف ناقصة. أصلح الملف أو احذفها قبل الحفظ.");
      return;
    }
    if (!uniqueInsert.length) {
      toast.error("لا توجد صفوف صالحة للإدخال");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = uniqueInsert.map((r) => ({
        name: r.name,
        group_name: r.group_name,
        stage: r.stage,
      }));
      const { error: insertError } = await supabase.from("children").insert(payload);
      if (insertError) throwSupabaseError(insertError, "import children");
      toast.success(`تم إدخال ${payload.length} طفل إلى قاعدة البيانات`);
      setExisting(await fetchChildren());
      setRows([]);
    } catch (err) {
      toast.error(arabicError(err instanceof Error ? err.message : "تعذر حفظ البيانات"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="استيراد الأطفال من Excel"
        subtitle="الأعمدة المطلوبة: اسم الطفل، المجموعة، المرحلة"
        actions={
          <>
            <button className="ghost-btn" onClick={downloadChildrenTemplate}>
              تحميل النموذج
            </button>
            <label className="gold-btn cursor-pointer">
              رفع Excel
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
          </>
        }
      />

      {!rows.length ? (
        <EmptyState
          title="لم يتم رفع ملف بعد"
          description="حمّل النموذج ثم ارفع ملف Excel لمعاينة البيانات قبل الحفظ في Supabase."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            <div className="card p-4 font-bold">صالح: {valid.length}</div>
            <div className="card p-4 font-bold text-gold">مكرر: {duplicates.length}</div>
            <div className="card p-4 font-bold text-danger">ناقص: {missing.length}</div>
          </div>
          <label className="flex items-center gap-2 mb-4 font-bold">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
            />
            تخطي الأطفال المكررين
          </label>
          <div className="card overflow-auto mb-4">
            <table className="w-full min-w-[760px] text-right">
              <thead className="bg-cream">
                <tr>
                  {["الصف", "اسم الطفل", "المجموعة", "المرحلة", "الحالة", "الأخطاء"].map((h) => (
                    <th key={h} className="px-4 py-3 font-extrabold text-navy">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-line">
                    <td className="px-4 py-3">{row.rowNumber}</td>
                    <td className="px-4 py-3">{row.name || "—"}</td>
                    <td className="px-4 py-3">{row.group_name || "—"}</td>
                    <td className="px-4 py-3">{row.stage || "—"}</td>
                    <td className="px-4 py-3">
                      {row.status === "ok"
                        ? "جاهز"
                        : row.status === "duplicate"
                          ? "مكرر"
                          : "ناقص"}
                    </td>
                    <td className="px-4 py-3 text-danger">{row.errors.join("، ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="gold-btn" disabled={saving} onClick={confirmImport}>
            {saving ? "جاري الإدخال..." : "تأكيد الإدخال إلى قاعدة البيانات"}
          </button>
        </>
      )}
    </div>
  );
}
