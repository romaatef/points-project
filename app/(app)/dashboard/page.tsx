"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import {
  fetchChildren,
  fetchTodayParticipationChildIds,
  fetchTodayParticipationSummary,
  fetchTodayReadings,
} from "@/lib/data";
import type { Child, DailyReading } from "@/lib/types";
import { arabicError, cairoToday, formatDate } from "@/lib/utils";

type TodayReading = Pick<DailyReading, "id" | "child_id" | "reading_date" | "points">;

export default function DashboardPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [todayIds, setTodayIds] = useState<string[]>([]);
  const [todayParticipationIds, setTodayParticipationIds] = useState<string[]>([]);
  const [todayParticipation, setTodayParticipation] = useState({ count: 0, points: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [kids, readings, participation, participationIds] = await Promise.all([
          fetchChildren(),
          fetchTodayReadings(),
          fetchTodayParticipationSummary(),
          fetchTodayParticipationChildIds(),
        ]);
        setChildren(kids);
        setTodayIds(readings.map((r: TodayReading) => r.child_id));
        setTodayParticipationIds(participationIds);
        setTodayParticipation(participation);
      } catch (err) {
        setError(arabicError(err instanceof Error ? err.message : "تعذر تحميل اللوحة"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const missing = useMemo(
    () => children.filter((c) => !todayIds.includes(c.id)),
    [children, todayIds]
  );
  const missingParticipation = useMemo(
    () => children.filter((c) => !todayParticipationIds.includes(c.id)),
    [children, todayParticipationIds]
  );
  const totalPoints = children.reduce((sum, c) => sum + (c.total_points || 0), 0);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const stats = [
    { label: "إجمالي الأطفال", value: children.length },
    { label: "إجمالي النقاط", value: totalPoints },
    { label: "قراءات اليوم", value: todayIds.length },
    { label: "مشاركات اليوم", value: todayParticipation.count },
    { label: "نقاط المشاركات اليوم", value: todayParticipation.points },
    { label: "لم يسجلوا قراءة اليوم", value: missing.length },
    { label: "لم يسجلوا مشاركة اليوم", value: missingParticipation.length },
  ];

  return (
    <div>
      <PageHeader
        title="لوحة التحكم"
        subtitle={`ملخص الخدمة لتاريخ ${formatDate(cairoToday())}`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <p className="text-muted font-bold">{stat.label}</p>
            <p className="text-3xl font-extrabold text-navy mt-2">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {missing.length === 0 ? (
          <EmptyState title="أحسنت" description="كل الأطفال سجلوا قراءة اليوم." />
        ) : (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-extrabold text-navy">أطفال لم يسجلوا قراءة اليوم</h2>
            </div>
            <ul className="divide-y divide-line">
              {missing.slice(0, 12).map((child) => (
                <li key={child.id} className="px-5 py-3 flex justify-between gap-3">
                  <span className="font-bold">{child.name}</span>
                  <span className="text-muted">
                    {child.group_name} • {child.stage}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {missingParticipation.length === 0 ? (
          <EmptyState title="أحسنت" description="كل الأطفال سجلوا مشاركة اليوم." />
        ) : (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-extrabold text-navy">أطفال لم يسجلوا مشاركة اليوم</h2>
            </div>
            <ul className="divide-y divide-line">
              {missingParticipation.slice(0, 12).map((child) => (
                <li key={child.id} className="px-5 py-3 flex justify-between gap-3">
                  <span className="font-bold">{child.name}</span>
                  <span className="text-muted">
                    {child.group_name} • {child.stage}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
