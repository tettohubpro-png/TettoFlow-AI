# Histórico do Projeto

> Ordem cronológica inversa (mais recente no topo). A partir de 2026-08-11 as entradas
> refletem trabalho de sessão de agente de IA registrado com evidência direta (commits,
> deploys verificados, testes reais). Antes disso, ver "Linha de base histórica" ao final —
> reconstruída a partir do `git log`, sem acesso a decisões não documentadas em commit.

## 2026-08-16T00:00:00+00:00 — Corrige entrega de `send_message` por telefone cru (DDI + 9º dígito) e descobre saldo Anthropic esgotado (v49-v52)

- **Solicitação:** usuário reportou de novo "não está funcionando corretamente", com
  print de 3 mensagens sobre agendamento de corte de cabelo mostradas como enviadas no
  CRM mas nunca chegando no WhatsApp do destinatário (número "989992331897"). Depois
  perguntou diretamente se era problema de conexão com o WhatsApp.
- **Investigação:** `conversation_messages` mostrava as 3 mensagens com
  `evolution_message_id: null` — Evolution nunca confirmou entrega, mas o CRM registrava
  como enviada sem aviso nenhum ao usuário. 1ª causa encontrada: `to_phone` cru sem DDI
  "55". Corrigido e retestado — ainda falhava. Causa raiz de verdade, achada via função
  de debug temporária (`debug-check-number`, chamando `/chat/whatsappNumbers/{instance}`
  da Evolution direto): o número tem conta WhatsApp registrada no formato ANTIGO, sem o
  9º dígito moderno (JID real `559892331897`, não `5598992331897`). A Evolution aceitava
  o envio pro número errado sem erro, e o código nunca conferia se o `evolution_message_id`
  realmente veio antes de dizer "enviado".
- **Alterações realizadas:** `to_phone` agora normaliza DDI sempre; nova função
  `resolveDeliverableNumber()` consulta `/chat/whatsappNumbers/{instance}` antes de
  enviar e usa o JID confirmado pela Evolution quando existe; `send_message` agora
  retorna `delivered` (baseado em ter recebido `evolution_message_id` real), e o prompt
  do Tettolino foi ajustado pra nunca afirmar sucesso quando `delivered: false`.
- **Descoberta paralela (não é bug de código):** durante os testes, TODAS as mensagens
  passaram a falhar com "Deu ruim aqui do meu lado", inclusive um simples "oi". Como
  `get_logs` não expõe `console.error`, foi feito um deploy temporário (v51) que devolvia
  o erro real na resposta pra diagnosticar, revelando: **"Your credit balance is too low
  to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase
  credits."** — o saldo da conta Anthropic esgotou. Deploy revertido ao texto genérico
  limpo imediatamente (v52). **Ação exclusiva do usuário**: recarregar créditos em
  console.anthropic.com → Plans & Billing.
- **Arquivos afetados:** `supabase/functions/agent-whatsapp/index.ts`.
- **Validação executada:** `deno check` seguiu em 24 erros (mesmo padrão pré-existente,
  LES-0007), nenhum erro novo. Mecanismo de resolução de JID confirmado tecnicamente
  correto via chamada direta à Evolution. Entrega ponta a ponta do fluxo completo ainda
  **não confirmada** pós-fix porque o saldo da API esgotou no meio do teste — pendente
  reconfirmação assim que a conta for recarregada.
- **Impactos e compatibilidade:** função de debug temporária (`debug-check-number`) foi
  neutralizada de volta pra stub 410 com `verify_jwt: true` (versão 3) antes do fim da
  sessão — não deixada acessível em produção.
- **Referência Git:** commit a ser criado nesta tarefa.

## 2026-08-15T02:32:00+00:00 — Corrige cliente "AM Consultoria" duplicado e telefone no cadastro errado (v48)

- **Solicitação:** usuário pediu pra verificar se as imagens enviadas chegaram na
  conversa real do cliente; depois de investigar, pediu pra corrigir os cadastros
  duplicados (ativar o certo, arquivar os errados).
