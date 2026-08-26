# Contexto do Projeto

## Metadados
- Projeto: TettoFlow AI OS (produto interno da agência TettoHub)
- Repositório: `tettohubpro-png/TettoFlow-AI` (GitHub, remote `origin`)
- Última atualização: 2026-08-14T13:58:00+00:00
- Branch de referência: `claude/vps-access-connection-z05wyj` — ver Pendência #0 sobre
  divergência com `main`
- Status geral: em produção, uso ativo diário pela agência (não é protótipo)

## Visão e objetivo
CRM + sistema operacional interno da TettoHub (agência de marketing), com um agente de IA
("Tettolino") que atende clientes e a própria equipe pelo WhatsApp da agência. Substitui
planilhas/grupos soltos por um fluxo único: cadastro de cliente → atendimento automático →
tarefas/operações → financeiro, com o agente de IA cobrindo o atendimento de primeira linha
e automações operacionais (criar tarefa, mandar mensagem, consultar dados) sob comando da
equipe.

## Escopo atual

### Incluído
- CRM de clientes (cadastro, contatos, segmento, contrato, financeiro básico).
- Kanban/lista de tarefas e operações (pipeline de produção de conteúdo).
- Atendimento automático a clientes via WhatsApp (self-hosted Evolution API), com:
  horário comercial, delay de 90s antes de responder (dá tempo pra equipe responder
  manualmente primeiro), detecção de resposta humana manual, qualificação de lead novo,
  handoff de compliance (jurídico/saúde/eleitoral).
- Tettolino: assistente operacional interno via WhatsApp (mesmo número da agência),
  reconhece membros da equipe pelo telefone cadastrado, executa ações no CRM via
  tool-calling (Claude Sonnet 5 + Anthropic Messages API).
- Monitoramento de grupos de WhatsApp (grupos internos da produção ficam silenciosos por
  padrão; grupos de cliente avisam o dono; um grupo de cliente específico — Vagner Filho —
  tem automação dedicada, ver abaixo).
- Base de conhecimento (`knowledge_base`) com busca full-text (accent-insensitive) — tanto
  o Tettolino quanto o bot de cliente consultam antes de responder.
- Controle de acesso/hierarquia de equipe (OWNER/ADMIN/MANAGER/MEMBER/CLIENT), convite com
  papel pré-configurado (mesclado de `origin/main` em `d201cd0`, não foi trabalho desta
  sessão — auditar separadamente se necessário).

### Fora do escopo (hoje)
- Login/atendimento via Google/Gmail (dependia de credenciais OAuth do cliente, nunca
  fornecidas).
- Dashboard de tráfego pago (Meta/Google Ads).
- Portal do cliente (área logada só pra clientes verem status).
- Leitura automática de comprovante de pagamento via IA.
- Edição automática de arte no Canva (nome/foto trocando sozinho) — exigiria conta Canva
  Enterprise (API de autofill), cliente só tem plano inferior. Só a criação da cópia
  renomeada é automatizada (ver módulo Vagner Filho abaixo).

## Usuários e casos de uso
- **Mairo Gregory** — dono da agência (role `OWNER`), principal usuário/decisor.
- **Equipe interna** — hoje 3 pessoas cadastradas no CRM além do dono: Karol (gestora),
  Eduarda (social media), Lilian (design). Existem colaboradores de edição de vídeo
  (André, Marcos) com grupo de WhatsApp dedicado mas **não cadastrados no CRM** — gap
  conhecido, ver Pendências.
- **Clientes da agência** — ~15 clientes ativos, ~7 leads em qualificação. Maioria dos
  clientes ativos (13 de 15, verificado em 2026-08-13) **não tem telefone cadastrado em
  `client_contacts`** — gap conhecido, ver Riscos.

## Arquitetura atual

