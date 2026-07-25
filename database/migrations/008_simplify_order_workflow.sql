alter table public.orders add column if not exists cancel_reason text;
alter table public.orders add column if not exists cancelled_at timestamptz;

alter table public.orders drop constraint if exists orders_status_check;

update public.orders
set status = 'pending',
    updated_at = now()
where status in ('preparing', 'ready', 'served');

update public.orders
set status = 'finished',
    finished_at = coalesce(finished_at, updated_at, created_at),
    paid_at = coalesce(paid_at, updated_at, created_at)
where status in ('delivered', 'paid');

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'finished', 'cancelled'));