- **Investigação:** 3 cadastros de "AM Consultoria". O marcado ACTIVE tinha telefone
  incompleto (`98559-4885`, sem DDD). O telefone real (`559885594885`, com histórico de
  conversa real) estava num cadastro INACTIVE (lead duplicado). `resolveClientRef` não
  excluía arquivados da busca por nome, então mesmo arquivando os errados a ambiguidade
  continuaria.
- **Alterações realizadas:** cadastro com telefone certo promovido a ACTIVE; os dois
  errados marcados ARCHIVED. `resolveClientRef` ganhou parâmetro `excludeArchived`,
  usado em `send_message`/`create_operation` (não em `delete_client`, que precisa achar
  cliente já arquivado).
- **Arquivos afetados:** `supabase/functions/agent-whatsapp/index.ts`,
  `supabase/migrations/20260815010000_fix_am_consultoria_duplicate_clients.sql`.
- **Validação executada:** `deno check` sem erro novo. Testado ponta a ponta em produção:
  `send_message` com "am consultoria" resolveu sem ambiguidade e a mensagem de teste
  ("oi teste") apareceu na MESMA thread da conversa real do cliente (client_id
  confirmado batendo com o histórico real). Deploy v48 verificado byte a byte.
- **Impactos e compatibilidade:** mensagem de teste real ("oi teste") foi enviada pro
  WhatsApp real do cliente durante a validação — não dava pra testar esse cenário
  específico (duplicidade de cadastro real) com cliente fictício.
- **Referência Git:** commit a ser criado nesta tarefa.

## 2026-08-14T20:30:00+00:00 — Corrige fotos sem legenda descartadas + resposta quebrando com múltiplas imagens (v46, v47)

- **Solicitação:** dono precisava urgentemente mandar 2 imagens reais pra um cliente;
  reportou que o Tettolino negava ter recebido imagem mesmo com a feature v45 já no ar.
- **Investigação:** confirmado nos logs que as mensagens de imagem chegavam (~100ms de
  execução, rápido demais pra terem passado pelo LLM) mas eram descartadas — causa raiz:
  `normalizePayload` só deixava passar imagem sem legenda em GRUPO, não no 1:1 com
  operador; WhatsApp manda várias fotos selecionadas juntas como mensagens separadas,
  a legenda chega numa mensagem de texto puro depois.
- **Ação imediata (enquanto corrigia):** orientado o dono a usar o encaminhar nativo do
  WhatsApp pras 2 imagens urgentes, sem depender do Tettolino.
- **Alterações realizadas:** tabela `operator_pending_media` — foto sem legenda vira
  "mídia pendente" (fila), confirmada rápido sem LLM; próxima mensagem de texto busca as
  fotos pendentes dos últimos 5min (`resolveOperatorMediaContext`) e as anexa ao
  `send_message`. `normalizePayload` deixa passar imagem sem legenda em qualquer
  contexto (grupo ou 1:1) — cliente 1:1 sem legenda ganha resposta genérica de
  agradecimento pelo mesmo mecanismo de delay, em vez de rodar Groq com mensagem vazia.
  Histórico enviesado do Tettolino (`hermes_messages`, 4 negações repetidas de imagem)
  limpo manualmente. Testando essa correção (v46), achado um SEGUNDO bug: encaminhar 2+
  imagens quebrava a resposta inteira sem cair em nenhum catch (busca sequencial, timeout
  de 8s por imagem, somado); corrigido trocando o loop sequencial por `Promise.all` +
  try/catch ao redor de todo o bloco (v47).
- **Arquivos afetados:** `supabase/functions/agent-whatsapp/index.ts`,
  `supabase/migrations/20260814200000_operator_pending_media.sql`.
- **Validação executada:** `deno check` sem erro novo além do padrão conhecido. Testado
  ponta a ponta 2x: antes da correção 2, 2 imagens + instrução quebrava com "Deu ruim";
  depois, respondeu corretamente que as imagens falharam (IDs fictícios de propósito) sem
  derrubar a resposta. Deploys v46 e v47 verificados byte a byte. Dados de teste e
  entradas enviesadas do histórico removidos.
