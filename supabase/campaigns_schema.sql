-- JulineMart Campaigns — core schema (Phase 1: DB-101..DB-105 + campaign_manual_exclusions).
-- Additive/non-breaking: creates new tables only, touches nothing existing, safe to run
-- against production. Matches the style of supabase/static_pages.sql already in this repo.
--
-- Auth model note: this project authenticates via Firebase, not Supabase Auth, so there is
-- no `auth.jwt() ->> 'role'` claim to check in RLS the way a generic Supabase-Auth app would.
-- Privileged admin reads/writes happen server-side through Next.js API routes using
-- SUPABASE_SERVICE_ROLE_KEY (see src/lib/supabase-server.ts), which bypasses RLS entirely.
-- The RLS policies below are defense-in-depth for the public anon client only.
--
-- Status/type/section values use `text + check` rather than Postgres enum types — matching
-- this repo's existing style (static_pages.sql has no enums) and avoiding the ALTER TYPE
-- friction of adding a new status/section later. section_type list is the one settled in
-- docs/campaigns-build-plan.md Appendix A.

create extension if not exists pgcrypto;

-- 1. Campaign master table (DB-101)
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  internal_name text not null,
  public_title text not null,
  campaign_objective text,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'active', 'paused', 'expired', 'archived')),
  start_date timestamptz,
  end_date timestamptz,
  target_type text not null
    check (target_type in ('vendor', 'category', 'product', 'collection', 'multi_vendor', 'general')),
  target_id text,
  template_id text,

  -- JSONB config blocks — shapes match src/types/campaigns.ts in both repos
  section_layout jsonb not null default '[]'::jsonb,
  hero_config jsonb not null default '{}'::jsonb,
  vendor_override jsonb default '{}'::jsonb,
  product_selection_rules jsonb not null default '{}'::jsonb,
  review_rules jsonb not null default '{}'::jsonb,
  offer_config jsonb default '{}'::jsonb,
  meta_seo jsonb default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_slug_status_idx
  on public.campaigns (slug, status);

