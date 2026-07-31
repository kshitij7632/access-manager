# ScoreBuzz | Study. Compete.

Live Leaderboard & Access Management System for Lakshya Private Tuitions.

## Features
- **Access & Role Management**: Multi-tier RBAC (Super Admin, Staff, Student).
- **Live Leaderboard**: Real-time ranks, podium view, team averages, and topper highlights.
- **Marks Management**: Fast CSV import, paste matrix, and automated rank recalculation.
- **Team Builder**: Drag-and-drop squad formation with live stats & branch filters.
- **Audit Log & Notifications**: Realtime activity tracking and toast alerts.

## Environment Variables (Vercel & Local)

Set these two public variables in `.env` or **Vercel Project Settings → Environment Variables**:

```env
VITE_SUPABASE_URL=https://tiucewmkpsplbkhxyrxv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_lGJwSrkuxCITcKUqrWaDww_wacWhdWW
```

## Stack
- React + Vite + TypeScript + TailwindCSS + Shadcn UI
- Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