### Componentes e responsabilidades
| Componente | Local | Responsabilidade |
| --- | --- | --- |
| Frontend (CRM) | `src/` | React 19 + Vite + TS + Tailwind 4. SPA autenticada via Supabase Auth. |
| `agent-whatsapp` | `supabase/functions/agent-whatsapp/index.ts` (~3440 linhas) | **Função central** — webhook único da Evolution API. Atende cliente, roda o Tettolino (equipe), monitora grupos, detecta resposta manual humana (`fromMe`), agenda respostas com delay. |
| `flush-pending-replies` | `supabase/functions/flush-pending-replies/` | Cron a cada 30s — envia (ou cancela) as respostas que `agent-whatsapp` deixou agendadas em `pending_bot_replies`. |
| `manage-team` | `supabase/functions/manage-team/` | CRUD de membros da equipe (papel, telefone, job_role) chamado pela UI. |
| `drive-upload` | `supabase/functions/drive-upload/` | Upload de arquivo pro Google Drive via service account. |
| `send-message` | `supabase/functions/send-message/` | Não auditado a fundo nesta rodada — existe, 1 versão implantada. |
| `whatsapp-webhook` | `supabase/functions/whatsapp-webhook/` | **Legado/dúvida**: existe e está implantado (v4), mas o webhook real configurado na Evolution API aponta pra `agent-whatsapp` (confirmado nesta sessão). README ainda cita este como o alvo — desatualizado. Não confirmar uso sem checar a config real da Evolution API. |
| `client-onboarding` | `supabase/functions/client-onboarding/` | Presente no repo (cria operações padrão ao integrar cliente novo), **não aparece na lista de funções implantadas no Supabase** verificada em 2026-08-14 — inconsistência a esclarecer. |
| `debug-list-groups` | `supabase/functions/debug-list-groups/` | Função de debug criada nesta sessão pra descobrir JIDs de grupos, **já desativada** (retorna 410, `verify_jwt: true`). Não é funcionalidade do produto. |
| Postgres (Supabase) | `supabase/migrations/` (22 arquivos) | RLS habilitado em todas as tabelas de negócio, multi-tenant por `workspace_id` (hoje só 1 workspace real: TettoHub). |
| `n8n/workflows/*.json` | `n8n/` | Workflows de referência (whatsapp-ai, whatsapp-agent-operacional) — **não confirmado se ainda em uso**; a lógica real do atendimento hoje vive em `agent-whatsapp`, não no n8n. Não auditado a fundo. |

### Fluxos principais
1. **Cliente manda mensagem no WhatsApp** → Evolution API dispara webhook →
   `agent-whatsapp` identifica se é cliente conhecido, lead novo, membro da equipe (→
   Tettolino) ou mensagem de grupo → gera resposta (Groq, `llama-3.3-70b-versatile`) →
   agenda envio com delay de 90s (dentro do horário comercial) → `flush-pending-replies`
   confere se um humano já respondeu antes de mandar.
2. **Equipe fala com o Tettolino** (mesmo número da agência, telefone da pessoa cadastrado
   em `users.whatsapp_phone`) → `agent-whatsapp` roda um loop de tool-use com Claude Sonnet
   5 (`hermesSystemPrompt`, `HERMES_TOOLS`) → executa leitura livre (busca cliente/equipe/
   conhecimento) e escrita com confirmação (exceto `send_message`, que executa na hora).
3. **Grupo de WhatsApp** → `handleGroupMessage`: grupos internos ficam quietos por padrão
   (só avisam o dono se marcado ou urgência que só ele resolve); grupos de cliente avisam
   o dono; grupo específico do Vagner Filho tem automação de "nota de pesar" (detecta
   foto+nome, cria tarefa, avisa o design, tenta gerar cópia no Canva se a integração
   estiver configurada — hoje não está).

### Integrações e dependências
- **Evolution API** (self-hosted, Baileys/WhatsApp) — `EVOLUTION_BASE_URL`,
  `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`. Webhook único configurado pra
  `agent-whatsapp?token=<WEBHOOK_SHARED_SECRET>`, evento `MESSAGES_UPSERT`.
- **Groq API** (`GROQ_API_KEY`) — geração de resposta pro cliente (`llama-3.3-70b-versatile`)
  e classificação de urgência em grupo.
- **Anthropic API** (chave própria, não confirmado o nome exato da env var nesta auditoria)
  — usada pelo Tettolino (`callClaudeMessages`, modelo `claude-sonnet-5`).
- **Google Drive** (service account, `GOOGLE_SERVICE_ACCOUNT_JSON`,
  `GOOGLE_DRIVE_PARENT_FOLDER_ID`) — upload de arquivo de operação.
