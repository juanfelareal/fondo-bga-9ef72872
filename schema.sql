-- =============================================================
-- Grupo de Inversión Bucaramanga — Schema Supabase
-- Pegar en el SQL Editor de Supabase y ejecutar (una sola vez)
-- =============================================================

create extension if not exists pgcrypto;

-- ---------- Tablas ----------

create table if not exists members (
  id serial primary key,
  name text not null,
  pin_hash text not null,
  is_admin boolean not null default false
);

create table if not exists fund (
  id int primary key default 1 check (id = 1),
  balance numeric not null,
  updated_at timestamptz not null default now()
);

create table if not exists options (
  id serial primary key,
  title text not null,
  description text,
  highlights jsonb not null default '[]',
  link text,
  sort int not null default 0
);

create table if not exists votes (
  member_id int primary key references members(id) on delete cascade,
  option_id int not null references options(id) on delete cascade,
  updated_at timestamptz not null default now()
);

-- ---------- RLS ----------

alter table members enable row level security;
alter table fund enable row level security;
alter table options enable row level security;
alter table votes enable row level security;

-- Lectura pública de fund, options y votes. members NO tiene policy de
-- lectura: el pin_hash nunca es accesible con la anon key.
create policy "read fund"    on fund    for select using (true);
create policy "read options" on options for select using (true);
create policy "read votes"   on votes   for select using (true);
-- (Sin policies de insert/update/delete: toda escritura pasa por RPC)

-- Vista pública de integrantes (sin pin_hash). security_invoker = off para
-- que la vista (owner: postgres) pueda leer members saltando su RLS,
-- exponiendo únicamente id, name e is_admin.
create or replace view members_public
  with (security_invoker = off) as
  select id, name, is_admin from members;

grant select on members_public to anon, authenticated;

-- ---------- RPCs (única vía de escritura) ----------

create or replace function cast_vote(p_member_id int, p_pin text, p_option_id int)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  m members%rowtype;
begin
  select * into m from members where id = p_member_id;
  if not found then
    return json_build_object('ok', false, 'error', 'Integrante no encontrado');
  end if;
  if m.pin_hash <> crypt(p_pin, m.pin_hash) then
    return json_build_object('ok', false, 'error', 'PIN incorrecto');
  end if;
  if not exists (select 1 from options where id = p_option_id) then
    return json_build_object('ok', false, 'error', 'Opción no válida');
  end if;

  insert into votes (member_id, option_id, updated_at)
  values (p_member_id, p_option_id, now())
  on conflict (member_id)
  do update set option_id = excluded.option_id, updated_at = now();

  return json_build_object('ok', true);
end;
$$;

create or replace function update_balance(p_member_id int, p_pin text, p_balance numeric)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  m members%rowtype;
begin
  select * into m from members where id = p_member_id;
  if not found then
    return json_build_object('ok', false, 'error', 'Integrante no encontrado');
  end if;
  if m.pin_hash <> crypt(p_pin, m.pin_hash) then
    return json_build_object('ok', false, 'error', 'PIN incorrecto');
  end if;
  if not m.is_admin then
    return json_build_object('ok', false, 'error', 'No tienes permisos para actualizar el saldo');
  end if;
  if p_balance is null or p_balance < 0 then
    return json_build_object('ok', false, 'error', 'Monto no válido');
  end if;

  update fund set balance = p_balance, updated_at = now() where id = 1;

  return json_build_object('ok', true);
end;
$$;

revoke all on function cast_vote(int, text, int) from public;
revoke all on function update_balance(int, text, numeric) from public;
grant execute on function cast_vote(int, text, int) to anon, authenticated;
grant execute on function update_balance(int, text, numeric) to anon, authenticated;
