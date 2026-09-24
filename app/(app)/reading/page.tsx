"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import {
  awardActivityPoints,
  fetchTodayActivityChildIds,
  fetchActivities,
  fetchChildren,
  fetchTodayReadings,
  registerDailyReading,
} from "@/lib/data";
import type { Activity, Child, DailyReading } from "@/lib/types";
import { arabicError, cairoToday, formatDate, uniqueSorted } from "@/lib/utils";

type TodayReading = Pick<DailyReading, "id" | "child_id" | "reading_date" | "points">;

export default function ReadingPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todayIds, setTodayIds] = useState<string[]>([]);
  const [todayActivityIds, setTodayActivityIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [readingPoints, setReadingPoints] = useState(5);
  const [selectedActivityId, setSelectedActivityId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [kids, readings, acts] = await Promise.all([
        fetchChildren(),
        fetchTodayReadings(),
        fetchActivities(),
      ]);
      setChildren(kids);
      setTodayIds(readings.map((r: TodayReading) => r.child_id));
      setActivities(acts as Activity[]);
    } catch (err) {
      setError(arabicError(err instanceof Error ? err.message : "تعذر تحميل صفحة القراءة"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedActivityId) {
      setTodayActivityIds([]);
      return;
    }
    fetchTodayActivityChildIds(selectedActivityId)
      .then(setTodayActivityIds)
      .catch((err) => {
        setError(arabicError(err instanceof Error ? err.message : "تعذر تحميل نشاط اليوم"));
      });
  }, [selectedActivityId]);

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
  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId);
  const isReadingMode = !selectedActivityId;

  async function registerOne(id: string) {
    setBusy(id);
    try {
      const result = isReadingMode
        ? await registerDailyReading(id)
        : await awardActivityPoints(id, selectedActivityId);
      const points = result.points;
      toast.success(isReadingMode ? "✓ تم تسجيل القراءة" : "✓ تمت إضافة النقاط");
      if (isReadingMode) setTodayIds((prev) => [...prev, id]);
      else setTodayActivityIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setChildren((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                total_points: c.total_points + points,
                reading_count: c.reading_count + (isReadingMode ? 1 : 0),
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
    const ids = isReadingMode ? selected.filter((id) => !todayIds.includes(id)) : selected;
    if (!ids.length) {
      toast.error(isReadingMode ? "اختر أطفالًا لم يُسجلوا بعد" : "اختر أطفالًا لإضافة النقاط لهم");
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
        <select
          className="field"
          value={selectedActivityId}
          onChange={(e) => {
            setSelectedActivityId(e.target.value);
            setSelected([]);
          }}
          aria-label="نوع النقاط"
        >
          <option value="">القراءة اليومية (+{readingPoints})</option>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.name} (+{activity.points})
            </option>
          ))}
        </select>
        <select className="field" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">كل المجموعات</option>
          {groups.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 card p-4 font-bold text-navy">
        {isReadingMode
          ? `لم يسجلوا اليوم: ${missing.length} من ${filtered.length}`
          : `النشاط المختار: ${selectedActivity?.name ?? ""} (+${selectedActivity?.points ?? 0})`}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="لا يوجد أطفال" />
      ) : (
        <div className="grid gap-3">
          {filtered.map((child) => {
            const done = isReadingMode
              ? todayIds.includes(child.id)
              : todayActivityIds.includes(child.id);
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
                      : isReadingMode
                        ? `تسجيل القراءة +${readingPoints}`
                        : `إضافة نقاط +${selectedActivity?.points ?? 0}`}
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
