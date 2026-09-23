-- صلاحيات الجداول الموجودة حاليًا فقط.
-- هذا الملف لا ينشئ جداول ولا يغير الأعمدة ولا يحذف بيانات.

alter table public.children enable row level security;
alter table public.activities enable row level security;
alter table public.points_records enable row level security;
alter table public.daily_reading enable row level security;

drop policy if exists "children_authenticated_all" on public.children;
create policy "children_authenticated_all" on public.children
  for all to authenticated using (true) with check (true);

drop policy if exists "activities_authenticated_all" on public.activities;
create policy "activities_authenticated_all" on public.activities
  for all to authenticated using (true) with check (true);

drop policy if exists "points_records_authenticated_all" on public.points_records;
create policy "points_records_authenticated_all" on public.points_records
  for all to authenticated using (true) with check (true);

drop policy if exists "daily_reading_authenticated_all" on public.daily_reading;
create policy "daily_reading_authenticated_all" on public.daily_reading
  for all to authenticated using (true) with check (true);

grant usage on schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select, insert, update, delete on public.children to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
grant select, insert, update, delete on public.points_records to authenticated;
grant select, insert, update, delete on public.daily_reading to authenticated;
