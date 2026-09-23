import * as XLSX from "xlsx";
import type { Child, ExcelChildRow } from "@/lib/types";

const NAME_KEYS = ["اسم الطفل", "الاسم", "name", "child_name"];
const GROUP_KEYS = ["المجموعة", "مجموعة", "group", "group_name"];
const STAGE_KEYS = ["المرحلة", "مرحلة", "stage", "grade"];

function cell(value: unknown) {
  return String(value ?? "").trim();
}

function pick(row: Record<string, unknown>, keys: string[]) {
  const entries = Object.entries(row);
  for (const key of keys) {
    const found = entries.find(
      ([k]) => k.trim().toLowerCase() === key.toLowerCase()
    );
    if (found) return cell(found[1]);
  }
  return "";
}

export function parseChildrenWorkbook(buffer: ArrayBuffer): ExcelChildRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  return raw.map((row, index) => {
    const name = pick(row, NAME_KEYS);
    const group_name = pick(row, GROUP_KEYS);
    const stage = pick(row, STAGE_KEYS);
    const errors: string[] = [];
    if (!name) errors.push("اسم الطفل ناقص");
    if (!group_name) errors.push("المجموعة ناقصة");
    if (!stage) errors.push("المرحلة ناقصة");
    return {
      rowNumber: index + 2,
      name,
      group_name,
      stage,
      status: errors.length ? "missing" : "ok",
      errors,
    } satisfies ExcelChildRow;
  });
}

export function markDuplicates(
  rows: ExcelChildRow[],
  existing: Child[]
): ExcelChildRow[] {
  const existingKeys = new Set(
    existing.map((c) =>
      `${c.name}|${c.group_name}|${c.stage}`.replace(/\s+/g, " ").trim()
    )
  );
  const seen = new Set<string>();

  return rows.map((row) => {
    const key = `${row.name}|${row.group_name}|${row.stage}`
      .replace(/\s+/g, " ")
      .trim();
    const errors = [...row.errors];
    let status = row.status;

    if (row.status === "ok") {
      if (existingKeys.has(key) || seen.has(key)) {
        status = "duplicate";
        errors.push(
          existingKeys.has(key)
            ? "الطفل موجود بالفعل في قاعدة البيانات"
            : "صف مكرر داخل ملف Excel"
        );
      } else {
        seen.add(key);
      }
    }

    return { ...row, status, errors };
  });
}

export function downloadChildrenTemplate() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["اسم الطفل", "المجموعة", "المرحلة"],
    ["مريم يوسف", "أولى", "ابتدائي"],
    ["بيتر عادل", "ثانية", "إعدادي"],
  ]);
  worksheet["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "الأطفال");
  XLSX.writeFile(workbook, "نموذج-استيراد-الأطفال.xlsx");
}
