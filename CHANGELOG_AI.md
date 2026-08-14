# Histórico do Projeto

> Ordem cronológica inversa (mais recente no topo). A partir de 2026-08-11 as entradas
> refletem trabalho de sessão de agente de IA registrado com evidência direta (commits,
> deploys verificados, testes reais). Antes disso, ver "Linha de base histórica" ao final —
> reconstruída a partir do `git log`, sem acesso a decisões não documentadas em commit.

## 2026-08-14T07:20:00-03:00 — Implantação da memória operacional portátil

- **Agente/ambiente:** Claude Code (sessão longa, múltiplas tarefas)
- **Solicitação:** usuário pediu (via 3 arquivos `.md` colados) a criação de
  `PROJECT_CONTEXT.md`, `CHANGELOG_AI.md`, `PROJECT_LESSONS.md`, `PROJECT_SKILLS.md` e
  regra persistente equivalente, com auditoria real como base.
- **Estado anterior:** nenhum desses documentos existia; nenhum `CLAUDE.md`/`AGENTS.md`
  no repositório.
- **Alterações realizadas:** criados os 4 documentos com base em inspeção real do
  repositório (estrutura, `package.json`, `README.md`, lista de migrations, lista de
  edge functions implantadas via MCP, `git log`) e no histórico direto desta sessão.
  Criado `CLAUDE.md` com a regra de leitura/atualização obrigatória.
- **Arquivos afetados:** `PROJECT_CONTEXT.md`, `CHANGELOG_AI.md`, `PROJECT_LESSONS.md`,
  `PROJECT_SKILLS.md`, `CLAUDE.md` (novos).
- **Decisões e justificativas:** pedido original também mencionava criar uma pasta em
  `C:\Projetos` e um novo repositório GitHub — identificado como incompatível com o
  ambiente real (sessão Linux, repositório já existente e sincronizado) e confirmado com
  o usuário antes de prosseguir só com os documentos.
- **Validação executada:** inspeção manual do repositório (`ls`, `git log`,
  `list_edge_functions` via MCP); não houve mudança de código de produto nesta entrada.
- **Impactos e compatibilidade:** nenhum — só documentação.
- **Pendências/riscos:** cobertura da auditoria é parcial (ver `PROJECT_CONTEXT.md` —
  áreas marcadas "não auditado", como `whatsapp-webhook`, `client-onboarding` e os
  workflows n8n).
- **Próximo passo recomendado:** auditoria dedicada das áreas não cobertas; manter os
  4 documentos atualizados a cada tarefa relevante daqui pra frente.
- **Referência Git:** branch `claude/vps-access-connection-z05wyj`.

## 2026-08-14T06:58:01+00:00 — Automação da nota de pesar (cliente Vagner Filho)

- **Solicitação:** detectar automaticamente pedido de "nota de pesar" no grupo de
  WhatsApp do cliente Vagner Filho (foto + nome de pessoa) e automatizar a criação da
  peça no Canva.
- **Estado anterior:** grupos de cliente só geravam aviso genérico pro dono, sem ação
  automática.
- **Alterações realizadas:** `handleVagnerFilhoNotaDePesar` — cria tarefa no CRM
  (departamento design, prioridade alta) e avisa o responsável por WhatsApp; tenta gerar
  cópia renomeada no Canva via `createCanvaNotaPesarCopy` (stub seguro, sem credenciais
  configuradas ainda). `normalizePayload` ajustado pra não descartar imagem sem legenda
  em GRUPO (necessário pra detectar a foto).
- **Decisões e justificativas:** pesquisa nos docs oficiais do Canva confirmou que edição
  automática de elementos dentro de um design (troca de nome/foto) só é possível via API
  de autofill, exclusiva de contas Enterprise — o cliente não tem esse plano. Optou-se por
  automatizar o que é possível (cópia + renome + tarefa + aviso) e deixar a edição
  criativa final manual, em vez de prometer uma automação completa inviável.
- **Arquivos afetados:** `supabase/functions/agent-whatsapp/index.ts`.
- **Validação executada:** `deno check` sem novos erros (24, igual ao baseline). Deploy
  v42 verificado byte a byte (diff + md5sum) contra o fonte.
- **Impactos e compatibilidade:** mudança em `normalizePayload` é escopada só pra
  mensagens de grupo — fluxo 1:1 com cliente mantém comportamento antigo (imagem sem
  legenda continua ignorada), sem risco de regressão.
