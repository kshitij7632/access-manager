
# ScoreBuzz × Supabase Integration Plan

Replace the mock data layer with your own Supabase project, keep the current UI, and add 3 new feature modules.

---

## Phase 0 — Supabase Project Setup (you do this)

I'll guide you through the UI:

1. Go to https://supabase.com → **New project** (name: `scorebuzz`, pick region closest to India, save the DB password somewhere safe).
2. Wait ~2 min for provisioning.
3. **Project Settings → API** → copy two values:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon / publishable key** (the long `eyJ...` one — safe to put in frontend)
4. **Authentication → Providers → Email** → turn OFF "Confirm email" (since accounts are issued, not self-signed-up). Leave password sign-in ON.
5. **Authentication → URL Configuration** → set Site URL to your Lovable preview URL.
6. Paste the URL + anon key into the chat. That's it — I take over from there.

---

## Phase 1 — Database Schema

One migration creating these tables (all with explicit GRANTs + RLS):

```text
app_role            enum: 'student' | 'staff' | 'super_admin'
profiles            id (FK auth.users), name, email, class, roll_no, branch, batch, avatar
user_roles          user_id, role           -- roles live separately for security
teams               id, name, color, captain_id, motto, created_by
team_members        team_id, student_id     -- unique(student_id) = one team per student
exams               id, name, subject, date, total_marks, created_by
marks               exam_id, student_id, marks, unique(exam_id, student_id)
announcements       id, title, body, author_id, created_at
notifications       id, user_id (nullable=broadcast), kind, title, body, read_at
badges              id, code, label, icon, description
student_badges      student_id, badge_id, awarded_at, exam_id, unique(student_id, badge_id, exam_id)
audit_log           id, actor_id, action, target_id, target_label, detail, created_at
```

Plus a `has_role(user_id, role)` SECURITY DEFINER function to avoid recursive RLS.

### RLS summary
- **Students**: read their own profile, their team, all exams, leaderboard (marks via a view), their notifications, their badges, all announcements.
- **Staff**: full read on all student-facing data + write on students/teams/exams/marks/announcements.
- **Super admin**: everything, plus `user_roles` writes and `audit_log` read.

### Closed signup enforcement
- Disable public signup via Supabase Auth setting (or via a DB trigger that blocks inserts not coming from a staff/admin invite RPC).
- Add an edge function `invite-user` that only staff/admin can call → creates auth user + profile + role in one shot, returns temp password.

---

## Phase 2 — Wire the Frontend

1. Install `@supabase/supabase-js`, create `src/integrations/supabase/client.ts` with URL + anon key (publishable, fine in code).
2. **Replace `AuthContext`** → real Supabase auth (`signInWithPassword`, `onAuthStateChange`, `getUser` for role checks). Keep the same `user.role` shape so the rest of the app keeps working.
3. **Replace `AppStateContext`** → reads `exams`, `marks`, `students`, `teams` from Supabase. Keep `individualLeaderboard` / `teamLeaderboard` selectors but compute from real data.
4. **Replace `AuditContext`** → writes to `audit_log` table instead of localStorage.
5. **NotificationsContext** → reads from `notifications` table, subscribes via Realtime.
6. Pages that already exist (`Dashboard`, `Leaderboard`, `Teams`, `Exams`, `Students`, `Users`, `MarksUpload`, `TeamBuilder`) keep their UI — only their data hooks change.

Mock data stays as a seed script we run once to populate the new DB so the demo isn't empty.

---

## Phase 3 — Realtime Leaderboard & Notifications

- Subscribe to `postgres_changes` on `marks` → recompute leaderboard live; show rank-change toast.
- Subscribe to `notifications` filtered by `user_id=eq.<me>` OR `user_id is null` (broadcast) → bell updates instantly.
- Subscribe to `announcements` → new posts appear without refresh.

---

## Phase 4 — Achievements & Badges

DB trigger on `marks` insert/update calls a `recompute_badges(student_id, exam_id)` function that awards:

| Code | Rule |
|---|---|
| `first_rank` | rank #1 in an exam |
| `top_3` | top 3 in an exam |
| `hat_trick` | rank #1 in 3 consecutive exams |
| `comeback_kid` | rank jumped ≥10 spots vs previous exam |
| `perfect_score` | scored full marks |
| `team_mvp` | top scorer in winning team |

New `Achievements` page + badge row on `Profile` and `Leaderboard` cards.

---

## Phase 5 — Announcements Feed

- New `/announcements` page (read-only for students, compose for staff/admin).
- Bell + dashboard surface latest 3.
- On insert, fan out to `notifications` (broadcast row) via DB trigger.

---

## Technical Notes

- **Auth flow**: keep current Login page; replace mock check with `supabase.auth.signInWithPassword`. "Forgot password" uses `resetPasswordForEmail` → existing `/reset-password` page handles `type=recovery`.
- **Roles**: never read role from `profiles` — always from `user_roles` via `has_role()` to prevent privilege escalation.
- **GRANTs**: every public table gets explicit `GRANT` to `authenticated` + `service_role` in the same migration (Supabase no longer grants by default).
- **Edge functions**: `invite-user` (staff creates users), `bulk-import-students` (CSV → profiles+roles+temp passwords). Both validate JWT + role in code.
- **Mock data**: I'll provide a one-click "Seed demo data" admin button that calls a seed edge function — easy to wipe & re-seed.

---

## What I need from you to start

1. Supabase **Project URL**
2. Supabase **anon/publishable key**

Once you paste those, I'll execute phases 1 → 5 in order. Estimated 4–6 build messages.
