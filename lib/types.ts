export type Child = {
  id: string;
  name: string;
  group_name: string;
  stage: string;
  image_url: string | null;
  total_points: number;
  reading_count: number;
  created_at: string;
};

export type Activity = {
  id: string;
  name: string;
  points: number;
  active: boolean;
  created_at: string;
};

export type PointsRecord = {
  id: string;
  child_id: string;
  activity_id: string | null;
  activity_name: string;
  points: number;
  record_date: string;
  created_at: string;
  source?: "points_record" | "daily_reading";
  children?: { name: string; group_name: string } | null;
};

export type DailyReading = {
  id: string;
  child_id: string;
  reading_date: string;
  points: number;
  created_at: string;
};

export type ExcelChildRow = {
  rowNumber: number;
  name: string;
  group_name: string;
  stage: string;
  status: "ok" | "missing" | "duplicate";
  errors: string[];
};
