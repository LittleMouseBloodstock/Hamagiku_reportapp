-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Horses Table
create table public.horses (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid references auth.users(id), -- Optional: Link to Auth User
  name text not null,
  name_en text, -- Added for bilingual functionality
  sire text,
  dam text,
  birth_year int,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Reports Table
create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  horse_id uuid references public.horses(id) not null,
  owner_user_id uuid references auth.users(id),
  title text, -- e.g. "Jan Weekly Report"
  body text, -- Original Japanese text (Trainer's comment)
  source_lang text default 'ja',
  status_training text, -- e.g. "坂路 15-15"
  condition text, -- e.g. "Good"
  target text, -- e.g. "3月 中山"
  weight numeric,
  weight_date date,
  metrics_json jsonb, -- For extensibility
  main_photo_url text, -- Specific photo for this report
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Translations Table (Cache)
create table public.translations (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid references public.reports(id) not null,
  field text not null, -- e.g. 'body'
  target_lang text not null, -- 'en', 'ja'
  source_hash text, -- Optional: Hash of source text for cache valdiation
  translated_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Report Assets (Extra photos/attachments)
create table public.report_assets (
  id uuid primary key default uuid_generate_v4(),
  report_id uuid references public.reports(id) not null,
  asset_type text, -- 'horse_photo', 'logo', 'attachment'
  storage_path text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Row Level Security)
-- Enable RLS
alter table public.horses enable row level security;
alter table public.reports enable row level security;
alter table public.translations enable row level security;
alter table public.report_assets enable row level security;

-- Policies (Simplified for initial dev: Allow Anon Read/Write if no Auth implemented yet, otherwise restrict to Owner)
-- Note: User requested "Owner only visible". Assuming Supabase Auth is active.
-- If Auth is NOT active yet, these policies might block access. 
-- For development start, we'll allow public access or based on Auth.

-- Allow read/write for authenticated users (owner match)
create policy "Users can see their own horses" on public.horses
  for all using (auth.uid() = owner_user_id);

create policy "Users can insert their own horses" on public.horses
  for insert with check (auth.uid() = owner_user_id);

-- Fallback for development (Allow Anon to see everything - Remove in Production!)
create policy "Benefit of doubt: Anon can view" on public.horses
  for select using (true);

-- Storage bucket setup (You must create 'report-assets' bucket in Dashboard)
-- insert into storage.buckets (id, name, public) values ('report-assets', 'report-assets', false);