- **Pendências/riscos:** só cobre foto+legenda na mesma mensagem (se o nome vier em
  mensagem separada depois da foto, não é correlacionado ainda). Cópia automática no
  Canva não testada contra API real (sem credenciais).
- **Próximo passo recomendado:** cliente criar a integração OAuth no Canva Developers;
  avaliar se o padrão real de uso separa foto e nome em mensagens distintas.
- **Referência Git:** commit `cc7f1d9`.

## 2026-08-14T00:38:11+00:00 — Rename Hermes → Tettolino + ferramenta search_team

- **Solicitação:** corrigir caso real em que o assistente não encontrava um membro da
  equipe ("Karol") por falta de ferramenta de busca; renomear o assistente pro usuário
  final.
- **Alterações realizadas:** nova tool `search_team` (fuzzy match, mesmo padrão de
  `search_clients`); regra do system prompt ampliada pra nunca dizer "não encontrei" sem
  buscar antes; rename "Hermes" → "Tettolino" em todo texto voltado pro usuário
  (identidade do assistente, mensagens de fallback, labels em Mensagens/Equipe/IA).
  Identificadores internos de código não foram renomeados.
- **Arquivos afetados:** `supabase/functions/agent-whatsapp/index.ts`,
  `src/pages/AiPage.tsx`, `src/pages/InboxPage.tsx`, `src/pages/TeamPage.tsx`.
- **Validação executada:** teste real via webhook — "quem é a Karol?" passou a responder
  cargo/função corretamente. Deploy v41 verificado byte a byte.
- **Referência Git:** commit `3fb1f26`.

## 2026-08-14T00:05:43+00:00 — Base de conhecimento (knowledge_base)

- **Solicitação:** dar ao Tettolino uma "memória" pesquisável pra estudar antes de
  responder, alimentada via CRM, também usada pelo bot de cliente.
- **Alterações realizadas:** tabela `knowledge_base` (categoria, audiência
  hermes/clients/both, importância, ativo), busca full-text em português com `unaccent`
  (achado durante teste: busca sem acento não batia com conteúdo acentuado — corrigido
  com a extensão `unaccent` nos dois lados, indexação e query, via função RPC
  `search_knowledge_base`). Nova tool `search_knowledge` pro Tettolino; bloco de
  conhecimento injetado na geração de resposta pro cliente (`generateWithGroq`). Nova aba
  "Base de Conhecimento" em `AiPage.tsx` com CRUD completo.
- **Arquivos afetados:** `supabase/migrations/20260813160000_knowledge_base.sql`,
  `supabase/migrations/20260814000000_knowledge_base_unaccent_search.sql`,
  `supabase/functions/agent-whatsapp/index.ts`, `src/hooks/useKnowledgeBase.ts`,
  `src/pages/AiPage.tsx`, `src/types/database.ts`.
- **Validação executada:** teste real com fato inventado ("37 dias e meio") pra provar
  que a resposta vinha da busca e não do modelo chutando; confirmado antes/depois do fix
  de acento. Deploy v39/v40 verificado byte a byte. Dados de teste removidos ao final.
- **Referência Git:** commit `c459d95`.

## 2026-08-13T21:46:02+00:00 — Silenciar grupos internos da equipe

- **Solicitação:** 4 grupos internos de produção não devem gerar aviso automático pro
  dono, exceto quando ele é marcado ou é urgência que só ele resolve.
- **Alterações realizadas:** `INTERNAL_GROUP_JIDS` (descobertos via chamada pontual ao
  endpoint `fetchAllGroups` da Evolution API, função de debug desativada em seguida);
  detecção de `@mencao` via `contextInfo.mentionedJid`; classificador de urgência mais
  rígido (`assessInternalGroupUrgency`) só pros grupos internos.
- **Arquivos afetados:** `supabase/functions/agent-whatsapp/index.ts`.
- **Validação executada:** 3 cenários reais testados via webhook simulado (rotina —
  silenciou; menção — avisou; urgência sem menção — avisou via classificador). Deploy
  v37/v38 verificado byte a byte.
- **Referência Git:** commit `b9ffb74`.

## 2026-08-13T15:14:56+00:00 — Detecção de resposta manual da equipe (fromMe)