- **Canva** — só o link de um design-base configurado em código
  (`CANVA_NOTA_PESAR_TEMPLATE_ID`/`CANVA_NOTA_PESAR_TEMPLATE_LINK`). Integração OAuth real
  (`CANVA_CLIENT_ID`/`CANVA_CLIENT_SECRET`/`CANVA_REFRESH_TOKEN`) **ainda não configurada**
  — código já existe e falha graciosamente (retorna `null`) até existir.
- **Supabase** — Postgres + Auth + Realtime + Storage + `pg_cron`/`pg_net` (extensão
  `pg_net` está no schema `public`, advisor de segurança recomenda mover — não corrigido).
- **Deploy do frontend**: Vercel (produção atual, segundo README). Há `netlify.toml` como
  alternativa documentada, não confirmado se ainda relevante. Migração planejada pro
  README: Vercel → Coolify self-hosted — **não verificado se já aconteceu**.

## Estrutura relevante do repositório
```
src/                      frontend React (pages, components, hooks, services, types)
supabase/functions/       7 edge functions (Deno) — ver tabela de componentes acima
supabase/migrations/      22 migrations SQL, ordem cronológica pelo nome do arquivo
DOCUMENTATION/            docs de arquitetura/visão — parcialmente desatualizadas (README
                          cita tabela `profiles`/`whatsapp-webhook` que não batem com o
                          schema e função reais atuais; não reescrito nesta auditoria)
n8n/workflows/            workflows de referência, uso atual não confirmado
evolution/docker-compose.yml   infra self-hosted da Evolution API
```

## Tecnologias e ambiente

### Stack
- Frontend: React 19, Vite 6, TypeScript 5.7, TailwindCSS 4, react-router-dom 7,
  `@supabase/supabase-js` 2.49.1, lucide-react.
- Backend: Supabase (Postgres, Auth, Realtime, Storage), Edge Functions em Deno.
- IA: Groq (Llama 3.3 70B) pro atendimento a cliente; Anthropic Claude Sonnet 5 pro
  Tettolino (equipe interna).
- Lint/test: ESLint 9 + typescript-eslint, Vitest (`npm test`). `deno check` como gate de
  tipos das edge functions (baseline conhecido de ~24 erros pré-existentes, todos do mesmo
  padrão de tipagem solta `SupabaseClient<any,"public",any>` — não são bugs funcionais,
  ver `PROJECT_LESSONS.md`).

### Como instalar
```bash
cp .env.example .env.local   # preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
```

### Como executar
```bash
npm run dev        # frontend, http://localhost:5173
```
Edge functions rodam direto no Supabase remoto (deploy via MCP `deploy_edge_function` nesta
sessão) — não confirmado fluxo de execução local delas (`supabase functions serve`) nesta
auditoria.

### Como testar e validar
```bash
npm run build   # tsc -b && vite build — validado nesta sessão, build limpo
npm run lint
npm test        # vitest — não executado nesta auditoria, resultado não verificado
```
Edge functions: `deno check index.ts` dentro de `supabase/functions/agent-whatsapp/` —
usado extensivamente nesta sessão como gate antes de todo deploy.

### Variáveis e configurações
> Nomes apenas — nenhum valor de segredo é registrado aqui.