- **Impactos e compatibilidade:** cliente 1:1 mandando imagem sem legenda agora recebe
  uma resposta (antes era ignorado silenciosamente) — mudança de comportamento
  intencional.
- **Pendências/riscos:** o caminho de sucesso real (imagem de verdade sendo buscada e
  enviada via Evolution API) não foi validado com mídia real nesta sessão — só testado
  com IDs de mensagem fictícios (que corretamente falham e caem pra texto). Confirmar com
  o usuário assim que ele testar com uma foto real.
- **Referência Git:** commit a ser criado nesta tarefa.

## 2026-08-14 — `send_message` do Tettolino passa a encaminhar imagem de verdade (v45)

- **Solicitação:** dono da agência precisava mandar uma foto pro Tettolino com legenda
  nomeando o destinatário e o bot encaminhar a IMAGEM de verdade via Evolution API, não
  só o texto da legenda — caso de uso real: cliente esperando receber a foto.
- **Alterações realizadas (já presentes no arquivo fonte antes desta tarefa, que cobriu
  só deploy + verificação):** `fetchEvolutionMediaBase64` (baixa o base64 da mídia
  recebida no webhook a partir do `messageId`, reaproveitando o mesmo endpoint de
  `transcribeAudio`) e `sendEvolutionImage` (envia via `POST
  /message/sendMedia/{instance}`). `executeWriteTool('send_message', ...)` passou a
  aceitar um `mediaContext` opcional: se a mensagem que disparou o `send_message` veio
  com imagem anexada (`payload.hasImage` / `imageMessageId`), baixa e reenvia a imagem
  com a legenda; se falhar, cai para texto puro e sinaliza `image_forward_failed: true`
  no resultado. `hermesSystemPrompt` (regra 3b) instrui o Tettolino a reportar
  `image_forwarded`/`image_forward_failed` ao usuário. `runHermesAgentLoop` passa
  `mediaContext` só para `send_message` (única ferramenta em
  `HERMES_IMMEDIATE_WRITE_TOOLS`).
- **Arquivos afetados:** `supabase/functions/agent-whatsapp/index.ts`.
- **Validação executada (esta tarefa):** arquivo lido do disco por inteiro (3442
  linhas), deployado verbatim via `deploy_edge_function`, e conferido byte a byte
  contra o arquivo fonte via `get_edge_function` + `diff` + `md5sum` — MATCH na
  primeira tentativa (`f5f2653cc74fe61d3ccaf5c8eecde545`). Nenhuma mudança de código
  feita nesta tarefa — só deploy e verificação.
- **Impactos e compatibilidade:** `send_message` continua owner-only e imediato (sem
  confirmação sim/não), agora com encaminhamento de imagem quando aplicável. Sem
  mudança de schema/banco.
- **Referência Git:** nenhum commit criado nesta tarefa (só deploy de edge function).

## 2026-08-14T14:15:00+00:00 — Delay de 90s + checagem de humano passa a valer fora do horário comercial também

- **Solicitação:** usuário reafirmou (sem print desta vez) que o fluxo de resposta
  "ainda não está fazendo sentido" e que o agente só pode responder se ninguém responder
  em 60-90s; pediu pra usar a memória do projeto e investigar direito.
- **Investigação:** consultado `pending_bot_replies` (confirmou delay de 90s configurado
  corretamente) e `conversation_messages` reais do cliente "AM Consultoria" — achado
  concreto: uma funcionária respondendo ao vivo às 20h08/20h12, e no meio dessa troca
  real o bot mandou a mensagem de horário de atendimento por cima, porque o branch
  `!withinHours` mandava a mensagem na hora, sem delay nem checagem de humano.