- **Solicitação (repetida 3x pelo usuário até a causa raiz real ser encontrada):** IA
  continuava respondendo rápido mesmo com secretária respondendo manualmente.
- **Causa raiz:** webhook `fromMe: true` (mensagens que saem da conta da agência) era
  descartado incondicionalmente — incluía tanto ecos das próprias respostas automáticas
  quanto respostas manuais reais digitadas pela equipe direto no WhatsApp (não pelo CRM).
  A checagem de "humano já respondeu" nunca via essas últimas.
- **Alterações realizadas:** `evolution_message_id` armazenado em toda mensagem que o
  sistema manda; `handlePossibleHumanReply` compara o `messageId` recebido com os que o
  próprio sistema mandou — se bate, é eco (ignora); se não bate, é resposta manual real
  (loga como `outbound`/`is_ai:false`).
- **Arquivos afetados:** `supabase/functions/agent-whatsapp/index.ts`,
  `supabase/functions/flush-pending-replies/index.ts`,
  `supabase/migrations/20260813150000_evolution_message_id_and_cron_revert.sql`.
- **Validação executada:** teste ponta a ponta com cliente fictício — resposta manual
  simulada logada corretamente, resposta pendente da IA foi `skipped`; eco com messageId
  conhecido não duplicou. Deploy v36 verificado byte a byte.
- **Referência Git:** commit `19cbc75`.

## 2026-08-12T13:29:08+00:00 a 2026-08-13T15:14:56+00:00 — Delay de resposta: 90s → 45s → 90s (idas e voltas)

- **Solicitação:** ajustar tempo de espera antes da IA responder cliente, pra dar tempo
  da equipe responder manualmente primeiro.
- **Alterações realizadas:** delay começou em 90s (`c1c4d35`), estendido pro funil de
  lead novo (`37c81ae`), janela de "equipe ativa" ampliada pra 15min bidirecional
  (`9ef2d4c`), reduzido a pedido explícito pra 45s com cron mais frequente (`10d73fb`),
  **revertido a 90s** (cron de volta a 30s) após diagnóstico do bug de `fromMe` acima —
  o usuário testava via seu próprio número de operador, que sempre roteia pro Tettolino
  (instantâneo por design), confundindo o diagnóstico até a causa raiz real do `fromMe`
  ser achada.
- **Decisão vigente:** 90s, cron a cada 30s.
- **Referência Git:** commits `c1c4d35`, `37c81ae`, `9ef2d4c`, `10d73fb`, `19cbc75`.

## 2026-08-12T03:47:04+00:00 a 03:57:16+00:00 — Consolidação de menu, telefone da equipe, WhatsApp+Mensagens

- **Solicitação:** mesclar itens duplicados do menu (CRM+Clientes, Tarefas+Conteúdo,
  WhatsApp IA+Mensagens), adicionar telefone de WhatsApp no cadastro de equipe (pro
  Tettolino/Hermes reconhecer quem é da equipe).
- **Alterações realizadas:** páginas mescladas com abas (`CrmPage`, `ProjectsPage`,
  `InboxPage`); campo `whatsapp_phone` em `users`/`TeamPage`; menu reorganizado com
  WhatsApp em 2º lugar.
- **Referência Git:** commits `3e89e49`, `0eb3cd7`.

## 2026-08-11T22:06:40+00:00 a 23:14:29+00:00 — Correções de duplicidade e confirmação do Hermes/Tettolino

- **Achados corrigidos:** `send_message` criando conversa fantasma "Equipe" por não
  checar cliente/operador antes; busca de nome intolerante a erro de digitação/
  transcrição de áudio; `send_message` pedindo confirmação por viés de few-shot do
  próprio histórico de conversa (corrigido reforçando a regra + limpando
  `hermes_messages`); duplicidade de conversa interna por dedupe de telefone sem
  variantes de 9º dígito.
- **Referência Git:** commits `960dcfd`, `bd134fb`, `9ae38af`, `06cd586`.

## 2026-08-11T17:25:24+00:00 a 20:54:30+00:00 — Nascimento do agente "Hermes" (Tettolino) e monitoramento de grupo

