"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { createClient } from "@/lib/supabase/client";
import { throwSupabaseError } from "@/lib/supabase/errors";
import {
  awardActivityPoints,
  deleteDailyReadingRecord,
  deletePointsRecord,
  fetchActivities,
  fetchChildren,
} from "@/lib/data";
import type { Activity, Child, DailyReading, PointsRecord } from "@/lib/types";
import { arabicError, formatDate } from "@/lib/utils";
import { Modal } from "@/components/Modal";

type PointHistoryRow = Pick<
  PointsRecord,
  "id" | "child_id" | "activity_id" | "activity_name" | "points" | "record_date" | "created_at"
>;

export default function HistoryPage() {
  const [records, setRecords] = useState<PointsRecord[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ child_id: "", activity_id: "" });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PointsRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      const supabase = createClient();
      const [kids, acts, recs, readings] = await Promise.all([
        fetchChildren(),
        fetchActivities(),
        supabase
          .from("points_records")
          .select("id, child_id, activity_id, activity_name, points, record_date, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("daily_reading")
          .select("id, child_id, reading_date, points, created_at")
          .order("created_at", { ascending: false }),
      ]);
      if (recs.error) throwSupabaseError(recs.error, "fetch points history");
      if (readings.error) throwSupabaseError(readings.error, "fetch daily reading history");
      const childrenById = new Map(kids.map((child) => [child.id, child]));
      const withChild = (childId: string) => {
        const child = childrenById.get(childId);
        return child ? { name: child.name, group_name: child.group_name } : null;
      };
      const pointRows = (recs.data ?? []).map((record: PointHistoryRow) => ({
        ...record,
        children: withChild(record.child_id),
        source: "points_record" as const,
      }));
      const coveredReadings = new Set(
        pointRows
          .filter((row: PointHistoryRow) => row.activity_name.includes("قراءة"))
          .map((row: PointHistoryRow) => `${row.child_id}|${row.record_date}`)
      );
      const readingRows = ((readings.data ?? []) as DailyReading[])
        .filter((row) => !coveredReadings.has(`${row.child_id}|${row.reading_date}`))
        .map((row) => ({
          id: row.id,
          child_id: row.child_id,
          activity_id: null,
          activity_name: "قراءة الكتاب المقدس اليومية",
          points: row.points,
          record_date: row.reading_date,
          created_at: row.created_at,
          children: withChild(row.child_id),
          source: "daily_reading" as const,
        }));
      setChildren(kids);
      setActivities(acts as Activity[]);
      setRecords(
        [...pointRows, ...readingRows].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ) as PointsRecord[]
      );
    } catch (err) {
      setError(arabicError(err instanceof Error ? err.message : "تعذر تحميل السجل"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        const name = r.children?.name || "";
        return !query || name.includes(query.trim()) || r.activity_name.includes(query.trim());
      }),
    [records, query]
  );

  async function award() {
    if (!form.child_id || !form.activity_id) {
      toast.error("اختر الطفل والنشاط");
      return;
    }
    setSaving(true);
    try {
      await awardActivityPoints(form.child_id, form.activity_id);
      toast.success("تم إضافة النقاط");
      setOpen(false);
      setForm({ child_id: "", activity_id: "" });
      await load();
    } catch (err) {
      toast.error(arabicError(err instanceof Error ? err.message : "تعذر إضافة النقاط"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.source === "daily_reading") {
        await deleteDailyReadingRecord(pendingDelete.id);
      } else {
        await deletePointsRecord(pendingDelete.id);
      }
      toast.success("تم حذف سجل النقاط");
      setPendingDelete(null);
      await load(false);
    } catch (err) {
      toast.error(arabicError(err instanceof Error ? err.message : "تعذر حذف السجل"));
    } finally {
      setDeleting(false);
    }
  }

  function confirmClear() {
    setClearing(true);
    setRecords([]);
    setQuery("");
    toast.success("تم تحديث عرض السجل فقط");
    setClearOpen(false);
    setClearing(false);
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="سجل النقاط"
        subtitle="كل النقاط المسجلة مع القيمة المحفوظة وقت التسجيل"
        actions={
          <>
            <button
              className="ghost-btn text-danger"
              disabled={clearing || records.length === 0}
              onClick={() => setClearOpen(true)}
            >
              تنظيف السجل
            </button>
            <button className="gold-btn" onClick={() => setOpen(true)}>
              إضافة نقاط لنشاط
            </button>
          </>
        }
      />
      <input
        className="field mb-4"
        placeholder="بحث بالاسم أو النشاط"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {filtered.length === 0 ? (
        <EmptyState title="لا توجد سجلات بعد" />
      ) : (
        <div className="card overflow-auto">
          <table className="w-full min-w-[700px] text-right">
            <thead className="bg-cream">
              <tr>
                {["اسم الطفل", "النشاط", "النقاط", "التاريخ", ""].map((h) => (
                  <th key={h || "actions"} className="px-4 py-3 font-extrabold text-navy">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={`${row.source ?? "points_record"}-${row.id}`} className="border-t border-line">
                  <td className="px-4 py-3 font-bold">{row.children?.name || "—"}</td>
                  <td className="px-4 py-3">{row.activity_name}</td>
                  <td className="px-4 py-3 font-extrabold text-gold">{row.points}</td>
                  <td className="px-4 py-3">{formatDate(row.record_date || row.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        className="ghost-btn py-2 text-danger"
                        onClick={() => setPendingDelete(row)}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title="إضافة نقاط" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <select
            className="field"
            value={form.child_id}
            onChange={(e) => setForm({ ...form, child_id: e.target.value })}
          >
            <option value="">اختر الطفل</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={form.activity_id}
            onChange={(e) => setForm({ ...form, activity_id: e.target.value })}
          >
            <option value="">اختر النشاط</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.points})
              </option>
            ))}
          </select>
          <button className="gold-btn w-full" disabled={saving} onClick={award}>
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </Modal>
      <Modal
        open={clearOpen}
        title="تنظيف سجل النقاط"
        onClose={() => !clearing && setClearOpen(false)}
      >
        <div className="space-y-4">
          <p className="text-navy font-bold">هل تريد تنظيف سجل النقاط بالكامل؟</p>
          <p className="text-muted">
            سيتم إخفاء سجلات النقاط من هذه الصفحة فقط. قراءات اليوم وبيانات الأطفال لن تتغير.
          </p>
          <div className="flex gap-2 justify-end">
            <button className="ghost-btn" disabled={clearing} onClick={() => setClearOpen(false)}>
              إلغاء
            </button>
            <button className="navy-btn bg-danger" disabled={clearing} onClick={confirmClear}>
              {clearing ? "جاري التنظيف..." : "تنظيف السجل"}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        open={Boolean(pendingDelete)}
        title="تأكيد الحذف"
        onClose={() => !deleting && setPendingDelete(null)}
      >
        <div className="space-y-4">
          <p className="text-navy font-bold">
            هل تريد حذف سجل {pendingDelete?.activity_name} للطفل{" "}
            {pendingDelete?.children?.name || ""}؟
          </p>
          <p className="text-muted">سيتم تعديل إجمالي النقاط بعد الحذف. لن يتم حذف الطفل أو النشاط.</p>
          <div className="flex gap-2 justify-end">
            <button className="ghost-btn" disabled={deleting} onClick={() => setPendingDelete(null)}>
              إلغاء
            </button>
            <button className="navy-btn bg-danger" disabled={deleting} onClick={confirmDelete}>
              {deleting ? "جاري الحذف..." : "حذف"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
