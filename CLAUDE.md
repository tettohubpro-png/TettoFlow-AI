# Instruções para agentes de IA — TettoFlow AI OS

Este projeto é o sistema operacional interno da agência TettoHub (CRM + agente de IA
"Tettolino" no WhatsApp), **em uso real de produção**, não um protótipo. Trate mudanças
com o cuidado correspondente — especialmente em `supabase/functions/agent-whatsapp/`, o
webhook único que atende clientes reais.

## Memória operacional obrigatória

Antes de trabalhar, leia `PROJECT_CONTEXT.md`, as entradas pertinentes de
`CHANGELOG_AI.md`, `PROJECT_LESSONS.md` e `PROJECT_SKILLS.md`. Identifique e carregue as
skills exigidas para a tarefa (ver matriz em `PROJECT_SKILLS.md`). Antes de concluir,
atualize o contexto, o histórico, as lições e o catálogo de skills sempre que aplicável.
Não repita uma abordagem registrada como falha em `PROJECT_LESSONS.md` sem nova evidência
e justificativa.

Regras específicas que já causaram incidente real e valem a pena repetir aqui:

- **Nunca considere um deploy de edge function concluído sem verificação byte a byte**
  (`diff` + `md5sum` entre o arquivo fonte e o que foi buscado de volta do Supabase via
  `get_edge_function`). Ver `PROJECT_LESSONS.md` LES-0001. Para `agent-whatsapp/index.ts`
  (arquivo grande), delegue o deploy+verificação a um subagente com instruções explícitas
  de ler o arquivo do disco (nunca reconstruir de memória).
- **`deno check` em `agent-whatsapp/index.ts` sempre reporta uma dúzia de erros
  pré-existentes** do tipo `SupabaseClient<any,"public",any>` — não são bugs reais (ver
  LES-0007). Compare a contagem antes/depois da mudança; investigue qualquer erro de tipo
  *diferente* desse padrão antes de deployar.
- Ao investigar um bug relatado repetidamente pelo usuário, não reafirme a mesma
  explicação — na 2ª/3ª repetição, reinvestigue com ceticismo (ver LES-0006).

## Regra de encerramento de tarefa

Depois de implementar e validar uma mudança, mas antes de responder que terminou:
1. Atualize `PROJECT_CONTEXT.md` com o novo estado, se mudou.
2. Acrescente uma entrada em `CHANGELOG_AI.md` (nunca reescreva o histórico anterior).
3. Registre lição nova em `PROJECT_LESSONS.md` se houve erro, descoberta ou solução
   reutilizável (ver critérios no próprio arquivo).
4. Atualize `PROJECT_SKILLS.md` se surgiu necessidade de skill nova.
5. Informe, na resposta final, que os documentos foram atualizados (ou por que não foi
   necessário).

## Convenções

- Comentários e nomes de domínio em português; identificadores técnicos em inglês.
- Migrations: `AAAAMMDDHHmmss_descricao.sql`, aplicadas via MCP `apply_migration` e
  espelhadas em `supabase/migrations/`.
- Mudanças de nome pro usuário final (branding, ex: "Hermes" → "Tettolino") não implicam
  renomear identificadores internos de código/tabela — mantém o diff pequeno.
- Commits em português, descrevendo o quê e por quê (não só "ajustes"), com
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