- **Causa raiz:** suposição no comentário do código ("fora do horário ninguém vai
  responder mesmo") não é verdadeira na prática.
- **Alterações realizadas:** unificado o envio — dentro ou fora do horário, a resposta
  sempre passa por `scheduleDeferredReply`/`pending_bot_replies` (mesmo delay de 90s,
  mesma checagem de humano ativo). Removidos os branches de envio imediato do fluxo
  principal e do fluxo de lead-intake.
- **Arquivos afetados:** `supabase/functions/agent-whatsapp/index.ts`.
- **Validação executada:** `deno check` — 22 erros (caiu de 24, menos pontos de chamada).
  Teste real via webhook confirmou `pending_bot_replies` criado com delay de 90s; código
  não tem mais branch condicional pro caminho de envio, então o comportamento é
  idêntico pros dois casos por construção. Deploy v44 verificado byte a byte. Dados de
  teste removidos.
- **Impactos e compatibilidade:** clientes que mandam mensagem fora do horário agora
  esperam ~90s pela mensagem de "estamos fechados" em vez de recebê-la instantaneamente
  — mudança de comportamento intencional, consistente com o pedido do usuário.
- **Referência Git:** commit a ser criado nesta tarefa.

## 2026-08-14T13:57:00+00:00 — Corrige loop de confirmação travando o Tettolino

- **Solicitação:** usuário mostrou print com o Tettolino respondendo "Não entendi.
  Confirma essa ação?" de forma idêntica 4 vezes seguidas pra mensagens diferentes;
  também pediu que mensagens claramente destinadas a outro membro da equipe (ex:
  nomeando "Eduarda") não fossem tratadas como ação pra ele executar.
- **Causa raiz:** ação de escrita pendente sem expiração — toda mensagem seguinte do
  operador era forçada a passar por uma checagem estrita de sim/não antes de qualquer
  outra coisa; se não combinasse, repetia o mesmo texto fixo pra sempre.
- **Alterações realizadas:** novo status `superseded` em `agent_actions_log`; quando a
  mensagem não é claramente sim/não, a pendência é superada e a mensagem processada
  normalmente pelo Tettolino (não mais bloqueada). Nova regra 9 no system prompt: recado
  claramente destinado a outra pessoa da equipe não vira tool call nem pede confirmação,
  só um reconhecimento curto.
- **Arquivos afetados:** `supabase/functions/agent-whatsapp/index.ts`,
  `supabase/migrations/20260814090000_agent_actions_log_superseded_status.sql`.
- **Validação executada:** `deno check` sem erro novo além do padrão conhecido (24, igual
  ao baseline). Teste real via webhook confirmou: mensagem "unclear" após pendência não
  repetiu o texto fixo, foi processada como pedido novo; banco confirmou ação antiga
  `superseded` e nova `pending_confirmation` criada corretamente. Deploy v43 verificado
  byte a byte. Dados de teste (mensagens com prefixo "[TESTE QA]" e a mensagem exata
  "nao" usada no teste) removidos ao final, sem tocar no histórico real do usuário.
- **Impactos e compatibilidade:** o fluxo de confirmação sim/não em si não mudou — só o
  caso "não é nem sim nem não" deixou de travar a conversa.
- **Pendências/riscos:** achado incidental durante esta tarefa — o diretório de trabalho
  local tinha sido trocado pra branch `main` (bem atrasada) por um processo externo à
  sessão; voltado pra `claude/vps-access-connection-z05wyj` sem tocar em `main`. `main`
  tem um commit (`beeac19`, ADR-001/002 + testes de RLS) que diverge fortemente do
  trabalho desta branch — reconciliação NÃO foi feita, precisa de decisão humana (ver
  `PROJECT_CONTEXT.md`).
- **Próximo passo recomendado:** decidir com o usuário como reconciliar
  `claude/vps-access-connection-z05wyj` (branch com todo o trabalho de produção,
  incluindo os 4 documentos de contexto portátil) e `main` (tem trabalho próprio de
  auditoria/RLS não presente nesta branch).
- **Referência Git:** commit a ser criado nesta tarefa (ver `git log` mais recente).

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
