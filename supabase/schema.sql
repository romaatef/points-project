-- ينشئ الجداول المطلوبة إن لم تكن موجودة، ثم يضبط الأعمدة والصلاحيات.

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_name text not null,
  stage text not null,
  image_url text,
  baseline_points integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.points_records (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  activity_name text not null,
  points integer not null,
  record_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_reading (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  reading_date date not null,
  points integer not null default 5,
  created_at timestamptz not null default now(),
  unique (child_id, reading_date)
);

alter table public.children
  add column if not exists baseline_points integer not null default 0;

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

create or replace function public.clear_points_history()
returns void
language plpgsql
security invoker
as $$
begin
  with point_totals as (
    select child_id, coalesce(sum(points), 0) as points
    from public.points_records
    group by child_id
  ), reading_totals as (
    select reading.child_id, coalesce(sum(reading.points), 0) as points
    from public.daily_reading reading
    where not exists (
      select 1
      from public.points_records record
      where record.child_id = reading.child_id
        and record.record_date = reading.reading_date
        and (
          record.activity_name ilike '%قراءة%'
          or lower(record.activity_name) like '%bible%'
          or lower(record.activity_name) like '%daily_reading%'
        )
    )
    group by reading.child_id
  ), totals as (
    select coalesce(point_totals.child_id, reading_totals.child_id) as child_id,
      coalesce(point_totals.points, 0) + coalesce(reading_totals.points, 0) as points
    from point_totals
    full join reading_totals using (child_id)
  )
  update public.children child
  set baseline_points = child.baseline_points + totals.points
  from totals
  where child.id = totals.child_id;

  delete from public.points_records;
  delete from public.daily_reading;
end;
$$;

grant execute on function public.clear_points_history() to authenticated;
