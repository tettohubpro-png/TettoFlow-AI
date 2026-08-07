# Prompt único — Claude Code

Copie tudo abaixo desta linha e cole no Claude Code.

---

Você está no repositório **TettoFlow AI OS** (pasta `TettoFlow-AI`).

## Missão

A dor do dono (Mairo / TettoHub) é: **responder clientes no WhatsApp de forma rápida e prática**.

Hoje a orquestração via n8n é complexa demais. **Não use n8n. Não crie fluxo visual grande. Não proponha arquitetura especulativa longa.** Analise o código real e **decida sozinho** a forma mais simples e prática de implementar um agente que atenda clientes no WhatsApp, reaproveitando o que já existe.

Critério de sucesso: cliente manda mensagem → recebe resposta rápida, humanizada e útil, com contexto do CRM/memória/operações, roteando para humano/departamento quando necessário, respeitando compliance.

---

## O que é o produto

**TettoFlow AI OS** = sistema operacional interno da **TettoHub** (agência de marketing digital full-service em São Luís–MA).

Não é CRM genérico nem chatbot isolado. Unifica:
- clientes (CRM)
- operações/projetos
- atendimento IA
- conhecimento por cliente
- dashboard interno

Repo: `https://github.com/tettohubpro-png/TettoFlow-AI.git`  
Pasta local: `c:\Projetos\finance.tt\TettoFlow-AI`  
Branch: `main`  
Supabase project ref: `lniinjegcvdcrmsrzqkt`  
URL: `https://lniinjegcvdcrmsrzqkt.supabase.co`

---

## Stack real (use isto)

- Frontend: React 19 + Vite + TypeScript + Tailwind 4 + React Router 7
- Backend: Supabase (Auth, Postgres, RLS, Edge Functions)
- WhatsApp: Evolution API v2 (`evolution/docker-compose.yml`, porta 8080)
- LLM já usado na edge: Groq `llama-3.3-70b-versatile` (Whisper `whisper-large-v3` previsto para áudio)
- Drive: edge `drive-upload` (Google Service Account)
- Deploy front: Netlify/Vercel

**Ignore completamente** a pasta `n8n/` e qualquer menção a workflows/nós n8n.

---

## Dor e escopo

FOCO: agente de atendimento WhatsApp rápido e prático.

NÃO é prioridade agora: financeiro, Instagram, Messenger, Telegram, Email, RH, redesign do CRM, white-label.

---

## Usuários / papéis

Membership roles no código: `OWNER | ADMIN | MANAGER | MEMBER | CLIENT`  
Job roles: `gerente | gestor | social_media | design | videomaker | photographer | video_editor | traffic`

Owner (Mairo) vê tudo. Team vê clientes atribuídos. Client vê só o próprio projeto.

---

## Rotas do app já existentes

- `/login` — auth
- `/` — dashboard
- `/crm` — CRM
- `/crm/:clientId` — briefing / brand / produtos / Drive
- `/projetos` — kanban de operações
- `/departamentos` — filas por departamento
- `/aprovacoes` — aprovações
- `/alertas` — alertas
- `/relatorios` — tempo/sessões
- `/ia` — IA interna (UI)
- `/whatsapp` — **simulador** de atendimento com memória + operations (não é o canal real)

---

## Modelo de dados que o código usa de fato

Schema **workspace-centric** (front + edges operacionais):

- `workspaces`, `users`, `memberships`
- `clients`, `client_contacts` (**telefone = identificação do cliente no WhatsApp**)
- `operations` (status: `DRAFT | SUBMITTED | ANALYSIS | PRODUCTION | REVIEW | CLIENT | APPROVED | PUBLISHED | DONE`)
- template padrão: `2e8a4766-ac69-438f-b916-ecfc79637d02`
- `client_ai_memory` (categorias: `PREFERENCES | HISTORY | BRIEFING | CONSTRAINTS | INSIGHTS | BRAND`)
- `client_brand`, `client_products`
- `approvals`, `approval_rounds`
- `files`
- `automations`, `automation_runs` (evento `client.onboarded`)
- `client_assignments`, `client_alerts`, `work_sessions`, `project_activity`

Status cliente no front: `ACTIVE | INACTIVE | ARCHIVED`  
Segmentos regulatórios: `legal | health_aesthetics | electoral | general`

Há migrations locais com schema antigo (`profiles`/`projects`). O código operacional atual usa o schema workspace/operations acima. Prefira o que o front e as edges já consultam.

---

## Edge Functions existentes (API real)

### 1) `supabase/functions/agent-whatsapp/index.ts`  ← núcleo

Input:
```json
{
  "phone": "5598...",
  "message": "texto",
  "contact_name": "opcional",
  "client_id": "opcional",
  "instance": "opcional"
}
```

Comportamento atual:
1. Resolve cliente por `client_id` ou telefone em `client_contacts`
2. Carrega até 8 memórias ativas de `client_ai_memory`
3. Classifica intenção → departamento
4. Aplica compliance (handoff OAB/ANVISA/TSE)
5. Gera reply com Groq (fallback sem key)
6. Se departamento ≠ `general`, cria `operation` DRAFT
7. Loga histórico em `client_ai_memory` (HISTORY)

