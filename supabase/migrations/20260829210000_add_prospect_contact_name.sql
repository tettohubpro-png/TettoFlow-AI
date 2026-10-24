alter table public.clients add column if not exists contact_name text;
comment on column public.clients.contact_name is 'Nome do dono/responsável identificado na prospecção (pesquisa pública) — informativo, distinto de client_contacts (contato formal de cliente ativo).';
