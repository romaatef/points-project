"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { fetchChildren } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import type { Child } from "@/lib/types";
import { arabicError } from "@/lib/utils";

type Period = "day" | "week" | "month" | "total";

type LeaderboardRow = Pick<Child, "id" | "name" | "group_name"> & {
  total_points: number;
  reading_count: number;
};

type RawPointsRecord = {
  child_id: string;
  points: number;
  record_date: string;
  activity_name: string | null;
};

type RawDailyReading = {
  child_id: string;
  points: number;
  reading_date: string;
};

const PERIODS: { key: Period; label: string; subtitle: string }[] = [
  { key: "day", label: "ترتيب اليوم", subtitle: "أفضل أداء اليوم" },
  { key: "week", label: "هذا الأسبوع", subtitle: "أفضل أداء خلال آخر 7 أيام" },
  { key: "month", label: "هذا الشهر", subtitle: "أفضل أداء خلال هذا الشهر" },
  { key: "total", label: "الترتيب العام", subtitle: "التصنيف النهائي لجميع الفترات" },
];

function normalizeDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`);
}

function isInRange(dateValue: string, start: Date, end: Date) {
  const date = normalizeDate(dateValue);
  return !Number.isNaN(date.getTime()) && date >= start && date <= end;
}

function isDailyReadingActivity(name: string) {
  const normalized = name.replace(/\s+/g, " ").trim();
  return (
    normalized.includes("قراءة") ||
    normalized.toLowerCase().includes("bible") ||
    normalized.toLowerCase().includes("daily_reading")
  );
}

function latestWeekStart(date: Date) {
  const copy = new Date(date);
  const day = (copy.getDay() + 1) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function sortRanked(rows: LeaderboardRow[]) {
  return [...rows].sort(
    (a, b) =>
      b.total_points - a.total_points ||
      b.reading_count - a.reading_count ||
      a.name.localeCompare(b.name, "ar")
  );
}

function getRange(period: Period) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  if (period === "day") {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    return { start, end };
  }

  if (period === "week") {
    const start = latestWeekStart(today);
    return { start, end };
  }

  if (period === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start, end };
  }

  return null;
}

function buildLeaderboardForPeriod(
  children: Child[],
  records: RawPointsRecord[],
  readings: RawDailyReading[],
  period: Period
): LeaderboardRow[] {
  if (period === "total") {
    return sortRanked(
      children.map((child) => ({
        id: child.id,
        name: child.name,
        group_name: child.group_name,
        total_points: child.total_points,
        reading_count: child.reading_count,
      }))
    );
  }

  const range = getRange(period);
  if (!range) return [];

  const pointsByChild = new Map<string, number>();
  const readingDatesByChild = new Map<string, Set<string>>();
  const countedReadings = new Set<string>();

  for (const record of records) {
    if (!isInRange(record.record_date, range.start, range.end)) continue;
    const childId = record.child_id;
    const points = Number(record.points ?? 0);

    if (isDailyReadingActivity(record.activity_name ?? "")) {
      const key = `${childId}|${record.record_date}`;
      countedReadings.add(key);
      pointsByChild.set(childId, (pointsByChild.get(childId) ?? 0) + points);
      const dates = readingDatesByChild.get(childId) ?? new Set<string>();
      dates.add(record.record_date);
      readingDatesByChild.set(childId, dates);
      continue;
    }

    pointsByChild.set(childId, (pointsByChild.get(childId) ?? 0) + points);
  }

  for (const reading of readings) {
    if (!isInRange(reading.reading_date, range.start, range.end)) continue;
    const childId = reading.child_id;
    const key = `${childId}|${reading.reading_date}`;

    if (!countedReadings.has(key)) {
      pointsByChild.set(childId, (pointsByChild.get(childId) ?? 0) + Number(reading.points ?? 0));
    }

    const dates = readingDatesByChild.get(childId) ?? new Set<string>();
    dates.add(reading.reading_date);
    readingDatesByChild.set(childId, dates);
  }

  return sortRanked(
    children.map((child) => ({
      id: child.id,
      name: child.name,
      group_name: child.group_name,
      total_points: pointsByChild.get(child.id) ?? 0,
      reading_count: readingDatesByChild.get(child.id)?.size ?? 0,
    }))
  );
}

export default function LeaderboardPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [records, setRecords] = useState<RawPointsRecord[]>([]);
  const [readings, setReadings] = useState<RawDailyReading[]>([]);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [data, supabase] = await Promise.all([fetchChildren(), createClient()]);

        const [{ data: recordsData }, { data: readingsData }] = await Promise.all([
          supabase.from("points_records").select("child_id, points, record_date, activity_name"),
          supabase.from("daily_reading").select("child_id, points, reading_date"),
        ]);

        setChildren(data);
        setRecords((recordsData ?? []) as RawPointsRecord[]);
        setReadings((readingsData ?? []) as RawDailyReading[]);
      } catch (err) {
        setError(arabicError(err instanceof Error ? err.message : "تعذر تحميل الترتيب"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ranked = buildLeaderboardForPeriod(children, records, readings, period);
  const activePeriod = PERIODS.find((item) => item.key === period) ?? PERIODS[0];
  const printSubtitle = `${activePeriod.label} • ${activePeriod.subtitle}`;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!children.length) return <EmptyState title="لا يوجد أطفال لعرض الترتيب" />;

  return (
    <div className="leaderboard-page">
      <PageHeader
        title="ترتيب أسرة الأنطوني"
        titleClassName="font-tajawal text-3xl md:text-4xl font-extrabold leading-tight tracking-tight"
        subtitle={printSubtitle}
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="gold-btn print-hidden flex items-center gap-2"
          >
            <Printer size={18} />
            تصدير PDF
          </button>
        }
      />

      <div className="period-tabs mb-6 flex flex-wrap gap-3">
        {PERIODS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setPeriod(item.key)}
            className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
              period === item.key
                ? "bg-gold text-navy shadow-sm"
                : "bg-white text-navy border border-line hover:bg-cream"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="leaderboard-table card overflow-auto">
        <table className="w-full min-w-[640px] text-right">
          <thead className="bg-cream">
            <tr>
              {[
                "الترتيب",
                "اسم الطفل",
                "المجموعة",
                period === "total" ? "إجمالي النقاط" : "النقاط",
                "مرات القراءة",
              ].map((h) => (
                <th key={h} className="px-4 py-3 font-extrabold text-navy">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((child, index) => (
              <tr key={child.id} className="border-t border-line">
                <td className="px-4 py-3 font-extrabold text-gold">{index + 1}</td>
                <td className="px-4 py-3 font-bold">{child.name}</td>
                <td className="px-4 py-3">{child.group_name}</td>
                <td className="px-4 py-3 font-extrabold">{child.total_points}</td>
                <td className="px-4 py-3">{child.reading_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