- **Alterações realizadas, em ordem:** schema inicial (`3f7f73d`) → implementação do
  agente operacional Hermes (`93c34d0`) → reconhecimento de hierarquia dono/equipe +
  Evolution API self-hosted (`6ea3be8`) → normalização de telefone BR com/sem 9º dígito
  (`c7ff787`) → `hermes_messages` como memória de curto prazo, limite de 20 mensagens
  (`dcca849`, `67d4442`) → tools de escrita (`create_client`, `delete_client`,
  `check_messages`, tarefas por departamento) (`f4a89b0`, `a1b16a2`, `decf3d8`) → Realtime
  no CRM (`fb8512c`) → bloqueio de duplicidade em `create_client` (`259447a`) → correção
  de trava de `delete_client` em lote (`de260dc`) → `send_message` por comando de texto
  (`aa8661f`) → correção de saudação repetida (`eeffb01`) → `send_message` restrito ao
  dono, motivada por bug real (Karol conseguiu mandar mensagem sem ser dono) (`6560ef7`)
  → horário comercial no atendimento (`1fc2e3d`) → monitoramento de grupo, nunca responde
  dentro do grupo (`fbfeccb`).
- **Evidência:** mensagens de commit descrevem bugs reais corrigidos nesse período
  (`6560ef7` explicitamente cita "bug real: Karol conseguiu mandar mensagem";
  `259447a`/`de260dc` também citam "bug real em uso").
- **Referência Git:** `3f7f73d` → `fbfeccb` (14 commits, todos em 2026-08-11).

## 2026-08-06T21:34:38-03:00 a 2026-08-07T09:18:44-03:00 — CRM funcional: agente WhatsApp real, financeiro, hierarquia

- **Alterações realizadas:** primeira versão real do agente de WhatsApp + Inbox de
  mensagens + calendário + financeiro (`e5f67a1`), Tarefas/Sugestões com visões
  Tabela/Calendário (`74583b1`), Dashboard completo + visão do cliente (`083f255`),
  Tarefas mescladas dentro de Operações (`e4e82af`), anexos no Storage (`dc3fa22`),
  hierarquia Master/Gerente/Funcionário + ponto + financeiro + correção de RLS
  (`bc01d40`), separação Conteúdo/Tarefas + correção da lista da Equipe (`8715476`).
- **Referência Git:** `e5f67a1` → `8715476` (7 commits).

## 2026-08-04T07:13:22-03:00 a 13:32:07-03:00 — Hierarquia de papéis e kanban

- **Alterações realizadas:** modal de Solicitação com edição e reversão de coluna
  (`2f05be8`), drag-and-drop no kanban (`c6e7fca`), hierarquia de papéis + exclusão pelo
  dono + atribuições + alertas + relatório de tempo (`6a4ec9e`).
- **Referência Git:** `2f05be8`, `c6e7fca`, `6a4ec9e`.

## 2026-07-30T04:01:08-03:00 a 2026-07-31T10:15:57-03:00 — Origem do projeto

- **Alterações realizadas:** `0986d28` "Implement TettoFlow AI OS Phase 0 MVP" (primeiro
  commit do repositório), seguido de UI responsiva mobile + briefing + upload Drive
  (`4033773`), workflow do agente de WhatsApp + roteador de intenção (`d734896`).
- **Inferência, confiança média:** o projeto nasceu como MVP de CRM + pipeline de
  conteúdo, com a intenção de um agente de WhatsApp presente desde o 3º commit da
  história — mas a versão daquele agente inicial não foi comparada em detalhe com a
  implementação atual (`agent-whatsapp`) nesta auditoria.
- **Referência Git:** `0986d28`, `4033773`, `d734896`.

---

## Nota sobre cobertura

Esta linha de base cobre 100% dos 55 commits da branch `claude/vps-access-connection-z05wyj`
(verificado via `git log --format='%h %ad %s' --date=iso-strict`, 2026-08-14). Não foram
lidos os diffs completos de cada commit individualmente — o resumo acima usa as mensagens
de commit como evidência primária; para decisões de arquitetura específicas não
documentadas na mensagem do commit, seria necessário inspecionar o diff correspondente.

Em algum ponto próximo a 2026-08-14T00:58, houve trabalho em paralelo em `origin/main`
(fora desta sessão) que adicionou controle de acesso e convite de equipe com papel
pré-configurado (`22149e3`), mesclado no commit `d201cd0`. **Não auditado a fundo** —
autor e sessão responsáveis por esse trabalho não foram investigados aqui.
