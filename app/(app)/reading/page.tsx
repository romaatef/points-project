"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { fetchChildren, fetchTodayReadings, registerDailyReading } from "@/lib/data";
import type { Child, DailyReading } from "@/lib/types";
import { arabicError, cairoToday, formatDate, uniqueSorted } from "@/lib/utils";

type TodayReading = Pick<DailyReading, "id" | "child_id" | "reading_date" | "points">;

export default function ReadingPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [todayIds, setTodayIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [readingPoints, setReadingPoints] = useState(5);

  async function load() {
    setLoading(true);
    try {
      const [kids, readings] = await Promise.all([
        fetchChildren(),
        fetchTodayReadings(),
      ]);
      setChildren(kids);
      setTodayIds(readings.map((r: TodayReading) => r.child_id));
    } catch (err) {
      setError(arabicError(err instanceof Error ? err.message : "تعذر تحميل صفحة القراءة"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const groups = uniqueSorted(children.map((c) => c.group_name));
  const filtered = useMemo(
    () =>
      children.filter(
        (c) =>
          (!query || c.name.includes(query.trim())) && (!group || c.group_name === group)
      ),
    [children, query, group]
  );
  const missing = filtered.filter((c) => !todayIds.includes(c.id));

  async function registerOne(id: string) {
    setBusy(id);
    try {
      const result = await registerDailyReading(id);
      const points = result.points;
      toast.success("✓ تم التسجيل");
      setTodayIds((prev) => [...prev, id]);
      setChildren((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                total_points: c.total_points + points,
                reading_count: c.reading_count + 1,
              }
            : c
        )
      );
    } catch (err) {
      toast.error(arabicError(err instanceof Error ? err.message : "تعذر تسجيل القراءة"));
    } finally {
      setBusy(null);
    }
  }

  async function registerMany() {
    const ids = selected.filter((id) => !todayIds.includes(id));
    if (!ids.length) {
      toast.error("اختر أطفالًا لم يُسجلوا بعد");
      return;
    }
    for (const id of ids) {
      await registerOne(id);
    }
    setSelected([]);
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="تسجيل القراءة اليومية"
        subtitle={`تاريخ اليوم: ${formatDate(cairoToday())} — لا يمكن تكرار التسجيل لنفس الطفل في نفس اليوم`}
        actions={
          <button className="gold-btn" onClick={registerMany} disabled={!selected.length}>
            تسجيل المحددين ({selected.length})
          </button>
        }
      />

      <div className="card p-4 mb-4 grid gap-3 md:grid-cols-2">
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
      </div>

      <div className="mb-4 card p-4 font-bold text-navy">
        لم يسجلوا اليوم: {missing.length} من {filtered.length}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="لا يوجد أطفال" />
      ) : (
        <div className="grid gap-3">
          {filtered.map((child) => {
            const done = todayIds.includes(child.id);
            return (
              <div key={child.id} className="card p-4 flex flex-wrap items-center gap-3 justify-between">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    disabled={done}
                    checked={selected.includes(child.id)}
                    onChange={() => toggle(child.id)}
                  />
                  <div>
                    <p className="font-extrabold text-navy">{child.name}</p>
                    <p className="text-muted text-sm">
                      {child.group_name} • {child.stage}
                    </p>
                  </div>
                </label>
                {done ? (
                  <span className="font-extrabold text-success">✓ تم التسجيل</span>
                ) : (
                  <button
                    className="gold-btn"
                    disabled={busy === child.id}
                    onClick={() => registerOne(child.id)}
                  >
                    {busy === child.id
                      ? "جاري التسجيل..."
                      : `تسجيل القراءة +${readingPoints}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
