"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { fetchChildren } from "@/lib/data";
import type { Child } from "@/lib/types";
import { arabicError } from "@/lib/utils";

export default function LeaderboardPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchChildren();
        setChildren(data);
      } catch (err) {
        setError(arabicError(err instanceof Error ? err.message : "تعذر تحميل الترتيب"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ranked = useMemo(
    () =>
      [...children].sort(
        (a, b) =>
          b.total_points - a.total_points ||
          b.reading_count - a.reading_count ||
          a.name.localeCompare(b.name, "ar")
      ),
    [children]
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!ranked.length) return <EmptyState title="لا يوجد أطفال لعرض الترتيب" />;

  return (
    <div>
      <PageHeader title="ترتيب الأطفال" subtitle="حسب إجمالي النقاط ثم عدد مرات القراءة" />
      <div className="card overflow-auto">
        <table className="w-full min-w-[640px] text-right">
          <thead className="bg-cream">
            <tr>
              {["الترتيب", "اسم الطفل", "المجموعة", "إجمالي النقاط", "مرات القراءة"].map((h) => (
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
