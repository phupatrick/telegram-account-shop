create table if not exists users (
  id bigserial primary key,
  telegram_id text not null unique,
  username text,
  full_name text,
  language text,
  created_at timestamptz not null default now()
);

alter table users
  add column if not exists language text;

create table if not exists products (
  id bigserial primary key,
  category_id bigint,
  name text not null,
  description text not null default '',
  price numeric(14, 2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id bigserial primary key,
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists warehouse_admins (
  id bigserial primary key,
  email text not null unique,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table products
  add column if not exists category_id bigint;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'products_category_fk'
  ) then
    alter table products
      add constraint products_category_fk
      foreign key (category_id) references categories(id);
  end if;
end $$;

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
  variant_id bigint,
  data text not null,
  status text not null default 'available',
  note text not null default '',
  order_id bigint references orders(id),
  sold_to_user_id bigint references users(id),
  created_at timestamptz not null default now(),
  sold_at timestamptz
);

create table if not exists product_variants (
  id bigserial primary key,
  product_id bigint not null references products(id),
  name text not null,
  warranty_days integer not null default 0,
  mail_type text not null default 'random',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table accounts
  add column if not exists variant_id bigint,
  add column if not exists note text not null default '';

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'accounts_variant_fk'
  ) then
    alter table accounts
      add constraint accounts_variant_fk
      foreign key (variant_id) references product_variants(id);
  end if;
end $$;

create index if not exists accounts_available_idx
  on accounts (product_id, id)
  where status = 'available';

create index if not exists accounts_variant_status_idx
  on accounts (variant_id, status);

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

create table if not exists warehouse_import_drafts (
  id bigserial primary key,
  telegram_id text not null,
  raw_text text not null,
  parsed jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists warehouse_import_drafts_admin_idx
  on warehouse_import_drafts (telegram_id, status, created_at desc);
