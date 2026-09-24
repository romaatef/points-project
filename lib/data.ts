import { createClient } from "@/lib/supabase/client";
import { throwSupabaseError } from "@/lib/supabase/errors";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Child, DailyReading, PointsRecord } from "@/lib/types";
import { cairoToday } from "@/lib/utils";

function isDailyReadingActivity(name: string) {
  const normalized = name.replace(/\s+/g, " ").trim();
  return (
    normalized.includes("قراءة") ||
    normalized.toLowerCase().includes("bible") ||
    normalized.toLowerCase().includes("daily_reading")
  );
}

type ChildRow = Omit<Child, "image_url" | "total_points" | "reading_count">;

export async function fetchChildren() {
  const supabase = createClient();
  const [{ data: children, error: childrenError }, { data: records, error: recordsError }, { data: readings, error: readingsError }] =
    await Promise.all([
      supabase
        .from("children")
        .select("id, name, group_name, stage, baseline_points, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("points_records").select("child_id, points, record_date, activity_name"),
      supabase.from("daily_reading").select("child_id, points, reading_date"),
    ]);

  if (childrenError) throwSupabaseError(childrenError, "fetch children");
  if (recordsError) throwSupabaseError(recordsError, "fetch child points");
  if (readingsError) throwSupabaseError(readingsError, "fetch reading counts");

  const totals = new Map<string, number>();
  const countedReadings = new Set<string>();
  const readingDatesByChild = new Map<string, Set<string>>();
  for (const record of records ?? []) {
    totals.set(record.child_id, (totals.get(record.child_id) ?? 0) + record.points);
    if (isDailyReadingActivity(record.activity_name ?? "")) {
      const key = `${record.child_id}|${record.record_date}`;
      countedReadings.add(key);
      const dates = readingDatesByChild.get(record.child_id) ?? new Set<string>();
      dates.add(record.record_date);
      readingDatesByChild.set(record.child_id, dates);
    }
  }
  for (const reading of readings ?? []) {
    const key = `${reading.child_id}|${reading.reading_date}`;
    if (!countedReadings.has(key)) {
      totals.set(reading.child_id, (totals.get(reading.child_id) ?? 0) + reading.points);
    }
    const dates = readingDatesByChild.get(reading.child_id) ?? new Set<string>();
    dates.add(reading.reading_date);
    readingDatesByChild.set(reading.child_id, dates);
  }

  return ((children ?? []) as ChildRow[]).map((child) => ({
    ...child,
    image_url: null,
    total_points: child.baseline_points + (totals.get(child.id) ?? 0),
    reading_count: readingDatesByChild.get(child.id)?.size ?? 0,
  }));
}

export async function clearPointsHistory() {
  const supabase = createClient();
  const { error } = await supabase.rpc("clear_points_history");
  if (error) {
    console.error("[Supabase RPC] message:", error.message);
    console.error("[Supabase RPC] details:", error.details);
    console.error("[Supabase RPC] hint:", error.hint);
    console.error("[Supabase RPC] code:", error.code);
    console.error("[Supabase RPC] full error:", JSON.stringify(error, null, 2));
    throw new Error(
      [
        `message: ${error.message || "—"}`,
        `details: ${error.details || "—"}`,
        `hint: ${error.hint || "—"}`,
        `code: ${error.code || "—"}`,
      ].join(" | ")
    );
  }
}

export async function fetchActivities() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("id, name, points, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) throwSupabaseError(error, "fetch activities");
  return data ?? [];
}

export async function deleteActivity(activityId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("activities").delete().eq("id", activityId);
  if (error) throwSupabaseError(error, "delete activity");
}

export async function fetchTodayReadings() {
  const supabase = createClient();
  const today = cairoToday();
  const [
    { data: readings, error: readingsError },
    { data: records, error: recordsError },
  ]: [
    { data: Pick<DailyReading, "id" | "child_id" | "reading_date" | "points">[] | null; error: PostgrestError | null },
    { data: { id: string; child_id: string; record_date: string; points: number; activity_name: string | null }[] | null; error: PostgrestError | null },
  ] =
    await Promise.all([
      supabase
        .from("daily_reading")
        .select("id, child_id, reading_date, points")
        .eq("reading_date", today),
      supabase
        .from("points_records")
        .select("id, child_id, record_date, points, activity_name")
        .eq("record_date", today),
    ]);
  if (readingsError) throwSupabaseError(readingsError, "fetch today's readings");
  if (recordsError) throwSupabaseError(recordsError, "fetch today's reading records");

  const readingIds = new Set((readings ?? []).map((reading) => reading.child_id));
  const activityReadings = (records ?? [])
    .filter((record) => isDailyReadingActivity(record.activity_name ?? ""))
    .filter((record) => !readingIds.has(record.child_id))
    .map((record) => ({
      id: record.id,
      child_id: record.child_id,
      reading_date: record.record_date,
      points: record.points,
    }));

  return [...(readings ?? []), ...activityReadings];
}

export async function registerDailyReading(childId: string) {
  const supabase = createClient();
  const today = cairoToday();
  const { data, error } = await supabase
    .from("daily_reading")
    .insert({ child_id: childId, reading_date: today, points: 5 })
    .select("id, points")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("تم تسجيل القراءة لهذا الطفل اليوم بالفعل");
    }
    throwSupabaseError(error, "register daily reading");
  }
  return { ok: true, points: data.points };
}