Frontend (`.env.local`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Edge functions (secrets do projeto Supabase, projeto `lniinjegcvdcrmsrzqkt`):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY`,
`EVOLUTION_INSTANCE`, `WEBHOOK_SHARED_SECRET`, `GROQ_API_KEY`, chave da Anthropic (nome
exato não confirmado nesta auditoria), `GOOGLE_SERVICE_ACCOUNT_JSON`,
`GOOGLE_DRIVE_PARENT_FOLDER_ID`. Ainda não configuradas: `CANVA_CLIENT_ID`,
`CANVA_CLIENT_SECRET`, `CANVA_REFRESH_TOKEN`.

## Estado atual por módulo
| Módulo | Estado | Evidência |
| --- | --- | --- |
| Atendimento automático a cliente | Implementado e validado | testes ponta a ponta nesta sessão (delay, skip por resposta humana, base de conhecimento) |
| Tettolino (equipe) | Implementado e validado | testado com `search_team`, `search_knowledge`, `send_message` reais |
| Monitoramento de grupo (interno/cliente) | Implementado e validado | testado com 3 cenários reais |
| Automação nota de pesar (Vagner Filho) | Parcialmente implementado | criação de tarefa + aviso testados; cópia automática no Canva é stub sem credenciais, não testado contra API real |
| Base de conhecimento | Implementado e validado, **vazia** | tabela criada e testada, mas 0 entradas cadastradas em produção (2026-08-14) |
| Cadastro de cliente/telefone | Parcialmente implementado | 13 de 15 clientes ativos sem telefone cadastrado — causa confirmada de duplicidade real (ex: "Barbearia Bom Corte") |
| Controle de acesso/convite de equipe | Implementado, não validado por esta sessão | veio de merge de `origin/main`, não foi auditado a fundo aqui |
| `client-onboarding` | Indeterminado | código existe, deploy não confirmado |
| `whatsapp-webhook` (legado) | Indeterminado | implantado mas não confirmado se ainda recebe tráfego real |
| n8n workflows | Indeterminado | não auditado, README sugere que pode estar obsoleto |

## Funcionalidades concluídas
CRM (clientes/contatos/contratos), tarefas/operações em kanban, financeiro básico, agenda,
atendimento automático a cliente com delay e detecção de resposta humana, Tettolino com
tool-calling completo (busca/cria/edita cliente, tarefa, operação, mensagem, equipe,
conhecimento), monitoramento de grupos com regras diferenciadas, base de conhecimento
full-text (accent-insensitive), automação parcial de nota de pesar.

## Trabalho em andamento
- Integração Canva (OAuth) — aguardando o cliente criar a integração em
  `canva.com/developers` e passar as credenciais.
- Base de conhecimento — estrutura pronta, conteúdo ainda não cadastrado.

## Pendências priorizadas
0. **[URGENTE, não técnico] Reconciliar a branch `main` com `claude/vps-access-connection-z05wyj`**
   — descoberto em 2026-08-14: `main` recebeu um commit (`beeac19`, "implement compliance
   logging and RLS isolation tests ADR-001/ADR-002") feito fora desta sessão, que se
   baseia num estado muito mais antigo do repositório. Um merge ingênuo de `origin/main`
   nesta branch APAGARIA ~2600 linhas de `agent-whatsapp/index.ts` (todo o Tettolino,
   grupos, base de conhecimento) e os arquivos inteiros de `flush-pending-replies`,
   `send-message`, além de todas as migrations recentes. **Não fazer merge/pull de
   `main` sem decisão explícita do usuário sobre qual conteúdo é o correto pra cada
   arquivo.** Produção está segura (a edge function implantada reflete esta branch, não
   `main`) — o risco é só se alguém mesclar os branches sem cuidado.
1. **Cadastrar telefone dos 13 clientes ativos sem contato** — causa raiz confirmada de
   duplicidade de cadastro (bloqueia reconhecimento automático).
2. **Cadastrar André e Marcos (edição de vídeo) na equipe** — sem `job_role` de
   `videomaker`/`video_editor` cadastrado, `create_task` por departamento não acha
   responsável.
3. **Popular a base de conhecimento** — maior alavanca de eficiência disponível hoje pro
   bot de cliente e pro Tettolino.
4. **Preencher o roteiro de vendas do lead-intake** (`SALES_SCRIPT` em `agent-whatsapp`) —
   ainda é texto placeholder.
5. Esclarecer `whatsapp-webhook`, `client-onboarding` e uso real do n8n (auditoria
   separada, não coberta a fundo aqui).
6. Revisar 3 funções `SECURITY DEFINER` executáveis por `anon`/`authenticated`
   (`bootstrap_my_workspace`, `has_workspace_role`, `is_workspace_member`) e mover `pg_net`
   pra fora do schema `public` (achados do advisor de segurança do Supabase, não corrigidos).

## Decisões vigentes
- Delay de 90s antes de responder cliente automaticamente (histórico de idas e voltas:
  chegou a ser testado em 45s, revertido a pedido explícito do dono — ver
  `CHANGELOG_AI.md`).
- Nome do assistente pro usuário final é **Tettolino** (renomeado de "Hermes" em
  `3fb1f26`). Identificadores internos de código (`hermes_messages`, `HERMES_TOOLS`,
  `hermesSystemPrompt`) **não foram renomeados** — é troca de marca visível, não
  refatoração interna.
- Grupos internos da produção (4 JIDs fixos em `INTERNAL_GROUP_JIDS`) não geram aviso
  automático pro dono, exceto se ele for marcado ou a mensagem for urgente e só ele resolver.
- Edição automática de design no Canva não é viável no plano atual do cliente (exige
  Enterprise) — só cópia+renome são automatizados, a edição de conteúdo continua manual.
- Ação de escrita pendente de confirmação no Tettolino nunca fica travando a conversa
  indefinidamente: se a mensagem seguinte não for claramente sim/não, a pendência é
  superada (`status='superseded'`) e a mensagem é tratada como pedido novo — ver
  `PROJECT_LESSONS.md` LES-0011.
- Mensagem que só nomeia outro membro da equipe como destinatário/executor (recado, não
  pedido direto) não gera tool call nem pedido de confirmação do Tettolino.

## Restrições, invariantes e regras de negócio
- Single-tenant real hoje: só existe 1 workspace de verdade (TettoHub), embora o schema
  seja multi-tenant (`workspace_id` em quase toda tabela).
- Toda tabela de negócio tem RLS habilitado; a maioria segue o padrão "workspace lê,
  MANAGER+ escreve" (`has_workspace_role`).
- Deploy de `agent-whatsapp` (arquivo grande, ~3440 linhas) só é considerado concluído após
  verificação byte a byte (diff + md5sum) entre o arquivo local e o que foi de fato
  implantado — ver `PROJECT_LESSONS.md` LES-0001.

## Problemas conhecidos e riscos
- 13/15 clientes ativos sem `client_contacts` → risco de duplicidade recorrente.
- `pg_net` no schema `public` (advisor de segurança).
- 3 funções `SECURITY DEFINER` chamáveis por `anon`/`authenticated` sem revisão confirmada
  de intencionalidade.
- Proteção de senha vazada (HaveIBeenPwned) desativada no Supabase Auth.
- 77 avisos de políticas RLS permissivas duplicadas + 52 FKs sem índice + 10 avisos de RLS
  reavaliando por linha — não urgente na escala atual, vira problema se o volume crescer.
- `README.md` e parte de `DOCUMENTATION/` estão desatualizados em relação ao schema e à
  função de produção reais (citam `profiles`/`whatsapp-webhook`, não `users`+`memberships`
  /`agent-whatsapp`).

## Convenções do projeto
- Comentários e nomes de variável majoritariamente em português (código do domínio) com
  identificadores técnicos em inglês.
- Migrations nomeadas `AAAAMMDDHHmmss_descricao.sql`, aplicadas em produção via MCP
  `apply_migration` e espelhadas localmente em `supabase/migrations/`.
- Deploy de edge function só é considerado concluído com uma comparação byte a byte
  (diff + md5sum) entre o arquivo fonte e o que foi buscado de volta do Supabase — ver
  `PROJECT_LESSONS.md`.
- Mudanças de nome pro usuário final (branding) não implicam renomear identificadores
  internos de código/tabela — mantém o diff pequeno e o risco baixo.

## Próximos passos recomendados
1. Cadastrar telefones dos clientes ativos sem contato (reduz duplicidade real).
2. Cadastrar equipe de edição de vídeo faltante (André, Marcos).
3. Popular a base de conhecimento com prazos/preços/políticas reais.
4. Auditoria dedicada de `whatsapp-webhook`, `client-onboarding` e dos workflows n8n —
   confirmar o que está realmente em uso antes de decidir remover ou atualizar.
5. Atualizar `README.md`/`DOCUMENTATION/` pra refletir o schema e a função de produção
   reais.

## Referências internas
- Histórico completo: `CHANGELOG_AI.md`
- Lições e incidentes: `PROJECT_LESSONS.md`
- Skills e capacidades: `PROJECT_SKILLS.md`
- Outros documentos relevantes: `DOCUMENTATION/` (parcialmente desatualizado, ver Riscos)
