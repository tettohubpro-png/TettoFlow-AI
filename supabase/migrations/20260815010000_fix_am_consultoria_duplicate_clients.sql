-- "AM Consultoria" tinha 3 cadastros: o ATIVO com telefone quebrado
-- (98559-4885, sem DDD) e um INATIVO (lead) com o telefone certo
-- (559885594885), onde a conversa real de fato acontece. Corrige: o
-- cadastro com o telefone certo vira o ativo; o que tinha telefone
-- quebrado vira arquivado (o terceiro já estava arquivado).
update public.clients set status = 'ACTIVE', updated_at = now()
where id = 'edee1165-ac1d-4a1f-a11a-4bbfa690bbf6'; -- "Am Consultoria Atendimento", telefone certo

update public.clients set status = 'ARCHIVED', archived_at = now(), updated_at = now()
where id = '13d03eff-586c-4b2a-ac3d-6ea11929d211'; -- "AM Consultoria", telefone quebrado
