create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  -- Added 'not null' and 'on delete cascade'
  user_id uuid references auth.users(id) on delete cascade not null,
  plan text not null,
  status text not null,
  -- Switched to timestamptz
  start_date timestamptz not null default now(),
  end_date timestamptz,
  created_at timestamptz default now() not null
);

-- Indexing user_id is crucial for performance as the table grows
create index subscriptions_user_id_idx on subscriptions (user_id);

alter table subscriptions enable row level security;

-- SELECT Policy
create policy "Users can view their own subscription"
on subscriptions for select
using (auth.uid() = user_id);

-- INSERT Policy
create policy "Users can insert their own subscription"
on subscriptions for insert
with check (auth.uid() = user_id);

-- UPDATE Policy (Optional but usually needed for renewals/upgrades)
create policy "Users can update their own subscription"
on subscriptions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);