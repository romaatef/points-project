"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { createClient } from "@/lib/supabase/client";
import { fetchChildren } from "@/lib/data";
import { throwSupabaseError } from "@/lib/supabase/errors";
import type { Child } from "@/lib/types";
import { arabicError, formatDate, uniqueSorted } from "@/lib/utils";

const emptyForm = {
  name: "",
  group_name: "",
  stage: "",
  image_url: "",
};

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [stage, setStage] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Child | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setChildren(await fetchChildren());
    } catch (err) {
      setError(arabicError(err instanceof Error ? err.message : "تعذر تحميل الأطفال"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const groups = uniqueSorted(children.map((c) => c.group_name));
  const stages = uniqueSorted(children.map((c) => c.stage));

  const filtered = useMemo(() => {
    return children.filter((c) => {
      const matchQuery = !query || c.name.includes(query.trim());
      const matchGroup = !group || c.group_name === group;
      const matchStage = !stage || c.stage === stage;
      return matchQuery && matchGroup && matchStage;
    });
  }, [children, query, group, stage]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setOpen(true);
  }

  function openEdit(child: Child) {
    setEditing(child);
    setForm({
      name: child.name,
      group_name: child.group_name,
      stage: child.stage,
      image_url: child.image_url || "",
    });
    setFile(null);
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim() || !form.group_name.trim() || !form.stage.trim()) {
      toast.error("الاسم والمجموعة والمرحلة مطلوبة");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        name: form.name.trim(),
        group_name: form.group_name.trim(),
        stage: form.stage.trim(),
      };
      if (editing) {
        const { error: updateError } = await supabase
          .from("children")
          .update(payload)
          .eq("id", editing.id);
        if (updateError) throwSupabaseError(updateError, "update child");
        toast.success("تم تعديل بيانات الطفل");
      } else {
        const { error: insertError } = await supabase.from("children").insert(payload);
        if (insertError) throwSupabaseError(insertError, "insert child");
        toast.success("تمت إضافة الطفل");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(arabicError(err instanceof Error ? err.message : "تعذر حفظ الطفل"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(child: Child) {
    if (!confirm(`هل تريد حذف ${child.name}؟`)) return;
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("children").delete().eq("id", child.id);
      if (deleteError) throwSupabaseError(deleteError, "delete child");
      toast.success("تم حذف الطفل");
      await load();
    } catch (err) {
      toast.error(arabicError(err instanceof Error ? err.message : "تعذر حذف الطفل"));
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="إدارة الأطفال"
        subtitle="إضافة وتعديل وبحث وفلترة الأطفال"
        actions={
          <button className="gold-btn" onClick={openCreate}>
            إضافة طفل
          </button>
        }
      />
      <div className="card p-4 mb-4 grid gap-3 md:grid-cols-3">
        <input
          className="field"
          placeholder="بحث باسم الطفل"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="field" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">كل المجموعات</option>
          {groups.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select className="field" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">كل المراحل</option>
          {stages.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="لا يوجد أطفال" description="أضف طفلًا أو عدّل البحث والفلاتر." />
      ) : (
        <div className="card overflow-auto">
          <table className="w-full min-w-[720px] text-right">
            <thead className="bg-cream text-navy">
              <tr>
                {["الصورة", "الاسم", "المجموعة", "المرحلة", "النقاط", "مرات القراءة", "تاريخ الإضافة", ""].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 font-extrabold">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((child) => (
                <tr key={child.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    {child.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={child.image_url}
                        alt={child.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-cream grid place-items-center font-extrabold text-navy">
                        {child.name.slice(0, 1)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold">{child.name}</td>
                  <td className="px-4 py-3">{child.group_name}</td>
                  <td className="px-4 py-3">{child.stage}</td>
                  <td className="px-4 py-3 font-extrabold text-gold">{child.total_points}</td>
                  <td className="px-4 py-3">{child.reading_count}</td>
                  <td className="px-4 py-3">{formatDate(child.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button className="ghost-btn py-2" onClick={() => openEdit(child)}>
                        تعديل
                      </button>
                      <button className="ghost-btn py-2 text-danger" onClick={() => remove(child)}>
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

      <Modal
        open={open}
        title={editing ? "تعديل طفل" : "إضافة طفل"}
        onClose={() => setOpen(false)}
      >
        <div className="space-y-4">
          <input
            className="field"
            placeholder="اسم الطفل"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="field"
            placeholder="المجموعة"
            value={form.group_name}
            onChange={(e) => setForm({ ...form, group_name: e.target.value })}
          />
          <input
            className="field"
            placeholder="المرحلة"
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value })}
          />
          <input
            className="field"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button className="gold-btn w-full" disabled={saving} onClick={save}>
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
