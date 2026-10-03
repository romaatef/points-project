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

type ParticipationRecord = {
  child_id: string;
  date: string;
};

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getMonthsFromCurrentToOctober2028(firstParticipationDate?: string): Month[] {
  const [yearText, monthText] = cairoToday().split("-");
  const currentYear = Number(yearText);
  const currentMonth = Number(monthText) - 1;
  const currentKey = monthKey(currentYear, currentMonth);
  const firstParticipationMonth = firstParticipationDate?.slice(0, 7);
  const startKey = firstParticipationMonth && firstParticipationMonth < currentKey ? firstParticipationMonth : currentKey;
  const [startYearText, startMonthText] = startKey.split("-");
  const months: Month[] = [];
  const end = new Date(2028, 9, 1);

  for (
    let date = new Date(Number(startYearText), Number(startMonthText) - 1, 1);
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

export default function MonthlyParticipationPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [participationRecords, setParticipationRecords] = useState<ParticipationRecord[]>([]);

  const months = useMemo(() => {
    const firstParticipationDate = participationRecords.reduce<string | undefined>(
      (earliest, record) => (!earliest || record.date < earliest ? record.date : earliest),
      undefined
    );
    return getMonthsFromCurrentToOctober2028(firstParticipationDate);
  }, [participationRecords]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const [yearText, monthText] = cairoToday().split("-");
    return monthKey(Number(yearText), Number(monthText) - 1);
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data, error: recordsError } = await supabase
          .from("points_records")
          .select("child_id, record_date, activity_name");

        if (recordsError) throw recordsError;

        const uniqueRecords = new Map<string, ParticipationRecord>();
        for (const record of data ?? []) {
          const item = record as {
            child_id: string;
            record_date: string;
            activity_name: string | null;
          };

          if (isReadingActivity(item.activity_name)) continue;
          uniqueRecords.set(`${item.child_id}|${item.record_date}`, {
            child_id: item.child_id,
            date: item.record_date,
          });
        }

        const kids = await fetchChildren();
        setChildren(kids);
        setParticipationRecords(Array.from(uniqueRecords.values()));
      } catch (err) {
        setError(arabicError(err instanceof Error ? err.message : "تعذر تحميل نسب المشاركة"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const participationChildrenByMonth = useMemo(() => {
    const result = new Map<string, Set<string>>();
    for (const record of participationRecords) {
      const key = record.date.slice(0, 7);
      const childrenForMonth = result.get(key) ?? new Set<string>();
      childrenForMonth.add(record.child_id);
      result.set(key, childrenForMonth);
    }
    return result;
  }, [participationRecords]);

  const monthStatsByKey = useMemo(() => {
    const result = new Map<string, { participationCount: number; totalCount: number; percentage: number }>();
    for (const month of months) {
      const participationCount = participationChildrenByMonth.get(month.key)?.size ?? 0;
      const totalCount = children.length;
      result.set(month.key, {
        participationCount,
        totalCount,
        percentage: totalCount ? Math.round((participationCount / totalCount) * 100) : 0,
      });
    }
    return result;
  }, [children.length, months, participationChildrenByMonth]);

  const selectedParticipationChildren = participationChildrenByMonth.get(selectedMonth) ?? new Set<string>();
  const selectedMonthData = months.find((month) => month.key === selectedMonth);
  const selectedStats = monthStatsByKey.get(selectedMonth) ?? {
    participationCount: 0,
    totalCount: children.length,
    percentage: 0,
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!children.length || !months.length) return <EmptyState title="لا توجد بيانات لعرض النسب" />;

  return (
    <div className="monthly-reading-page">
      <PageHeader
        title="نسبة المشاركة الشهرية"
        subtitle="عدد الأولاد الذين شاركوا خلال كل شهر من إجمالي الأولاد"
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
          const stats = monthStatsByKey.get(month.key) ?? {
            participationCount: 0,
            totalCount: children.length,
            percentage: 0,
          };
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
                {stats.participationCount} من {stats.totalCount} ولد
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
              شارك {selectedStats.participationCount} من {selectedStats.totalCount} ولد ({selectedStats.percentage}%)
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
                const hasParticipated = selectedParticipationChildren.has(child.id);
                return (
                  <tr key={child.id} className="border-t border-line">
                    <td className="px-4 py-3 font-bold">{child.name}</td>
                    <td className="px-4 py-3">{child.group_name}</td>
                    <td className={`px-4 py-3 font-extrabold ${hasParticipated ? "text-green-700" : "text-danger"}`}>
                      {hasParticipated ? "شارك" : "لم يشارك"}
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
