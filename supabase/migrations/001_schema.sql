-- ============================================================
-- ScoreBuzz – Canonical database schema (single source of truth)
-- Run once via:  supabase db push   OR paste into the SQL Editor.
-- Idempotent: safe to re-run.
-- ============================================================

-- ── 0. Enum ──────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'staff', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 0b. Role helper (SECURITY DEFINER, avoids RLS recursion) ─
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ── 0c. get_user_role helper ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role::text FROM public.user_roles
  WHERE user_id = uid
  ORDER BY
    CASE role::text
      WHEN 'super_admin' THEN 0
      WHEN 'staff'       THEN 1
      WHEN 'student'     THEN 2
      ELSE 3
    END
  LIMIT 1;
$$;

-- ── 1. profiles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 text NOT NULL DEFAULT '',
  email                text,
  student_class        text,
  roll_no              text,
  avatar               text,
  must_change_password boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles read all authed"  ON public.profiles;
DROP POLICY IF EXISTS "profiles self update"      ON public.profiles;
DROP POLICY IF EXISTS "profiles admin manage"     ON public.profiles;

CREATE POLICY "profiles read all authed" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles self update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles admin manage" ON public.profiles
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'staff'));

-- ── 2. user_roles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles read own"   ON public.user_roles;
DROP POLICY IF EXISTS "user_roles read admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles read all authed" ON public.user_roles;

CREATE POLICY "user_roles read all authed" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

-- Writes happen via the service-role edge function only.

-- ── 3. teams ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '226 90% 55%',
  motto       text NOT NULL DEFAULT '',
  captain_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams read all"    ON public.teams;
DROP POLICY IF EXISTS "teams write staff" ON public.teams;

CREATE POLICY "teams read all" ON public.teams
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "teams write staff" ON public.teams
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'staff'));

-- ── 4. team_members ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id  uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members read all"    ON public.team_members;
DROP POLICY IF EXISTS "team_members write staff" ON public.team_members;

CREATE POLICY "team_members read all" ON public.team_members
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "team_members write staff" ON public.team_members
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'staff'));

-- ── 5. exams ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exams (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  subject      text NOT NULL DEFAULT '',
  date         date NOT NULL,
  total_marks  integer NOT NULL DEFAULT 100,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exams read all"    ON public.exams;
DROP POLICY IF EXISTS "exams write staff" ON public.exams;

CREATE POLICY "exams read all" ON public.exams
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "exams write staff" ON public.exams
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'staff'));

-- ── 6. marks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marks (
  exam_id    uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marks      numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, student_id)
);

ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marks read all"    ON public.marks;
DROP POLICY IF EXISTS "marks write staff" ON public.marks;

CREATE POLICY "marks read all" ON public.marks
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "marks write staff" ON public.marks
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'staff'));

-- ── 7. notifications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       text NOT NULL,
  title      text NOT NULL,
  body       text,
  audience   text NOT NULL DEFAULT 'all',        -- 'all' | 'user'
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif read own or broadcast" ON public.notifications;
DROP POLICY IF EXISTS "notif update own"            ON public.notifications;
DROP POLICY IF EXISTS "notif insert staff"          ON public.notifications;

CREATE POLICY "notif read own or broadcast" ON public.notifications
  FOR SELECT TO authenticated
  USING (audience = 'all' OR user_id = auth.uid());

CREATE POLICY "notif update own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (audience = 'all' OR user_id = auth.uid())
  WITH CHECK (audience = 'all' OR user_id = auth.uid());

CREATE POLICY "notif insert staff" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'staff')
  );

-- ── 8. audit_log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action       text NOT NULL,
  actor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name   text,
  actor_role   text,
  target_id    text,
  target_label text,
  detail       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit read admin" ON public.audit_log;
DROP POLICY IF EXISTS "audit insert any" ON public.audit_log;

CREATE POLICY "audit read admin" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "audit insert any" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id OR actor_id IS NULL);

-- ── 9. Grants (Data API access) ─────────────────────────────
GRANT SELECT ON public.profiles      TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles         TO service_role;

GRANT SELECT ON public.user_roles    TO authenticated;
GRANT ALL ON public.user_roles       TO service_role;

GRANT SELECT ON public.teams         TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams            TO service_role;

GRANT SELECT ON public.team_members  TO anon, authenticated;
GRANT INSERT, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members     TO service_role;

GRANT SELECT ON public.exams         TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams            TO service_role;

GRANT SELECT ON public.marks         TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.marks TO authenticated;
GRANT ALL ON public.marks            TO service_role;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications         TO authenticated;
GRANT ALL    ON public.notifications         TO service_role;

GRANT SELECT, INSERT ON public.audit_log     TO authenticated;
GRANT ALL            ON public.audit_log     TO service_role;

-- ── 10. Auto-create profile on signup ────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 11. Realtime ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.marks,
  public.exams,
  public.teams,
  public.team_members,
  public.profiles,
  public.notifications,
  public.audit_log;