export async function deletePointsRecord(recordId: string) {
  const supabase = createClient();
  const { data: record, error: loadError } = await supabase
    .from("points_records")
    .select("id, child_id, activity_name, record_date")
    .eq("id", recordId)
    .single();
  if (loadError) throwSupabaseError(loadError, "load points record before delete");

  if (isDailyReadingActivity(record.activity_name)) {
    const { error: readingError } = await supabase
      .from("daily_reading")
      .delete()
      .eq("child_id", record.child_id)
      .eq("reading_date", record.record_date);
    if (readingError) throwSupabaseError(readingError, "delete related daily reading");
  }

  const { error: deleteError } = await supabase
    .from("points_records")
    .delete()
    .eq("id", recordId);
  if (deleteError) throwSupabaseError(deleteError, "delete points record");
}

export async function deleteDailyReadingRecord(readingId: string) {
  const supabase = createClient();
  const { data: reading, error: loadError } = await supabase
    .from("daily_reading")
    .select("id, child_id, reading_date")
    .eq("id", readingId)
    .single();
  if (loadError) throwSupabaseError(loadError, "load daily reading before delete");

  const { data: relatedRecords, error: relatedError } = await supabase
    .from("points_records")
    .select("id, activity_name")
    .eq("child_id", reading.child_id)
    .eq("record_date", reading.reading_date);
  if (relatedError) throwSupabaseError(relatedError, "find related points records for daily reading");

  const relatedIds = (relatedRecords ?? [])
    .filter((row: Pick<PointsRecord, "id" | "activity_name">) => isDailyReadingActivity(row.activity_name))
    .map((row: Pick<PointsRecord, "id" | "activity_name">) => row.id);

  if (relatedIds.length) {
    const { error: deleteRelatedError } = await supabase
      .from("points_records")
      .delete()
      .in("id", relatedIds);
    if (deleteRelatedError) {
      throwSupabaseError(deleteRelatedError, "delete related points records for daily reading");
    }
  }

  const { error: deleteError } = await supabase.from("daily_reading").delete().eq("id", readingId);
  if (deleteError) throwSupabaseError(deleteError, "delete daily reading");
}

export async function awardActivityPoints(childId: string, activityId: string) {
  const supabase = createClient();
  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .select("id, name, points, active")
    .eq("id", activityId)
    .eq("active", true)
    .single();
  if (activityError) throwSupabaseError(activityError, "load activity before awarding points");

  const { data, error } = await supabase
    .from("points_records")
    .insert({
      child_id: childId,
      activity_id: activity.id,
      activity_name: activity.name,
      points: activity.points,
      record_date: cairoToday(),
    })
    .select("id, points")
    .single();
  if (error) throwSupabaseError(error, "award activity points");
  return { ok: true, points: data.points };
}

export async function uploadChildPhoto(file: File, childId?: string) {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${childId ?? "new"}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("children-photos")
    .upload(path, file, { upsert: true });
  if (error) throwSupabaseError(error, "upload child photo");
  const { data } = supabase.storage.from("children-photos").getPublicUrl(path);
  return data.publicUrl;
}
