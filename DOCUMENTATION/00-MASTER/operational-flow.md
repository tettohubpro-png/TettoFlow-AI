# TettoFlow AI OS — Fluxo Operacional Completo

| Campo | Valor |
|-------|-------|
| **Versão** | 1.0 |
| **Data** | 2026-07-30 |
| **Status** | Especificação aprovada para implementação incremental |

---

## 1. Funil comercial → operação → renovação

```
Novo Lead
    │
    ▼
CRM (qualificação + histórico)
    │
    ▼
Proposta Comercial
    │
    ▼
Contrato (assinado)
    │
    ▼
Cliente Ativo ──► ONBOARDING INTELIGENTE (automação)
    │
    ▼
Produção (Social / Design / Vídeo / Editor)
    │
    ▼
Aprovação (cliente + gestor)
    │
    ▼
Entrega
    │
    ▼
Relatórios
    │
    ▼
Renovação
```

### Mapeamento no banco existente (Supabase remoto)

| Etapa do funil | Tabela(s) atual | Gap |
|----------------|-----------------|-----|
| Lead | `clients.status` (enum) | Adicionar status `lead`, `proposal`, `contract` |
| CRM | `clients`, `client_contacts`, `history_entries` | Expandir campos em `clients` |
| Proposta | — | Nova: `commercial_proposals` |
| Contrato | — | Nova: `contracts` |
| Cliente ativo | `clients.status = active` | ✅ |
| Onboarding | `automations` (`event_key: client.onboarded`) | Configurar automação |
| Produção | `operations` + `templates` | ✅ |
| Aprovação | `approvals` + `approval_rounds` | ✅ (não exposto no front) |
| Entrega | `operations.status` via `workflow_steps` | ✅ |
| Relatórios | — | Fase 1 |
| Renovação | `automations` + notificação | Fase 1 |

---

## 2. Hierarquia de login e permissões (RBAC)

### Papéis

| Papel | Código | Escopo |
|-------|--------|--------|
| Proprietário | `owner` | Tudo |
| Administrador | `admin` | Quase tudo (sem billing crítico) |
| Gestor | `manager` | Projetos, equipe, aprovações, métricas |
| Financeiro | `finance` | Mensalidades, cobranças, fluxo de caixa |
| Social Media | `social_media` | Clientes atribuídos, calendário, posts |
| Designer | `designer` | Fila de artes, identidade visual |
| Editor de Vídeo | `video_editor` | Vídeos, reels, roteiros |
| Videomaker | `videomaker` | Gravações, equipamentos, mapa |
| Fotógrafo | `photographer` | Sessões, checklist |
| Tráfego Pago | `traffic` | Campanhas, métricas ads |
| Comercial | `commercial` | CRM, leads, propostas, follow-up |
| Cliente | `client` | Apenas seu portal |

### Implementação

- **Tabela existente:** `memberships.role` (enum) — expandir enum com novos valores
- **Atribuição por cliente:** nova tabela `client_assignments` (user_id, client_id, role)
- **RLS:** filtrar por `workspace_id` + `client_assignments` para roles operacionais

### Matriz resumida

| Recurso | owner | manager | social | designer | commercial | finance | client |
|---------|-------|---------|--------|----------|------------|---------|--------|
| Todos os clientes | ✅ | ✅ | atribuídos | atribuídos | ✅ | ✅ | próprio |
| Criar funcionário | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| CRM / Leads | ✅ | ✅ | leitura | ❌ | ✅ | leitura | ❌ |
| Projetos | ✅ | ✅ | atribuídos | atribuídos | leitura | ❌ | próprios |
| Financeiro | ✅ | leitura | ❌ | ❌ | ❌ | ✅ | próprio |
| Aprovar tarefas | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | aprovar entregas |
| IA operacional | ✅ | ✅ | escopo | escopo | escopo | financeiro | ❌ |

---

## 3. Cadastro do cliente (pós-contrato)

### Seções do formulário

| Seção | Campos | Tabela destino |
|-------|--------|----------------|
| Dados gerais | razão social, CNPJ, responsável, contatos, redes, site, endereço, horário | `clients` (expandir) + `client_contacts` |
| Identidade | logo, manual, paleta, tipografia, arquivos editáveis | `client_brand` ✅ + `files` |
| Marketing | objetivo, persona, concorrentes, posicionamento | `client_ai_memory` (category: marketing) |
| Produtos | serviços vendidos, ticket, meta | `client_products` ✅ |
| Conteúdo | posts/mês, stories, reels, campanhas, datas | `operations` (template: conteúdo mensal) |
| Comercial | formas pagamento, processo | `clients` + futuro `contracts` |
| Contatos | dono, gerente, financeiro, etc. | `client_contacts` ✅ (role_label) |
| Redes | contas existentes, acessos recebidos | `client_social_accounts` (nova — **sem senhas em texto**) |

