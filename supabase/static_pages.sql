create extension if not exists pgcrypto;

create table if not exists public.static_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content text not null default '',
  seo_title text,
  seo_description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists static_pages_slug_idx
  on public.static_pages (slug);

alter table public.static_pages enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'static_pages'
      and policyname = 'Public can read static pages'
  ) then
    create policy "Public can read static pages"
      on public.static_pages
      for select
      using (true);
  end if;
end $$;
