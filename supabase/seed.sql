-- =====================================================================
-- ScoreBuzz — production migration, RLS verification, and dev seed data
-- Run in the Supabase SQL Editor (as the project owner).
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------- Enums ----------
do $$ begin
  create type public.app_role as enum ('super_admin', 'staff', 'student');
exception when duplicate_object then null; end $$;

-- ---------- Role helper (SECURITY DEFINER, avoids RLS recursion) ----------
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- ---------- Tables (created only if missing) ----------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  name                text not null default '',
  email               text,
  class               text,
  roll_no             text,
  branch              text,
  batch               text,
  avatar_url          text,
  must_reset_password boolean not null default true,
  created_at          timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  captain_id uuid references auth.users(id) on delete set null,
  motto text,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (team_id, user_id)
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text,
  date date not null,
  total_marks integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.marks (
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  marks numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (exam_id, student_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  body text,
  audience text not null default 'all',        -- 'all' | 'user'
  user_id uuid references auth.users(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  actor_role text,
  target_id uuid,
  target_label text,
  detail text,
  created_at timestamptz not null default now()
);

-- ---------- Grants (Data API access) ----------
grant select on public.profiles      to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles         to service_role;

grant select on public.user_roles    to authenticated;
grant all on public.user_roles       to service_role;

grant select on public.teams         to anon, authenticated;
grant insert, update, delete on public.teams to authenticated;
grant all on public.teams            to service_role;

grant select on public.team_members  to anon, authenticated;
grant insert, delete on public.team_members to authenticated;
grant all on public.team_members     to service_role;

grant select on public.exams         to anon, authenticated;
grant insert, update, delete on public.exams to authenticated;
grant all on public.exams            to service_role;

grant select on public.marks         to anon, authenticated;
grant insert, update, delete on public.marks to authenticated;
grant all on public.marks            to service_role;

grant select, update on public.notifications to authenticated;
grant insert on public.notifications         to authenticated;
grant all    on public.notifications         to service_role;

grant select, insert on public.audit_log     to authenticated;
grant all            on public.audit_log     to service_role;

-- ---------- RLS ----------
alter table public.profiles       enable row level security;
alter table public.user_roles     enable row level security;
alter table public.teams          enable row level security;
alter table public.team_members   enable row level security;
alter table public.exams          enable row level security;
alter table public.marks          enable row level security;
alter table public.notifications  enable row level security;
alter table public.audit_log      enable row level security;

-- profiles
drop policy if exists "profiles read all authed"       on public.profiles;
drop policy if exists "profiles self update"           on public.profiles;
drop policy if exists "profiles admin manage"          on public.profiles;
create policy "profiles read all authed" on public.profiles
  for select to authenticated using (true);
create policy "profiles self update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles admin manage" on public.profiles
  for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'staff'));

-- user_roles (read only via policy; writes happen via service role in edge fn)
drop policy if exists "user_roles read own"     on public.user_roles;
drop policy if exists "user_roles read admin"   on public.user_roles;
drop policy if exists "user_roles read all authed" on public.user_roles;
create policy "user_roles read all authed" on public.user_roles
  for select to authenticated using (true);

-- teams / team_members
drop policy if exists "teams read all"    on public.teams;
drop policy if exists "teams write staff" on public.teams;
create policy "teams read all"    on public.teams for select to anon, authenticated using (true);
create policy "teams write staff" on public.teams for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'staff'));

drop policy if exists "team_members read all"    on public.team_members;
drop policy if exists "team_members write staff" on public.team_members;
create policy "team_members read all" on public.team_members for select to anon, authenticated using (true);
create policy "team_members write staff" on public.team_members for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'staff'));

-- exams
drop policy if exists "exams read all"    on public.exams;
drop policy if exists "exams write staff" on public.exams;
create policy "exams read all" on public.exams for select to anon, authenticated using (true);
create policy "exams write staff" on public.exams for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'staff'));

-- marks
drop policy if exists "marks read all"    on public.marks;
drop policy if exists "marks write staff" on public.marks;
create policy "marks read all" on public.marks for select to anon, authenticated using (true);
create policy "marks write staff" on public.marks for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'staff'))
  with check (public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'staff'));

-- notifications
drop policy if exists "notif read own or broadcast" on public.notifications;
drop policy if exists "notif update own"            on public.notifications;
drop policy if exists "notif insert staff"          on public.notifications;
create policy "notif read own or broadcast" on public.notifications
  for select to authenticated using (audience = 'all' or user_id = auth.uid());
create policy "notif update own" on public.notifications
  for update to authenticated using (audience = 'all' or user_id = auth.uid())
  with check (audience = 'all' or user_id = auth.uid());
create policy "notif insert staff" on public.notifications
  for insert to authenticated with check (
    public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'staff')
  );

-- audit_log
drop policy if exists "audit read admin" on public.audit_log;
drop policy if exists "audit insert any" on public.audit_log;
create policy "audit read admin" on public.audit_log
  for select to authenticated using (
    public.has_role(auth.uid(), 'super_admin') or public.has_role(auth.uid(), 'staff')
  );
create policy "audit insert any" on public.audit_log
  for insert to authenticated with check (auth.uid() = actor_id or actor_id is null);

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.marks,
  public.exams, public.teams, public.team_members, public.profiles,
  public.notifications, public.audit_log;

-- =====================================================================
-- DEV SEEDING
-- Creating auth users requires the service role, so seed users via the
-- Supabase Dashboard → Authentication → Users (or via the admin-users
-- edge function once deployed). Then fill in the UUIDs below and run
-- this block to attach roles + demo teams/exams/marks.
-- =====================================================================
-- Example (uncomment and replace UUIDs):
--
-- with u as (
--   select 'REPLACE-SUPER-ADMIN-UUID'::uuid as super_admin,
--          'REPLACE-STAFF-UUID'::uuid       as staff,
--          'REPLACE-STUDENT-UUID'::uuid     as student
-- )
-- insert into public.user_roles (user_id, role)
-- select super_admin, 'super_admin' from u union all
-- select staff, 'staff' from u union all
-- select student, 'student' from u
-- on conflict do nothing;
