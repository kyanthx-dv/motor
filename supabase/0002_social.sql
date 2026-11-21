-- Motor · rede social · etapa 2: seguir, curtir/favoritar e comentar.
-- Como usar: Supabase → SQL Editor → cole tudo → Run. Pode rodar de novo sem estragar nada.
-- Regras: todos LEEM; so o proprio usuario cria/apaga o que e dele (RLS). Ninguem edita comentario pela API.

create table if not exists public.seguidores (
  seguidor  uuid not null references public.perfis (id) on delete cascade,
  seguido   uuid not null references public.perfis (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (seguidor, seguido),
  check (seguidor <> seguido)
);
create index if not exists seguidores_seguido_idx on public.seguidores (seguido);

create table if not exists public.curtidas (
  usuario   uuid not null references public.perfis (id) on delete cascade,
  alvo_tipo text not null check (alvo_tipo in ('jogo', 'post', 'asset')),
  alvo_id   text not null check (char_length(alvo_id) between 1 and 64),
  tipo      text not null check (tipo in ('curtida', 'favorito')),
  criado_em timestamptz not null default now(),
  primary key (usuario, alvo_tipo, alvo_id, tipo)
);
create index if not exists curtidas_alvo_idx on public.curtidas (alvo_tipo, alvo_id, tipo);

create table if not exists public.comentarios (
  id        uuid primary key default gen_random_uuid(),
  autor     uuid not null references public.perfis (id) on delete cascade,
  alvo_tipo text not null check (alvo_tipo in ('jogo', 'post', 'asset')),
  alvo_id   text not null check (char_length(alvo_id) between 1 and 64),
  pai       uuid references public.comentarios (id) on delete cascade,
  texto     text not null check (char_length(btrim(texto)) between 1 and 500),
  criado_em timestamptz not null default now()
);
create index if not exists comentarios_alvo_idx on public.comentarios (alvo_tipo, alvo_id, criado_em);
create index if not exists comentarios_autor_idx on public.comentarios (autor);
create index if not exists curtidas_usuario_idx on public.curtidas (usuario);

alter table public.seguidores enable row level security;
alter table public.curtidas enable row level security;
alter table public.comentarios enable row level security;

drop policy if exists "seguidores visiveis" on public.seguidores;
create policy "seguidores visiveis" on public.seguidores for select using (true);
drop policy if exists "seguir como si mesmo" on public.seguidores;
create policy "seguir como si mesmo" on public.seguidores for insert to authenticated with check ((select auth.uid()) = seguidor);
drop policy if exists "deixar de seguir" on public.seguidores;
create policy "deixar de seguir" on public.seguidores for delete to authenticated using ((select auth.uid()) = seguidor);

drop policy if exists "curtidas visiveis" on public.curtidas;
create policy "curtidas visiveis" on public.curtidas for select using (true);
drop policy if exists "curtir como si mesmo" on public.curtidas;
create policy "curtir como si mesmo" on public.curtidas for insert to authenticated with check ((select auth.uid()) = usuario);
drop policy if exists "descurtir" on public.curtidas;
create policy "descurtir" on public.curtidas for delete to authenticated using ((select auth.uid()) = usuario);

drop policy if exists "comentarios visiveis" on public.comentarios;
create policy "comentarios visiveis" on public.comentarios for select using (true);
drop policy if exists "comentar como si mesmo" on public.comentarios;
create policy "comentar como si mesmo" on public.comentarios for insert to authenticated with check ((select auth.uid()) = autor);
drop policy if exists "apagar o proprio comentario" on public.comentarios;
create policy "apagar o proprio comentario" on public.comentarios for delete to authenticated using ((select auth.uid()) = autor);

revoke all on public.seguidores, public.curtidas, public.comentarios from anon, authenticated;
grant select on public.seguidores, public.curtidas, public.comentarios to anon, authenticated;
grant insert, delete on public.seguidores, public.curtidas, public.comentarios to authenticated;
