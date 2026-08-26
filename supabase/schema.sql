-- Evan CRM — Supabase schema
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

-- 1) CUSTOMERS -------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text default '',
  title text default '',
  project_name text default '',
  project_location text default '',
  source text default 'Website' check (source in ('Website','Referral','Social media','Event','Walk-in')),
  status text default 'Lead' check (status in ('Lead','Active','VIP','Inactive')),
  avatar_url text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_created_at_idx on public.customers (created_at desc);

-- keep updated_at fresh on every update
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- 2) EMPLOYEES ---------------------------------------------------------------
-- One row per Supabase Auth user (id matches auth.users.id). Created
-- automatically by the trigger below whenever a new user signs up /
-- is invited from the Supabase dashboard.
create table if not exists public.employees (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text default '',
  avatar_url text default '',
  role text not null default 'employee' check (role in ('admin','employee')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.employees (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) ROW LEVEL SECURITY ------------------------------------------------------
alter table public.customers enable row level security;
alter table public.employees enable row level security;

-- Any signed-in employee can fully manage customers.
drop policy if exists "employees can read customers" on public.customers;
create policy "employees can read customers" on public.customers
  for select using (auth.role() = 'authenticated');

drop policy if exists "employees can insert customers" on public.customers;
create policy "employees can insert customers" on public.customers
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "employees can update customers" on public.customers;
create policy "employees can update customers" on public.customers
  for update using (auth.role() = 'authenticated');

drop policy if exists "employees can delete customers" on public.customers;
create policy "employees can delete customers" on public.customers
  for delete using (auth.role() = 'authenticated');

-- Employees can see the directory of employees, but only edit their own row.
drop policy if exists "employees can read employees" on public.employees;
create policy "employees can read employees" on public.employees
  for select using (auth.role() = 'authenticated');

drop policy if exists "employees can update own row" on public.employees;
create policy "employees can update own row" on public.employees
  for update using (auth.uid() = id);

-- 4) STORAGE (avatars) -------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('customer-avatars', 'customer-avatars', true)
on conflict (id) do nothing;

drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars" on storage.objects
  for select using (bucket_id in ('avatars','customer-avatars'));

drop policy if exists "authenticated upload avatars" on storage.objects;
create policy "authenticated upload avatars" on storage.objects
  for insert with check (
    bucket_id in ('avatars','customer-avatars') and auth.role() = 'authenticated'
  );

drop policy if exists "authenticated update avatars" on storage.objects;
create policy "authenticated update avatars" on storage.objects
  for update using (
    bucket_id in ('avatars','customer-avatars') and auth.role() = 'authenticated'
  );
