"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { fetchChildren, fetchTodayReadings } from "@/lib/data";
import type { Child } from "@/lib/types";
import { arabicError, cairoToday, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [todayIds, setTodayIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [kids, readings] = await Promise.all([
          fetchChildren(),
          fetchTodayReadings(),
        ]);
        setChildren(kids);
        setTodayIds(readings.map((r) => r.child_id));
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
  const totalPoints = children.reduce((sum, c) => sum + (c.total_points || 0), 0);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const stats = [
    { label: "إجمالي الأطفال", value: children.length },
    { label: "إجمالي النقاط", value: totalPoints },
    { label: "قراءات اليوم", value: todayIds.length },
    { label: "لم يسجلوا قراءة اليوم", value: missing.length },
  ];

  return (
    <div>
      <PageHeader
        title="لوحة التحكم"
        subtitle={`ملخص الخدمة لتاريخ ${formatDate(cairoToday())}`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <p className="text-muted font-bold">{stat.label}</p>
            <p className="text-3xl font-extrabold text-navy mt-2">{stat.value}</p>
          </div>
        ))}
      </div>
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
    </div>
  );
}
