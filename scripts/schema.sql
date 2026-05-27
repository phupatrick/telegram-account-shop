create table if not exists users (
  id bigserial primary key,
  telegram_id text not null unique,
  username text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id bigserial primary key,
  name text not null,
  description text not null default '',
  price numeric(14, 2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id bigserial primary key,
  code text not null unique,
  user_id bigint not null references users(id),
  product_id bigint not null references products(id),
  amount numeric(14, 2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  delivered_at timestamptz
);

create index if not exists orders_user_idx on orders (user_id, created_at desc);
create index if not exists orders_status_idx on orders (status, created_at);

create table if not exists accounts (
  id bigserial primary key,
  product_id bigint not null references products(id),
  data text not null,
  status text not null default 'available',
  order_id bigint references orders(id),
  sold_to_user_id bigint references users(id),
  created_at timestamptz not null default now(),
  sold_at timestamptz
);

create index if not exists accounts_available_idx
  on accounts (product_id, id)
  where status = 'available';

create table if not exists payments (
  id bigserial primary key,
  order_id bigint not null references orders(id),
  method text not null,
  amount numeric(14, 2) not null,
  status text not null default 'pending',
  transaction_ref text,
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id bigserial primary key,
  user_id bigint not null references users(id),
  order_id bigint references orders(id),
  message text not null,
  status text not null default 'open',
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists system_logs (
  id bigserial primary key,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
