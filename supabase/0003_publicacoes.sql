-- Motor · rede social · etapa 3: publicacoes (post/jogo/asset) e notificacoes.
-- Regras: todos LEEM publicacoes; so o autor cria/edita/apaga as suas. Notificacoes sao criadas SO por gatilhos
-- (ninguem forja notificacao pela API); so o destinatario le e marca como lida.

create table if not exists public.publicacoes (
  id        uuid primary key default gen_random_uuid(),
  autor     uuid not null references public.perfis (id) on delete cascade,
  tipo      text not null check (tipo in ('post', 'jogo', 'asset')),
  titulo    text not null check (char_length(btrim(titulo)) between 1 and 80),
  descricao text not null default '' check (char_length(descricao) <= 2000),
  video     boolean not null default false,
  extras    jsonb not null default '{}'::jsonb check (pg_column_size(extras) <= 4096),
  criado_em timestamptz not null default now()
);
create index if not exists publicacoes_tipo_idx on public.publicacoes (tipo, criado_em desc);
create index if not exists publicacoes_autor_idx on public.publicacoes (autor, criado_em desc);

alter table public.publicacoes enable row level security;
drop policy if exists "publicacoes visiveis" on public.publicacoes;
create policy "publicacoes visiveis" on public.publicacoes for select using (true);
drop policy if exists "publicar como si mesmo" on public.publicacoes;
create policy "publicar como si mesmo" on public.publicacoes for insert to authenticated with check ((select auth.uid()) = autor);
drop policy if exists "editar a propria publicacao" on public.publicacoes;
create policy "editar a propria publicacao" on public.publicacoes for update to authenticated using ((select auth.uid()) = autor) with check ((select auth.uid()) = autor);
drop policy if exists "apagar a propria publicacao" on public.publicacoes;
create policy "apagar a propria publicacao" on public.publicacoes for delete to authenticated using ((select auth.uid()) = autor);
revoke all on public.publicacoes from anon, authenticated;
grant select on public.publicacoes to anon, authenticated;
grant insert, delete on public.publicacoes to authenticated;
grant update (titulo, descricao, extras) on public.publicacoes to authenticated;

-- Feed com autor e contagens (respeita as regras de quem consulta).
create or replace view public.publicacoes_feed with (security_invoker = on) as
select p.id, p.autor, p.tipo, p.titulo, p.descricao, p.video, p.extras, p.criado_em,
       pf.usuario as autor_usuario, pf.nome as autor_nome,
       (select count(*) from public.curtidas c where c.alvo_tipo = p.tipo and c.alvo_id = p.id::text and c.tipo = 'curtida') as curtidas,
       (select count(*) from public.curtidas c where c.alvo_tipo = p.tipo and c.alvo_id = p.id::text and c.tipo = 'favorito') as favoritos,
       (select count(*) from public.comentarios m where m.alvo_tipo = p.tipo and m.alvo_id = p.id::text) as comentarios
from public.publicacoes p
join public.perfis pf on pf.id = p.autor;
grant select on public.publicacoes_feed to anon, authenticated;

create table if not exists public.notificacoes (
  id        uuid primary key default gen_random_uuid(),
  destino   uuid not null references public.perfis (id) on delete cascade,
  origem    uuid not null references public.perfis (id) on delete cascade,
  tipo      text not null check (tipo in ('seguir', 'curtida', 'comentario', 'resposta')),
  alvo_tipo text,
  alvo_id   text,
  lida      boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists notificacoes_destino_idx on public.notificacoes (destino, criado_em desc);
create index if not exists notificacoes_origem_idx on public.notificacoes (origem);

alter table public.notificacoes enable row level security;
drop policy if exists "ver as proprias notificacoes" on public.notificacoes;
create policy "ver as proprias notificacoes" on public.notificacoes for select to authenticated using ((select auth.uid()) = destino);
drop policy if exists "marcar como lida" on public.notificacoes;
create policy "marcar como lida" on public.notificacoes for update to authenticated using ((select auth.uid()) = destino) with check ((select auth.uid()) = destino);
revoke all on public.notificacoes from anon, authenticated;
grant select on public.notificacoes to authenticated;
grant update (lida) on public.notificacoes to authenticated;

-- Gatilhos (rodam como dono da tabela; ninguem os chama pela API).
create or replace function public.notif_seguir() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notificacoes (destino, origem, tipo) values (new.seguido, new.seguidor, 'seguir');
  return new;
end $$;

create or replace function public.notif_curtida() returns trigger language plpgsql security definer set search_path = '' as $$
declare dono uuid;
begin
  if new.tipo <> 'curtida' then return new; end if;
  select p.autor into dono from public.publicacoes p where p.id::text = new.alvo_id and p.tipo = new.alvo_tipo;
  if dono is not null and dono <> new.usuario then
    insert into public.notificacoes (destino, origem, tipo, alvo_tipo, alvo_id) values (dono, new.usuario, 'curtida', new.alvo_tipo, new.alvo_id);
  end if;
  return new;
end $$;

create or replace function public.notif_comentario() returns trigger language plpgsql security definer set search_path = '' as $$
declare dono uuid; dono_pai uuid;
begin
  select p.autor into dono from public.publicacoes p where p.id::text = new.alvo_id and p.tipo = new.alvo_tipo;
  if dono is not null and dono <> new.autor then
    insert into public.notificacoes (destino, origem, tipo, alvo_tipo, alvo_id) values (dono, new.autor, 'comentario', new.alvo_tipo, new.alvo_id);
  end if;
  if new.pai is not null then
    select c.autor into dono_pai from public.comentarios c where c.id = new.pai;
    if dono_pai is not null and dono_pai <> new.autor and dono_pai is distinct from dono then
      insert into public.notificacoes (destino, origem, tipo, alvo_tipo, alvo_id) values (dono_pai, new.autor, 'resposta', new.alvo_tipo, new.alvo_id);
    end if;
  end if;
  return new;
end $$;

revoke execute on function public.notif_seguir(), public.notif_curtida(), public.notif_comentario() from public, anon, authenticated;

drop trigger if exists t_notif_seguir on public.seguidores;
create trigger t_notif_seguir after insert on public.seguidores for each row execute function public.notif_seguir();
drop trigger if exists t_notif_curtida on public.curtidas;
create trigger t_notif_curtida after insert on public.curtidas for each row execute function public.notif_curtida();
drop trigger if exists t_notif_comentario on public.comentarios;
create trigger t_notif_comentario after insert on public.comentarios for each row execute function public.notif_comentario();
