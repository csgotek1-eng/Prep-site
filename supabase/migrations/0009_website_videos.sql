-- ============================================================
-- DOCKENTRA WEBSITE — VIDEOS FROM THE YOUTUBE CHANNEL
-- ============================================================
-- Status: PREPARED, **NOT APPLIED** by this repository.
-- Additive only: creates ONE new table. Touches nothing in 0001-0008.
-- Idempotent: safe to re-run.
--
-- This is the WEBSITE Supabase project. No WMS database is involved.
--
-- Until it is applied, /admin/videos says videos are unavailable and
-- every public surface simply shows no videos (src/lib/videos/service.ts
-- fails closed). See docs/VIDEOS.md.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.website_videos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Admin identity where the auth provider exposes one; never a
  -- visitor, because no public path can write this table.
  created_by text,

  -- ONLY the 11-character YouTube ID is stored, never an embed snippet
  -- or a URL: the site builds the player from the ID, so nothing typed
  -- in the admin can become markup on a public page.
  youtube_id text not null unique
    check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),

  -- Plain text; the application strips angle brackets and control
  -- characters before writing.
  title text not null check (char_length(title) between 1 and 120),
  description text not null default ''
    check (char_length(description) <= 600),

  -- From the channel's public feed when the video was added; feeds the
  -- VideoObject markup. Null when YouTube did not say.
  upload_date date,
  -- Ticked by the admin: a vertical Short.
  is_short boolean not null default false,

  status text not null default 'DRAFT' check (status in (
    'DRAFT', 'PUBLISHED', 'ARCHIVED'
  )),
  -- Also shown in the homepage section.
  featured boolean not null default false,
  sort_order integer not null default 100 check (sort_order between 0 and 9999)
);

create index if not exists website_videos_published_idx
  on public.website_videos (status, sort_order);

create or replace function public.website_videos_touch_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
alter function public.website_videos_touch_updated_at() set search_path = '';

drop trigger if exists website_videos_touch on public.website_videos;
create trigger website_videos_touch
  before update on public.website_videos
  for each row execute function public.website_videos_touch_updated_at();

-- Same posture as every website table: RLS on, no policies, nothing
-- granted to anon or authenticated. Only the server, with the
-- service-role key, reads or writes it.
alter table public.website_videos enable row level security;
revoke all on public.website_videos from anon, authenticated;
