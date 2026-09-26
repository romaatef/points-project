"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { createClient } from "@/lib/supabase/client";
import { fetchChildren } from "@/lib/data";
import type { Child } from "@/lib/types";
import { arabicError, cairoToday } from "@/lib/utils";

type Month = {
  key: string;
  label: string;
};

type ReadingRecord = {
  child_id: string;
  date: string;
};

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getMonthsFromCurrentToOctober2028(): Month[] {
  const [yearText, monthText] = cairoToday().split("-");
  const currentYear = Number(yearText);
  const currentMonth = Number(monthText) - 1;
  const months: Month[] = [];
  const end = new Date(2028, 9, 1);

  for (
    let date = new Date(currentYear, currentMonth, 1);
    date <= end;
    date.setMonth(date.getMonth() + 1)
  ) {
    const key = monthKey(date.getFullYear(), date.getMonth());
    months.push({
      key,
      label: new Intl.DateTimeFormat("ar-EG", {
        month: "long",
        year: "numeric",
      }).format(date),
    });
  }

  return months;
}

function isReadingActivity(name: string | null) {
  const normalized = (name ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  return normalized.includes("قراءة") || normalized.includes("bible") || normalized.includes("daily_reading");
}

export default function MonthlyReadingPage() {
  const months = useMemo(getMonthsFromCurrentToOctober2028, []);
  const [children, setChildren] = useState<Child[]>([]);
  const [readingRecords, setReadingRecords] = useState<ReadingRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(months[0]?.key ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const [kids, readings, pointRecords] = await Promise.all([
          fetchChildren(),
          supabase.from("daily_reading").select("child_id, reading_date"),
          supabase.from("points_records").select("child_id, record_date, activity_name"),
        ]);

        if (readings.error) throw readings.error;
        if (pointRecords.error) throw pointRecords.error;

        const records = new Map<string, ReadingRecord>();
        for (const reading of readings.data ?? []) {
          const record = reading as { child_id: string; reading_date: string };
          records.set(`${record.child_id}|${record.reading_date}`, {
            child_id: record.child_id,
            date: record.reading_date,
          });
        }
        for (const pointRecord of pointRecords.data ?? []) {
          const record = pointRecord as {
            child_id: string;
            record_date: string;
            activity_name: string | null;
          };
          if (!isReadingActivity(record.activity_name)) continue;
          records.set(`${record.child_id}|${record.record_date}`, {
            child_id: record.child_id,
            date: record.record_date,
          });
        }

        setChildren(kids);
        setReadingRecords(Array.from(records.values()));
      } catch (err) {
        setError(arabicError(err instanceof Error ? err.message : "تعذر تحميل نسب القراءة"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const readChildrenByMonth = useMemo(() => {
    const result = new Map<string, Set<string>>();
    for (const record of readingRecords) {
      const key = record.date.slice(0, 7);
      const childrenForMonth = result.get(key) ?? new Set<string>();
      childrenForMonth.add(record.child_id);
      result.set(key, childrenForMonth);
    }
    return result;
  }, [readingRecords]);

  const monthStatsByKey = useMemo(() => {
    const result = new Map<string, { readCount: number; totalCount: number; percentage: number }>();
    for (const month of months) {
      const readCount = readChildrenByMonth.get(month.key)?.size ?? 0;
      const totalCount = children.length;
      result.set(month.key, {
        readCount,
        totalCount,
        percentage: totalCount ? Math.round((readCount / totalCount) * 100) : 0,
      });
    }
    return result;
  }, [children.length, months, readChildrenByMonth]);

  const selectedReadChildren = readChildrenByMonth.get(selectedMonth) ?? new Set<string>();
  const selectedMonthData = months.find((month) => month.key === selectedMonth);
  const selectedStats = monthStatsByKey.get(selectedMonth) ?? {
    readCount: 0,
    totalCount: children.length,
    percentage: 0,
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!children.length || !months.length) return <EmptyState title="لا توجد بيانات لعرض النسب" />;

  return (
    <div className="monthly-reading-page">
      <PageHeader
        title="نسبة القراءة الشهرية"
        subtitle="عدد الأولاد الذين قرأوا خلال كل شهر من إجمالي الأولاد"
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="gold-btn print-hidden flex items-center gap-2"
          >
            <Printer size={18} />
            طباعة PDF
          </button>
        }
      />

      <div className="monthly-month-grid mb-8">
        {months.map((month) => {
          const stats = monthStatsByKey.get(month.key) ?? { readCount: 0, totalCount: children.length, percentage: 0 };
          const active = month.key === selectedMonth;
          return (
            <button
              key={month.key}
              type="button"
              onClick={() => setSelectedMonth(month.key)}
              className={`monthly-month-button ${active ? "is-active" : ""}`}
            >
              <span className="font-extrabold text-navy">{month.label}</span>
              <span className="monthly-month-percentage">{stats.percentage}%</span>
              <span className="text-xs font-bold text-muted">
                {stats.readCount} من {stats.totalCount} ولد
              </span>
            </button>
          );
        })}
      </div>

      <section className="monthly-details card">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-navy">تفاصيل {selectedMonthData?.label}</h2>
            <p className="mt-1 text-sm font-bold text-muted">
              قرأ {selectedStats.readCount} من {selectedStats.totalCount} ولد ({selectedStats.percentage}%)
            </p>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[520px] text-right">
            <thead className="bg-cream">
              <tr>
                <th className="px-4 py-3 font-extrabold text-navy">اسم الطفل</th>
                <th className="px-4 py-3 font-extrabold text-navy">المجموعة</th>
                <th className="px-4 py-3 font-extrabold text-navy">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {children.map((child) => {
                const hasRead = selectedReadChildren.has(child.id);
                return (
                  <tr key={child.id} className="border-t border-line">
                    <td className="px-4 py-3 font-bold">{child.name}</td>
                    <td className="px-4 py-3">{child.group_name}</td>
                    <td className={`px-4 py-3 font-extrabold ${hasRead ? "text-green-700" : "text-danger"}`}>
                      {hasRead ? "قرأ" : "لم يقرأ"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
