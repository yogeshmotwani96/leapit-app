-- 1. Create a table for public profiles
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  approval_status text check (approval_status in ('PENDING', 'APPROVED', 'REJECTED')) default 'PENDING',
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Turn on Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. Policies
-- Helper function to bypass RLS for admin checks and prevent infinite recursion
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select is_admin from profiles where id = auth.uid();
$$;

-- Users can only read their own profile
create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

-- Admins can view all profiles
create policy "Admins can view all profiles"
  on profiles for select
  using ( public.is_admin() );

-- Users can only update their own profile
create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Admins can update all profiles
create policy "Admins can update all profiles"
  on profiles for update
  using ( public.is_admin() );

-- 4. Trigger to automatically create a profile when a new user signs up in auth.users
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, approval_status)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'PENDING');
  return new;
end;
$$;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. MANUAL OVERRIDE: Run this to back-fill and approve the master account
-- If your user was registered BEFORE the trigger was fixed, run this query in the SQL editor:
insert into public.profiles (id, email, full_name, approval_status, is_admin)
select id, email, raw_user_meta_data->>'full_name', 'APPROVED', true
from auth.users
where email = 'yogeshmotwani96@gmail.com'
on conflict (id) do update 
set is_admin = true, approval_status = 'APPROVED';

-- 6. PHASE 2: Attendance Tracking Table
create table public.attendance_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  date date default CURRENT_DATE not null,
  time_in timestamp with time zone default timezone('utc'::text, now()) not null,
  time_out timestamp with time zone,
  unique (user_id, date) -- ensure only one log per day per user
);

-- Enable RLS for Attendance Logs
alter table public.attendance_logs enable row level security;

-- Policies for Attendance Logs
-- Users can read their own attendance
create policy "Users can view own attendance logs"
  on attendance_logs for select
  using ( auth.uid() = user_id );

-- Users can insert their own attendance (time in)
create policy "Users can insert own attendance logs"
  on attendance_logs for insert
  with check ( auth.uid() = user_id );

-- Users can update their own attendance (time out)
create policy "Users can update own attendance logs"
  on attendance_logs for update
  using ( auth.uid() = user_id );

-- Admins can view all attendance logs
create policy "Admins can view all attendance logs"
  on attendance_logs for select
  using ( public.is_admin() );