Output: `reply`, `department`, `department_label`, `intent`, `handoff`, `handoff_reason`, `create_operation`, `operation_id`, `client_id`, `client_name`

Se não achar cliente: pede nome da empresa + handoff commercial.

### 2) `whatsapp-webhook`

Versão mais simples: precisa `client_id`; compliance + reply por matching de memória; sem Groq.

### 3) `client-onboarding`

Cria pacote de operations de onboarding (auth necessária).

### 4) `drive-upload`

Upload autenticado para Google Drive.

---

## Roteamento de intenção (já implementado)

Arquivos: `src/utils/intentRouter.ts` + espelho em `agent-whatsapp`.

| Padrões | Department | Observação |
|---------|------------|------------|
| post, stories, reels, calendário, instagram | `social_media` | cria operation |
| gravação, filmar, filmagem | `videomaker` | cria operation |
| edição, corte, capcut | `video_editor` | cria operation |
| tráfego, anúncio, ads, campanha | `traffic` | cria operation |
| proposta, orçamento, preço, contrato | `commercial` | needsHuman |
| reclamação, urgente, atrasado, aprovação | `manager` | needsHuman |
| resto | `general` | só responde |

Labels: Social Media, Videomaker, Editor de Vídeo, Gestor de Tráfego, Gestor, Comercial, Atendimento.

---

## Compliance (obrigatório)

Arquivos: `src/utils/compliance.ts` e lógica na edge.

- `legal` + padrões jurídicos → handoff OAB
- `health_aesthetics` + promessa de resultado → handoff ANVISA
- `electoral` + propaganda/candidato → handoff TSE

Resposta de handoff: encaminhar para humano. Não aconselhar nesses temas.

ADRs aprovados:
- **ADR-001**: multi-tenant lógico + RLS; vazamento cross-client é incidente crítico
- **ADR-002**: RAG/contexto só do cliente da conversa; WhatsApp não vê dados confidential/restricted de outros

Meta: resposta IA &lt; 30s p95; 0 vazamento cross-client.

---

## Tom da resposta (já no prompt Groq)

- Português BR, natural, curto (máx ~4 frases)
- Assistente da TettoHub / do cliente
- Nunca inventar preço, prazo ou fato fora do contexto
- Pedido operacional: confirmar + dizer qual equipe executa
- Em dúvida: perguntar 1 coisa objetiva

Contexto disponível: `client_ai_memory` (+ operations no simulador front).

---

## Evolution API (canal WhatsApp)

Arquivo: `evolution/docker-compose.yml`
- Imagem `atendai/evolution-api:v2.2.3`
- Porta `8080`
- API key no compose: `tettoflow-evolution-key`
- Instância prevista na doc: `tettohub`
- Evento inbound esperado: `MESSAGES_UPSERT`
- Capacidades desejadas: texto, áudio (transcrição), presence “digitando…”
- Identificação: `client_contacts.phone` com DDI (ex. `5598988887777`)
- Usar número comercial dedicado

Env tipicamente necessário (nomes, não invente valores):
`EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`

`.env.example` front:
```
VITE_SUPABASE_URL=https://lniinjegcvdcrmsrzqkt.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

---

## Domínio da agência (contexto)

Funil: Lead → CRM → Proposta → Contrato → Cliente ativo → Onboarding → Produção (social/design/vídeo/editor) → Aprovação → Entrega → Relatórios → Renovação

O agente WhatsApp atende no dia a dia: pedidos, dúvidas, agendamentos, status; cria operation quando precisa de execução humana; escala em temas sensíveis.

Segmentos de clientes: jurídico, saúde/estética, automotivo, varejo, consultoria, nutrição, editorial; eleitoral planejado.

---

## Arquivos obrigatórios para ler antes de codar

```
README.md
DOCUMENTATION/00-MASTER/vision.md
DOCUMENTATION/00-MASTER/product-strategy.md
DOCUMENTATION/00-MASTER/operational-flow.md
DOCUMENTATION/01-ADR/ADR-001-data-isolation.md
DOCUMENTATION/01-ADR/ADR-002-rag-access-control.md
src/App.tsx
src/types/database.ts
src/utils/intentRouter.ts
src/utils/compliance.ts
src/utils/aiReply.ts
src/utils/aiContext.ts
src/pages/WhatsAppPage.tsx
supabase/functions/agent-whatsapp/index.ts
supabase/functions/whatsapp-webhook/index.ts
evolution/docker-compose.yml
.env.example
```

Ignore: `n8n/**`

---

## O que você (Claude Code) deve fazer

1. Ler o código acima.
2. Entender o que já resolve a dor (`agent-whatsapp` + Evolution + memória + intent + compliance).
3. **Decidir sozinho** a arquitetura mais simples para: receber mensagem → processar → responder no WhatsApp **sem n8n**.
4. Implementar o caminho mais prático (reaproveitar/estender o que existe em vez de reinventar).
5. Manter compliance, isolamento por cliente e tom humanizado.
6. Entregar algo testável: mensagem inbound → reply outbound.

Não peça permissão para cada microdecisão técnica. Priorize simplicidade, velocidade de resposta e uso do stack que já roda.
