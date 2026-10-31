-- RideTayo database
-- Copy all of this into Supabase > SQL Editor and click Run

-- 1. profiles (one row for every registered user)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'rider',
  created_at timestamptz default now()
);

-- 2. rides (posted by the admin / ride organizer)
create table rides (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  ride_date date not null,
  start_time time not null,
  meeting_place text,
  difficulty text default 'Easy',
  max_riders int default 30,
  start_lat double precision,
  start_lng double precision,
  end_lat double precision,
  end_lng double precision,
  is_loop boolean default false,
  route_points jsonb,
  distance_km numeric,
  duration_min int,
  climb_m int,
  poster_url text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- 3. ride_joins (which rider joined which ride)
create table ride_joins (
  id bigint generated always as identity primary key,
  ride_id bigint not null references rides(id) on delete cascade,
  rider_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (ride_id, rider_id)
);

-- let logged in users reach the tables from the app
-- (new Supabase projects don't do this automatically anymore)
grant select, insert, update, delete on profiles, rides, ride_joins to authenticated;

-- automatically make a profile when someone registers
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- returns true if the logged in user is an admin
create or replace function is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- security rules (Row Level Security)
alter table profiles enable row level security;
alter table rides enable row level security;
alter table ride_joins enable row level security;

-- profiles
create policy "logged in users can see profiles" on profiles
  for select to authenticated using (true);
create policy "only admin can change roles" on profiles
  for update to authenticated using (is_admin()) with check (is_admin());

-- rides
create policy "logged in users can see rides" on rides
  for select to authenticated using (true);
create policy "admin can add rides" on rides
  for insert to authenticated with check (is_admin());
create policy "admin can edit rides" on rides
  for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin can delete rides" on rides
  for delete to authenticated using (is_admin());

-- ride_joins
create policy "logged in users can see joins" on ride_joins
  for select to authenticated using (true);
create policy "riders can join for themselves" on ride_joins
  for insert to authenticated with check (rider_id = auth.uid());
create policy "riders can leave, admin can remove" on ride_joins
  for delete to authenticated using (rider_id = auth.uid() or is_admin());


-- AFTER you register your own account in the app, run this line
-- (change the email) to make yourself the admin:
--
-- update profiles set role = 'admin' where email = 'your@email.com';