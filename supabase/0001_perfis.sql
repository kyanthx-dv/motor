-- Motor · rede social · etapa 1: perfis.
-- Como usar: Supabase → SQL Editor → New query → cole este arquivo inteiro → Run. Pode rodar de novo sem estragar nada.
-- Regras: qualquer pessoa LÊ perfis; só o dono CRIA e EDITA o próprio. Ninguém apaga perfil pela API (apagar conta é pelo Auth).

create table if not exists public.perfis (
  id        uuid primary key references auth.users (id) on delete cascade,
  usuario   text not null unique check (usuario ~ '^[a-z0-9_]{3,20}$'),
  nome      text check (nome is null or char_length(nome) <= 40),
  bio       text check (bio is null or char_length(bio) <= 280),
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

drop policy if exists "perfis visiveis a todos" on public.perfis;
create policy "perfis visiveis a todos" on public.perfis for select using (true);

drop policy if exists "dono cria o proprio perfil" on public.perfis;
create policy "dono cria o proprio perfil" on public.perfis for insert to authenticated with check (auth.uid() = id);

drop policy if exists "dono edita o proprio perfil" on public.perfis;
create policy "dono edita o proprio perfil" on public.perfis for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

revoke all on public.perfis from anon, authenticated;
grant select on public.perfis to anon, authenticated;
grant insert, update on public.perfis to authenticated;
