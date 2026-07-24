create extension if not exists "pgcrypto";

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text not null,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references public.app_users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  parent_slug text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.menu_categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.table_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.app_users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  email text,
  booking_date date not null,
  booking_time time not null,
  guests integer not null check (guests > 0),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.app_users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  email text,
  order_type text not null default 'pickup' check (order_type in ('pickup', 'delivery', 'dine_in')),
  address text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  total_amount numeric(10, 2) not null default 0 check (total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_categories add column if not exists parent_slug text;

alter table public.profiles enable row level security;
alter table public.app_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.gallery_images enable row level security;
alter table public.table_bookings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists "Public can read active categories" on public.menu_categories;
drop policy if exists "Public can read available menu items" on public.menu_items;
drop policy if exists "Public can read active gallery images" on public.gallery_images;
drop policy if exists "Public can read site settings" on public.site_settings;
drop policy if exists "Customers can create bookings" on public.table_bookings;
drop policy if exists "Customers can create orders" on public.orders;
drop policy if exists "Customers can create order items" on public.order_items;
drop policy if exists "Customers can create contact messages" on public.contact_messages;

create policy "Public can read active categories" on public.menu_categories
  for select using (is_active = true);

create policy "Public can read available menu items" on public.menu_items
  for select using (is_available = true);

create policy "Public can read active gallery images" on public.gallery_images
  for select using (is_active = true);

create policy "Public can read site settings" on public.site_settings
  for select using (true);

create policy "Customers can create bookings" on public.table_bookings
  for insert with check (true);

create policy "Customers can create orders" on public.orders
  for insert with check (true);

create policy "Customers can create order items" on public.order_items
  for insert with check (true);

create policy "Customers can create contact messages" on public.contact_messages
  for insert with check (true);

insert into public.menu_categories (slug, name, sort_order)
values
  ('food', 'Food', 1),
  ('burgers', 'Burgers', 2),
  ('pizza', 'Pizza', 3),
  ('sandwiches', 'Sandwiches', 4),
  ('shawarma', 'Shawarma', 5),
  ('drinks', 'Drinks', 6),
  ('shakes', 'Shakes', 7),
  ('mojito', 'Mojito', 8),
  ('cocktails', 'Alcoholic Cocktails', 9)
on conflict (slug) do nothing;

update public.menu_categories
set parent_slug = 'food'
where slug in ('burgers', 'pizza', 'sandwiches', 'shawarma')
  and parent_slug is null;

update public.menu_categories
set parent_slug = 'drinks'
where slug in ('shakes', 'mojito', 'cocktails')
  and parent_slug is null;
update public.menu_items set image_url = '/uploads/house/menu-board-reference.jpg' where image_url is null or image_url = '/logo.jpg';

delete from public.gallery_images where image_url = '/logo.jpg';

insert into public.gallery_images (title, image_url, sort_order, is_active)
select 'Interior mural and counter', '/uploads/house/interior-03.jpg', 1, true
where not exists (select 1 from public.gallery_images where image_url = '/uploads/house/interior-03.jpg');

insert into public.gallery_images (title, image_url, sort_order, is_active)
select 'Evening seating area', '/uploads/house/interior-08.jpg', 2, true
where not exists (select 1 from public.gallery_images where image_url = '/uploads/house/interior-08.jpg');

insert into public.gallery_images (title, image_url, sort_order, is_active)
select 'Warm lounge counter', '/uploads/house/interior-05.jpg', 3, true
where not exists (select 1 from public.gallery_images where image_url = '/uploads/house/interior-05.jpg');

insert into public.gallery_images (title, image_url, sort_order, is_active)
select 'Welcome mural', '/uploads/house/interior-11.jpg', 4, true
where not exists (select 1 from public.gallery_images where image_url = '/uploads/house/interior-11.jpg');

insert into public.site_settings (setting_key, setting_value)
values
  ('brand', '{"name":"EMRAKEL","subtitle":"Burger, Pizza & Cocktail House"}'),
  ('home', '{"eyebrow":"Burger, pizza and cocktail house","headline":"EMRAKEL Burger House","description":"A warm evening house for burgers, pizza, cocktails, and relaxed table moments.","primaryAction":"Book a Table","secondaryAction":"View Menu","heroImage":"/uploads/house/interior-08.jpg","featureImage":"/uploads/house/interior-05.jpg","galleryImage":"/uploads/house/interior-11.jpg"}'),
  ('about', '{"eyebrow":"About EMRAKEL","headline":"A warm burger house shaped by murals, lights, plants, and evening energy.","description":"EMRAKEL blends burger, pizza, cocktail, and lounge culture inside a distinctive house interior with hand-painted walls, warm chandeliers, dark marble counters, and green ceiling details.","image":"/uploads/house/interior-05.jpg","secondaryImage":"/uploads/house/interior-11.jpg"}'),
  ('contact', '{"eyebrow":"Contact","headline":"Visit, call, or send a message.","description":"Send feedback, ask about bookings, or contact the EMRAKEL team directly.","image":"/uploads/house/interior-08.jpg"}'),
  ('footer', '{"note":"Designed & Developed by Eyoben Technologies PLC","copyright":"Copyright 2026 EMRAKEL. All rights reserved."}'),
  ('jazz', '{"enabled":true,"eyebrow":"Jazz night","title":"Live evening sessions at EMRAKEL","description":"Warm lights, house drinks, and a relaxed evening atmosphere for guests.","date":"Every Friday","time":"7:30 PM - 10:30 PM","image":"/uploads/house/interior-06.jpg"}')
on conflict (setting_key) do update set
  setting_value = excluded.setting_value || public.site_settings.setting_value,
  updated_at = now();
