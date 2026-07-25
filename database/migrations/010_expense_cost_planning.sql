alter table public.expenses add column if not exists cost_type text not null default 'variable';
alter table public.expenses add column if not exists recurrence text not null default 'one_time';
alter table public.expenses add column if not exists allocation_months integer not null default 1;
alter table public.expenses add column if not exists allocation_start_date date;
alter table public.expenses add column if not exists allocation_end_date date;

update public.expenses
set cost_type = 'variable'
where cost_type is null or cost_type = '';

update public.expenses
set recurrence = 'one_time'
where recurrence is null or recurrence = '';

update public.expenses
set allocation_months = 1
where allocation_months is null or allocation_months < 1;

update public.expenses
set allocation_start_date = expense_date
where allocation_start_date is null;

alter table public.expenses drop constraint if exists expenses_cost_type_check;
alter table public.expenses
  add constraint expenses_cost_type_check
  check (cost_type in ('fixed', 'variable', 'maintenance', 'long_term', 'other'));

alter table public.expenses drop constraint if exists expenses_recurrence_check;
alter table public.expenses
  add constraint expenses_recurrence_check
  check (recurrence in ('one_time', 'daily', 'weekly', 'monthly', 'yearly'));

alter table public.expenses drop constraint if exists expenses_allocation_months_check;
alter table public.expenses
  add constraint expenses_allocation_months_check
  check (allocation_months > 0);

create index if not exists expenses_cost_type_date_idx on public.expenses (cost_type, expense_date desc);
create index if not exists expenses_recurrence_date_idx on public.expenses (recurrence, expense_date desc);
