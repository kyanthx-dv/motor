-- Motor · etapa 5: foto de perfil (url publica do bucket midia, apenas do nosso Storage).
alter table public.perfis add column if not exists avatar text;
alter table public.perfis drop constraint if exists perfis_avatar_url;
alter table public.perfis add constraint perfis_avatar_url check (avatar is null or (char_length(avatar) <= 300 and avatar like 'https://lzydscfeqzifxtvcpnmz.supabase.co/storage/v1/object/public/midia/%'));
