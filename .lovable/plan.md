# Supabase Wireup Plan

DB is live (`teams`, `profiles` reachable). Now we replace the four mock contexts with real Supabase reads/writes, keeping the existing UI and routes untouched.

## Stage 1 — Auth (this commit)
- Rewrite `src/context/AuthContext.tsx`:
  - `login` -> `supabase.auth.signInWithPassword`
  - Session from `onAuthStateChange` + `getUser`
  - Role fetched from `user_roles` via `has_role` (single query joining profile)
  - `logout` -> `supabase.auth.signOut`
  - `requestPasswordReset` -> `resetPasswordForEmail` (redirect `/reset-password`)
  - `changePassword` -> `updateUser({ password })`
  - `updateProfile` -> update `profiles`
  - Keep the same return shape so `Login`, `RequireAuth`, `Profile`, `ForgotPassword`, `ResetPassword` keep working.
- Admin user management (`adminCreateUser`, `deleteUser`, `updateUserRole`, `bulkCreateStudents`) becomes a thin wrapper that calls a new edge function `admin-users` (deferred to Stage 4 — for now these will toast "requires admin edge function" so Users page doesn't crash).

## Stage 2 — Domain data
- New `src/hooks/useTeams.ts`, `useStudents.ts`, `useExams.ts`, `useMarks.ts` querying Supabase.
- Replace `AppStateContext` internals to read from those hooks; keep the same public API (`exams`, `marks`, `addExam`, `upsertMarks`, `individualLeaderboard`, `teamLeaderboard`) so pages don't change.
- Retire `src/data/mock.ts` from runtime (kept only for types).

## Stage 3 — Realtime + Notifications + Audit
- Subscribe to `marks` for live leaderboard updates.
- `NotificationsContext` reads from `notifications` table, subscribes to inserts for the current user.
- `AuditContext` writes to `audit_log`, reads recent entries for super_admin.

## Stage 4 — Announcements + Achievements + Admin edge function
- New `/announcements` page + bell entries.
- Badges page driven by `student_badges`.
- `admin-users` edge function for create/delete/role-change (uses service role).

---

This message ships **Stage 1 only** so you can sign in with the real super_admin user you created. After you confirm login works, I'll proceed with Stage 2.