-- 2. Campaign sections (DB-102)
create table if not exists public.campaign_sections (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  section_type text not null
    check (section_type in ('hero', 'benefits', 'vendor_story', 'products', 'offer', 'reviews', 'media_gallery', 'cta_footer')),
  order_index integer not null default 0,
  is_visible boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists campaign_sections_campaign_order_idx
  on public.campaign_sections (campaign_id, order_index);

-- 3. QR channel variants (DB-103)
create table if not exists public.campaign_qr_variants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  channel_name text not null,
  tracking_slug text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists campaign_qr_variants_campaign_idx
  on public.campaign_qr_variants (campaign_id);

-- 4. Analytics events (DB-104)
create table if not exists public.campaign_analytics_events (
  id bigserial primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  qr_id uuid references public.campaign_qr_variants(id) on delete set null,
  event_type text not null
    check (event_type in ('scan', 'page_visit', 'video_view', 'cta_click', 'add_to_cart', 'checkout_start', 'checkout_complete')),
  visitor_session_id text not null,
  user_id text,
  order_id text,
  revenue numeric(12, 2) default 0.00,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists campaign_analytics_campaign_event_idx
  on public.campaign_analytics_events (campaign_id, event_type);
create index if not exists campaign_analytics_created_at_idx
  on public.campaign_analytics_events (created_at);

-- 5. Manual exclusions — named in the PRD's Phase 1 prose and Security doc's schema
-- map, but missing from its actual DDL. Added here so it isn't lost.
create table if not exists public.campaign_manual_exclusions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  entity_type text not null check (entity_type in ('review', 'product')),
  entity_id text not null,
  reason text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists campaign_manual_exclusions_campaign_idx
  on public.campaign_manual_exclusions (campaign_id);

-- Row Level Security -------------------------------------------------------------

alter table public.campaigns enable row level security;
alter table public.campaign_sections enable row level security;
alter table public.campaign_qr_variants enable row level security;
alter table public.campaign_analytics_events enable row level security;
alter table public.campaign_manual_exclusions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaigns'
      and policyname = 'Public can read active campaigns'
  ) then
    create policy "Public can read active campaigns"
      on public.campaigns
      for select
      using (
        status = 'active'
        and (start_date is null or start_date <= now())
        and (end_date is null or end_date >= now())
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_sections'
      and policyname = 'Public can read sections of active campaigns'
  ) then
    create policy "Public can read sections of active campaigns"
      on public.campaign_sections
      for select
      using (
        exists (
          select 1 from public.campaigns
          where campaigns.id = campaign_sections.campaign_id
            and campaigns.status = 'active'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_qr_variants'
      and policyname = 'Public can read QR variants'
  ) then
    create policy "Public can read QR variants"
      on public.campaign_qr_variants
      for select
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_analytics_events'
      and policyname = 'Public can insert analytics events'
  ) then
    create policy "Public can insert analytics events"
      on public.campaign_analytics_events
      for insert
      with check (true);
  end if;
end $$;

-- campaign_manual_exclusions: intentionally no anon/public policies. RLS enabled +
-- zero policies means anon/authenticated roles get zero access by default; only the
-- service-role client (which bypasses RLS) can read or write it.

-- Admin write access from julinemart-logistics-orchestrator ------------------------
-- That app's browser-side Supabase client uses a real Supabase Auth session (not
-- Firebase, not a service-role key) and authorizes admin actions client-side via
-- user.role === 'admin'.
--
-- Originally mirrored the (already-in-production) `admin_manage_vouchers`
-- policy on campaign_vouchers verbatim: `for all to authenticated using (true)`.
-- A later security pass found that pattern actually granted insert/update/delete
-- to ANY authenticated orchestrator user, not just admins — the isAdmin check
-- was only a client-side UI gate, not a real authorization boundary. Fixed on
-- the live DB via orchestrator's migrations 20260724000002/000003 (campaign_vouchers,
-- then campaigns/campaign_sections/campaign_qr_variants) — reflected here so this
-- doc matches what's actually live: SELECT stays open to any authenticated staff
-- (the admin dashboard needs to read draft/paused/archived campaigns too, not
-- just the public "active" subset below), INSERT/UPDATE/DELETE now require a
-- real admin role via the same check already used on the `users` table.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaigns'
      and policyname = 'campaigns_select_authenticated'
  ) then
    create policy "campaigns_select_authenticated"
      on public.campaigns for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaigns'
      and policyname = 'campaigns_admin_insert'
  ) then
    create policy "campaigns_admin_insert"
      on public.campaigns for insert to authenticated
      with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaigns'
      and policyname = 'campaigns_admin_update'
  ) then
    create policy "campaigns_admin_update"
      on public.campaigns for update to authenticated
      using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
      with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaigns'
      and policyname = 'campaigns_admin_delete'
  ) then
    create policy "campaigns_admin_delete"
      on public.campaigns for delete to authenticated
      using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_sections'
      and policyname = 'campaign_sections_select_authenticated'
  ) then
    create policy "campaign_sections_select_authenticated"
      on public.campaign_sections for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_sections'
      and policyname = 'campaign_sections_admin_insert'
  ) then
    create policy "campaign_sections_admin_insert"
      on public.campaign_sections for insert to authenticated
      with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_sections'
      and policyname = 'campaign_sections_admin_update'
  ) then
    create policy "campaign_sections_admin_update"
      on public.campaign_sections for update to authenticated
      using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
      with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_sections'
      and policyname = 'campaign_sections_admin_delete'
  ) then
    create policy "campaign_sections_admin_delete"
      on public.campaign_sections for delete to authenticated
      using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
  end if;
end $$;

-- Same reasoning, added when the QR channel manager and analytics summary
-- were built in the admin app (INT-504 + condensed Screen 3). No separate
-- authenticated-select policy needed here — "Public can read QR variants"
-- (role: public) already covers read access for every role.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_qr_variants'
      and policyname = 'campaign_qr_variants_admin_insert'
  ) then
    create policy "campaign_qr_variants_admin_insert"
      on public.campaign_qr_variants for insert to authenticated
      with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_qr_variants'
      and policyname = 'campaign_qr_variants_admin_update'
  ) then
    create policy "campaign_qr_variants_admin_update"
      on public.campaign_qr_variants for update to authenticated
      using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'))
      with check (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_qr_variants'
      and policyname = 'campaign_qr_variants_admin_delete'
  ) then
    create policy "campaign_qr_variants_admin_delete"
      on public.campaign_qr_variants for delete to authenticated
      using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_analytics_events'
      and policyname = 'admin_read_campaign_analytics_events'
  ) then
    create policy "admin_read_campaign_analytics_events"
      on public.campaign_analytics_events
      for select
      to authenticated
      using (true);
  end if;
end $$;