### Segurança de credenciais

- **Nunca** armazenar senhas de Instagram/Facebook em texto plano
- Usar `client_social_accounts` com: `platform`, `account_handle`, `access_granted` (bool), `vault_secret_id` (Supabase Vault ou referência externa)
- Credenciais gerenciadas via OAuth ou cofre seguro

---

## 4. Onboarding inteligente (diferencial)

**Gatilho:** `clients.status` muda para `active` (contrato assinado)

**Automação** (`automations.event_key = 'client.onboarded'`):

```
1. Criar registro em clients (se lead convertido)
2. Criar pasta em files (storage_path: /{workspace}/{client}/)
3. Gerar briefing (template "Briefing Inicial" → operation)
4. Checklist documentos pendentes (operation template)
5. Projeto mensal recorrente (operation + template "Produção Mensal")
6. Calendário editorial (operation template "Calendário")
7. Tarefas Social Media (operations filhas)
8. Tarefas Design (operations filhas)
9. Tarefas Videomaker (operations filhas)
10. Tarefas Editor (operations filhas)
11. Evento Google Calendar (n8n → Calendar API)
12. Indexar dados em client_ai_memory + embeddings (RAG)
13. Notificar equipe (notifications)
14. Registrar automation_run (log)
```

**Tabelas usadas:** `automations`, `automation_runs`, `operations`, `templates`, `notifications`, `client_ai_memory`

---

## 5. Briefing

- **Formulário dinâmico:** `templates` + `template_fields` (já existe!)
- **Respostas:** `operation_values` (valores por campo)
- **Conteúdo indexado para IA:** `client_ai_memory` + futuro `ai_embeddings`

Campos exemplo: história, missão, visão, valores, tom de voz, persona, referências, fotos/vídeos (files).

---

## 6. Fluxos por departamento

### Social Media
`operations` (category: social) → briefing, objetivos, paleta, calendário, posts, stories, reels

### Design
`operations` (category: design) → artes pendentes, prioridade, referências, identidade, aprovação

### Videomaker
`operations` (category: video) → local, data, hora, roteiro, equipamentos, mapa, checklist

### Editor
`operations` (category: editing) → vídeos, reels, stories, YouTube, roteiros

### Aprovação
`approvals` + `approval_rounds` → cliente aprova/solicita alteração → histórico em `history_entries`

---

## 7. IA — três camadas

| Camada | Função | Fonte de dados |
|--------|--------|----------------|
| **IA de Atendimento** | WhatsApp, Instagram, Messenger | CRM + agenda + RAG + histórico |
| **IA do Cliente** | Responde sobre a própria empresa | `client_ai_memory`, briefing, files |
| **IA Operacional** | Perguntas internas da equipe | operations, memberships, agenda, financeiro |

Regras (ADR-002):
- Sempre consultar dados reais — nunca inventar
- Filtrar por permissão antes do prompt
- Handoff humano em segmentos regulados
- Log em `ai_interaction_logs` / `automation_runs`

---

## 8. Dashboard do cliente (portal)

Rota: `/portal` (role: `client`)

| Widget | Fonte |
|--------|-------|
| Resumo | `clients` + `operations` ativas |
| Próxima gravação | `operations` (category: video, deadline próximo) |
| Último post | `operations` (status: delivered) |
| Campanhas | `operations` (category: traffic) |
| Financeiro | futuro módulo financeiro |
| Solicitações | `operations` + `comments` |
| Arquivos | `files` |

---

## 9. Ordem de implementação (revisada)

### Sprint 1 — Fundação (conectar ao banco real)
1. Auth → `users` + `memberships` + `workspaces`
2. CRM → `clients` + `client_contacts` + status do funil
3. Operações → `operations` + `workflows` (substituir `projects` do front)

### Sprint 2 — Onboarding inteligente
4. Templates de briefing + onboarding
5. Automação `client.onboarded` via `automations`
6. `client_brand` + `client_products` no formulário

### Sprint 3 — Departamentos
7. Filas por role (social, design, video, editor)
8. Aprovações (`approvals`)
9. Arquivos (`files`)

### Sprint 4 — IA
10. `client_ai_memory` → RAG
11. WhatsApp IA com contexto real
12. IA operacional (queries internas)

### Sprint 5 — Comercial + Financeiro
13. Leads + propostas + contratos
14. Financeiro + renovação

---

## 10. Decisão arquitetural confirmada

**Opção A:** Evoluir schema existente (`workspaces` + `operations` + `automations`).

**Não aplicar** migrations locais (`profiles`, `projects`) — descartar ou arquivar em favor do schema remoto.

O frontend Vite atual será **refatorado** para usar as tabelas reais, sem rewrite para Next.js nesta fase.
