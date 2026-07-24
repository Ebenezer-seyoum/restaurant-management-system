create extension if not exists pgcrypto;

update public.app_users
set role = 'customer', updated_at = now()
where role = 'admin'
  and (
    (
      email = 'admin@emrakel.com'
      and password_hash = 'scrypt:a8fe5614b70bcd6715da8aa4e4c270e2:5b39f5032598e67b95602b4a216e2a55d98a6b031bd4f11838c5c980ab241ebd633b4fddad385c1200b5e65670c9ac54f63928b0091b13816d83fcdfa8a97da1'
    )
    or
    (
      email = 'eyob@gmail.com'
      and password_hash = 'scrypt:4cfef057bd94f81007cf250f48199b96:38a21f3d1e3b3ee3ef3b0c01195788c757c99fdaf6877c1019b391931d524f99b963b29bb539a88c2257248bb24e67f6b20a6994c8e1edb64c84c523d823ecd7'
    )
  );

alter table public.orders drop constraint if exists orders_status_check;
update public.orders set status = 'finished' where status in ('delivered', 'paid');
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'preparing', 'ready', 'served', 'finished', 'cancelled'));

alter table public.orders drop constraint if exists orders_order_type_check;
update public.orders set order_type = 'dine_in' where order_type in ('dine-in', 'dinein');
alter table public.orders
  add constraint orders_order_type_check
  check (order_type in ('pickup', 'delivery', 'dine_in', 'takeaway'));

alter table public.orders add column if not exists finished_at timestamptz;
alter table public.orders add column if not exists served_at timestamptz;

alter table public.expenses add column if not exists notes text;
alter table public.expenses add column if not exists receipt_url text;
alter table public.expenses add column if not exists created_by uuid references public.app_users(id) on delete set null;

alter table public.income_transactions add column if not exists created_by uuid references public.app_users(id) on delete set null;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists orders_finished_at_idx on public.orders (finished_at desc);
create index if not exists expenses_category_date_idx on public.expenses (category, expense_date desc);
create index if not exists income_payment_date_idx on public.income_transactions (payment_method, transaction_date desc);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
