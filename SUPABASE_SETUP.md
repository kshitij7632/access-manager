# Supabase Setup Instructions

Follow these steps to fully activate the backend.

## Step 1: Run the Database Migration

1. Go to your Supabase project → **SQL Editor**
2. Open `supabase/migrations/001_schema.sql`
3. Paste the entire contents into the SQL editor and click **Run**

This creates:
- `profiles` table (with auto-create trigger on signup)
- `user_roles` table
- `teams` + `team_members` tables
- `exams` + `marks` tables
- `audit_logs` table
- All RLS policies

## Step 2: Deploy the Edge Function

### Option A: Supabase CLI (recommended)
```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref tiucewmkpsplbkhxyrxv

# Deploy the function
supabase functions deploy admin-user-ops
```

### Option B: Manual via Dashboard
1. Go to **Edge Functions** in your Supabase dashboard
2. Create a new function named `admin-user-ops`
3. Paste the contents of `supabase/functions/admin-user-ops/index.ts`
4. Deploy

## Step 3: Set Environment Variables

The Edge Function needs the **service role key**:

1. Go to Supabase → **Settings → API**
2. Copy the `service_role` key (starts with `eyJ...`)
3. Go to **Edge Functions → admin-user-ops → Secrets**
4. Add: `SUPABASE_SERVICE_ROLE_KEY = <your-service-role-key>`

> ⚠️ **Never put the service role key in frontend code!** It's only safe in Edge Functions.

## Step 4: Create Your First Super Admin

Since the DB starts empty, you need to manually set your account as super_admin:

1. **Sign up** using the app login page (or use Supabase Auth → Users → Invite)
2. Go to Supabase → **SQL Editor** and run:

```sql
-- Replace with your actual user ID from auth.users
INSERT INTO public.user_roles (user_id, role)
VALUES ('<your-user-uuid>', 'super_admin')
ON CONFLICT DO NOTHING;
```

3. Log out and log back in — you'll now have super_admin access

## Step 5: Create Students & Teams

1. Log in as super_admin
2. Go to **User Management** → Add individual users or use **Bulk Import**
3. Go to **Team Builder** → Create teams and assign students
4. Go to **Exams** → Create an exam
5. Go to **Upload Marks** → Enter scores
6. Watch the **Leaderboard** update in real-time! 🎉

## What Works Now

| Feature | Status |
|---------|--------|
| Login / Logout | ✅ Supabase Auth |
| Password Reset | ✅ Email link |
| User Management (create/delete/role) | ✅ Edge Function |
| Bulk Student Import | ✅ Edge Function |
| Exams (create, list) | ✅ Supabase DB |
| Marks Upload | ✅ Supabase DB with upsert |
| Leaderboard | ✅ Real-time from DB |
| Teams & Members | ✅ Supabase DB |
| Audit Log | ✅ Supabase DB (super_admin only) |
| Real-time updates | ✅ Supabase Realtime subscriptions |
