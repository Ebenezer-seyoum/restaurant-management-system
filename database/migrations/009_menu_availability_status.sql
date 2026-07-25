alter table public.menu_categories
  add column if not exists availability_status text not null default 'available';

alter table public.menu_items
  add column if not exists availability_status text not null default 'available';

update public.menu_categories
set availability_status = case when is_active = false then 'hidden' else 'available' end
where availability_status is null
   or availability_status not in ('available', 'coming_soon', 'hidden')
   or is_active = false;

update public.menu_items
set availability_status = case when is_available = false then 'hidden' else 'available' end
where availability_status is null
   or availability_status not in ('available', 'coming_soon', 'hidden')
   or is_available = false;

alter table public.menu_categories
  drop constraint if exists menu_categories_availability_status_check;

alter table public.menu_categories
  add constraint menu_categories_availability_status_check
  check (availability_status in ('available', 'coming_soon', 'hidden'));

alter table public.menu_items
  drop constraint if exists menu_items_availability_status_check;

alter table public.menu_items
  add constraint menu_items_availability_status_check
  check (availability_status in ('available', 'coming_soon', 'hidden'));

create index if not exists menu_categories_availability_idx
  on public.menu_categories (availability_status, sort_order);

create index if not exists menu_items_availability_idx
  on public.menu_items (availability_status, sort_order);
