"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { createClient } from "@/lib/supabase/client";
import { throwSupabaseError } from "@/lib/supabase/errors";
import { deleteActivity, fetchActivities } from "@/lib/data";
import type { Activity } from "@/lib/types";
import { arabicError } from "@/lib/utils";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", points: "" });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setActivities((await fetchActivities()) as Activity[]);
    } catch (err) {
      setError(arabicError(err instanceof Error ? err.message : "تعذر تحميل الأنشطة"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(activity: Activity) {
    if (activity.points < 0 || Number.isNaN(activity.points)) {
      toast.error("قيمة النقاط غير صحيحة");
      return;
    }
    setSavingId(activity.id);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("activities")
        .update({ points: activity.points })
        .eq("id", activity.id);
      if (updateError) throwSupabaseError(updateError, "update activity");
      toast.success("تم حفظ قيمة النشاط. السجلات القديمة لن تتغير.");
    } catch (err) {
      toast.error(arabicError(err instanceof Error ? err.message : "تعذر حفظ النشاط"));
    } finally {
      setSavingId(null);
    }
  }

  async function addActivity() {
    const name = form.name.trim();
    const points = Number(form.points);
    if (!name || !form.points.trim() || points < 0 || Number.isNaN(points)) {
      toast.error("اسم النشاط وقيمة النقاط مطلوبان");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("activities")
        .insert({ name, points, active: true });
      if (insertError) throwSupabaseError(insertError, "insert activity");
      toast.success("تمت إضافة النشاط");
      setOpen(false);
      setForm({ name: "", points: "" });
      await load();
    } catch (err) {
      toast.error(arabicError(err instanceof Error ? err.message : "تعذر إضافة النشاط"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteActivity(pendingDelete.id);
      toast.success("تم حذف النشاط");
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error(arabicError(err instanceof Error ? err.message : "تعذر حذف النشاط"));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  return (
    <div>
      <PageHeader
        title="الأنشطة والنقاط"
        subtitle="تعديل القيم يؤثر على التسجيلات الجديدة فقط، وليس على السجلات القديمة"
        actions={
          <button className="gold-btn inline-flex items-center gap-2" onClick={() => setOpen(true)}>
            <Plus size={18} aria-hidden="true" />
            إضافة نشاط
          </button>
        }
      />
      {activities.length ? (
        <div className="grid gap-4">
          {activities.map((activity) => (
            <div key={activity.id} className="card p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div>
                <p className="font-extrabold text-navy text-lg">{activity.name}</p>
                <p className="text-muted text-sm">{activity.active ? "نشاط فعال" : "نشاط غير فعال"}</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  className="field w-28"
                  type="number"
                  min={0}
                  value={activity.points}
                  onChange={(e) =>
                    setActivities((prev) =>
                      prev.map((a) =>
                        a.id === activity.id ? { ...a, points: Number(e.target.value) } : a
                      )
                    )
                  }
                />
                <button
                  className="gold-btn"
                  disabled={savingId === activity.id}
                  onClick={() => save(activity)}
                >
                  {savingId === activity.id ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  className="ghost-btn inline-flex items-center gap-2 text-danger"
                  onClick={() => setPendingDelete(activity)}
                  aria-label={`حذف نشاط ${activity.name}`}
                >
                  <Trash2 size={17} aria-hidden="true" />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="لا توجد أنشطة"
          description="أضف نشاطًا جديدًا ليظهر هنا ويمكن تسجيل نقاطه للأطفال."
        />
      )}

      <Modal open={open} title="إضافة نشاط" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <input
            className="field"
            placeholder="اسم النشاط"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="field"
            type="number"
            min={0}
            placeholder="عدد النقاط"
            value={form.points}
            onChange={(e) => setForm({ ...form, points: e.target.value })}
          />
          <button className="gold-btn w-full" disabled={saving} onClick={addActivity}>
            {saving ? "جاري الحفظ..." : "حفظ النشاط"}
          </button>
        </div>
      </Modal>
      <Modal
        open={Boolean(pendingDelete)}
        title="تأكيد حذف النشاط"
        onClose={() => !deleting && setPendingDelete(null)}
      >
        <div className="space-y-4">
          <p className="text-navy font-bold">
            هل تريد حذف نشاط {pendingDelete?.name}؟
          </p>
          <p className="text-muted">السجلات القديمة الخاصة بهذا النشاط لن يتم حذفها.</p>
          <div className="flex gap-2 justify-end">
            <button className="ghost-btn" disabled={deleting} onClick={() => setPendingDelete(null)}>
              إلغاء
            </button>
            <button className="navy-btn bg-danger" disabled={deleting} onClick={confirmDelete}>
              {deleting ? "جاري الحذف..." : "حذف النشاط"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
