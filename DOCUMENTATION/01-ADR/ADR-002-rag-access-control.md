# ADR-002 — Controle de Acesso no RAG / IA Interna

| Campo | Valor |
|-------|-------|
| **Status** | Aprovado — Opção A (pgvector + metadata) |
| **Data** | 2026-07-30 |
| **Decisor** | Mairo (owner) |
| **Autor** | Equipe TettoFlow (Cursor) |
| **Depende de** | ADR-001 (isolamento de dados) |

---

## Contexto

O TettoFlow inclui uma **IA Interna** que conhece a operação da agência: contratos, briefings, histórico de atendimento, financeiro, processos internos e base de conhecimento por cliente.

Diferente do atendimento WhatsApp (canal externo, escopo por cliente), a IA Interna é consultada por:
- **Owner** (Mairo) — visão global, financeiro, estratégia
- **Team** (funcionários) — escopo limitado por função e clientes atribuídos
- **Client** (futuro, Fase 2+) — apenas dados do próprio projeto

**Problema:** um índice vetorial (pgvector) "único e aberto" permite que um embedding de contrato do Cliente A apareça no contexto de uma pergunta feita por um colaborador sem permissão — ou que a IA responda "quanto faturamos esse mês" para quem não deveria ver financeiro.

Isso é **falha de segurança**, não bug de UX.

---

## Princípios de Design

1. **Deny-by-default** — nenhum documento entra no contexto sem passar pelo filtro de permissão
2. **Metadata no embedding, não confiança no LLM** — o modelo não decide o que pode ver; a camada de retrieval decide
3. **Defense in depth** — filtro em ingestão, em query e na Edge Function que monta o prompt
4. **Auditoria total** — toda consulta RAG gera log com documentos recuperados (IDs, não conteúdo completo em log público)
5. **Separação Atendimento IA vs IA Interna** — pipelines distintos, índices podem compartilhar tabela com `source_type` diferente

---

## Opções Consideradas

### Opção A — Índice único pgvector + filtro por metadata na query (recomendada)

Uma tabela `ai_embeddings` central. Cada chunk carrega metadata de permissão. A busca vetorial usa operador de similaridade **com cláusula WHERE** restritiva antes do `ORDER BY ... LIMIT k`.

```sql
CREATE TABLE ai_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),          -- NULL = conhecimento interno TettoHub
  source_type TEXT NOT NULL,                       -- 'crm' | 'project' | 'contract' | 'internal_sop' | 'conversation'
  source_id UUID,
  content TEXT NOT NULL,
  embedding vector(1536),
  role_required TEXT[] DEFAULT '{owner,team}',     -- roles mínimos
  sensitivity_level TEXT DEFAULT 'normal',         -- 'public' | 'normal' | 'confidential' | 'restricted'
  function_tags TEXT[] DEFAULT '{}',               -- ex: '{finance,social_media}' — filtro adicional para team
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Query pattern (conceitual):

```sql
SELECT id, content, source_type,
       embedding <=> $query_embedding AS distance
FROM ai_embeddings
WHERE
  -- Isolamento por cliente (ADR-001)
  (client_id IS NULL OR client_id = ANY($allowed_client_ids))
  -- Role do solicitante
  AND $user_role = ANY(role_required)
  -- Sensibilidade
  AND sensitivity_level <= $user_max_sensitivity
  -- Tags de função (team only)
  AND (
    $user_role = 'owner'
    OR cardinality(function_tags) = 0
    OR function_tags && $user_function_tags
  )
ORDER BY distance
LIMIT 10;
```

**Prós**
- Simples de operar — um índice, uma tabela
- Filtro determinístico antes do LLM
- Compatível com Opção A do ADR-001
- Facilita busca cross-client para owner com filtro explícito

**Contras**
- Erro na cláusula WHERE = vazamento
- Índice grande com muitos clientes — necessita índice parcial ou HNSW com filtros
- Reindex ao mudar permissões de documento existente

---

### Opção B — Índices vetoriais separados por `client_id` (particionamento)

Tabela particionada por `client_id` ou índices HNSW por partição. Query roteada para partições permitidas.

**Prós**
- Isolamento físico no storage
- Performance previsível por cliente

**Contras**
- Owner precisa consultar N partições para visão global
- Complexidade de migrations e manutenção
- Overkill para MVP

---

### Opção C — Camada de abstração externa (Pinecone, Weaviate, etc.)

Vector DB dedicado com namespaces por cliente.

**Prós**
- Filtros nativos em alguns providers
- Escala independente do Postgres

**Contras**
- **Fora da stack aprovada** (Supabase/pgvector) — exigiria ADR adicional
- Segundo sistema para backup, sync, consistência
- Custo extra

**Veredicto:** descartada para MVP.

---

### Opção D — Sem RAG no MVP; IA Interna só com function calling + SQL filtrado

IA não usa embeddings na Fase 0; responde via tools que executam queries com RLS.

**Prós**
- Menor superfície de ataque no MVP
- RLS do Postgres garante isolamento

**Contras**
- Não responde "o que diz o contrato do Cliente X sobre revisões?" sem full-text search
- Limita valor da IA Interna no MVP
- Atendimento WhatsApp ainda precisa de contexto semântico (briefings, FAQs)

**Veredicto:** útil como **modo fallback**, não como arquitetura principal.

---

## Recomendação da Equipe

**Opção A (índice único + filtro por metadata na query)** como arquitetura principal, com **Opção D como fallback** para dados estruturados (CRM, pipeline, financeiro futuro) via Supabase RPC/Edge Functions.

### Camadas de enforcement

```
┌──────────────────────────────────────────────────────────────┐
│  CAMADA 1 — INGESTÃO                                         │
│  Ao indexar documento:                                       │
│  • Derivar client_id, sensitivity, role_required, tags       │
│  • Rejeitar ingestão sem metadata completa                   │
│  • Edge Function: validate_ingest_permission(user, doc)      │
└────────────────────────────┬─────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  CAMADA 2 — RETRIEVAL (pgvector query)                       │
│  • Resolver allowed_client_ids do JWT + memberships          │
│  • Resolver user_max_sensitivity por role                    │
│  • WHERE clause obrigatória — nunca query sem filtro         │
│  • LIMIT baixo (k=5–10) + rerank opcional                    │
└────────────────────────────┬─────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  CAMADA 3 — EDGE FUNCTION (montagem do prompt)               │
│  • Revalidar cada chunk retornado contra sessão atual        │
│  • Strip de chunks que falharem revalidação                  │
│  • Injetar system prompt com escopo explícito                │
│  • Chamar Claude (Anthropic)                                 │
└────────────────────────────┬─────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  CAMADA 4 — AUDITORIA                                        │
│  • ai_rag_query_logs: user_id, query_hash, chunk_ids[], ts   │
│  • ai_interaction_logs: resposta, handoff, segmento          │
└──────────────────────────────────────────────────────────────┘
```

---

## Matriz de Sensibilidade

| Nível | Quem indexa | Quem consulta | Exemplos |
|-------|-------------|---------------|----------|
| `public` | Qualquer team | owner, team, client* | FAQs publicadas, horário de atendimento |
| `normal` | team atribuído | owner, team do client | Briefings, tarefas, cronograma |
| `confidential` | owner, team senior | owner, team com tag | Contratos, mensalidades, margens |
| `restricted` | owner only | owner only | Financeiro consolidado, salários, dados eleitorais |

\* *Client só vê `public`/`normal` do próprio `client_id`.*

---

## Atendimento IA (WhatsApp) vs IA Interna

| Aspecto | WhatsApp (Fase 0) | IA Interna |
|---------|-------------------|------------|
| Usuário | Lead/cliente externo | Owner/team |
| Escopo RAG | Apenas `client_id` da conversa | Multi-client conforme permissão |
| Handoff | Obrigatório em segmentos regulados (Regra 3) | N/A — usuário interno |
| Log | `ai_interaction_logs` com `channel=whatsapp` | `ai_rag_query_logs` |
| Modelo | Claude via n8n ou Edge Function | Claude via Edge Function |

No WhatsApp, o filtro RAG é **simples e rígido**: `WHERE client_id = $conversation_client_id AND sensitivity_level IN ('public', 'normal')`. Nunca `confidential` ou `restricted` no atendimento autônomo.

---

## Guardrails de Compliance (integração com Regra 3)

Antes de montar resposta no WhatsApp:

1. Ler `clients.segment` (`legal` | `health_aesthetics` | `electoral` | `general`)
2. Classificar intenção da mensagem (triagem via Claude ou rules)
3. Se intenção ∈ {aconselhamento jurídico, promessa de resultado saúde, propaganda eleitoral}:
   - **Não** incluir chunks RAG na resposta autônoma
   - Coletar contexto mínimo (nome, demanda, urgência)
   - Criar ticket/handoff para humano
   - Registrar em `ai_interaction_logs` com `handoff_reason`

---

## Modelo de Dados Complementar

```sql
-- Log de consultas RAG (auditoria)
CREATE TABLE ai_rag_query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_role TEXT NOT NULL,
  query_text_hash TEXT NOT NULL,        -- SHA-256, não texto plano
  retrieved_chunk_ids UUID[] NOT NULL,
  filtered_out_count INT DEFAULT 0,
  client_scope UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log de interações IA (WhatsApp + interno)
CREATE TABLE ai_interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  channel TEXT NOT NULL,                -- 'whatsapp' | 'internal' | 'instagram' (fase 1)
  conversation_id UUID,
  user_id UUID,                         -- NULL se lead externo
  segment TEXT,
  intent_class TEXT,
  handoff BOOLEAN DEFAULT false,
  handoff_reason TEXT,
  model_used TEXT,
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Testes Obrigatórios (CI)

| Teste | Cenário |
|-------|---------|
| `rag_isolation_team_a` | Team do Cliente A não recupera chunks do Cliente B |
| `rag_owner_global` | Owner recupera chunks de múltiplos clientes |
| `rag_sensitivity_block` | Team com tag `social_media` não vê `confidential` financeiro |
| `rag_whatsapp_scope` | Bot WhatsApp do Cliente A não vê dados do Cliente B nem `restricted` |
| `rag_handoff_legal` | Mensagem jurídica específica → handoff, resposta autônoma vazia |
| `rag_ingest_reject` | Ingestão sem `client_id` em doc de cliente → erro |
| `rag_audit_log` | Toda query gera registro em `ai_rag_query_logs` |

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Prompt injection exfiltra contexto | Crítico | Chunks sanitizados; system prompt proíbe revelar instruções; limit k |
| Service role bypassa filtro | Crítico | Edge Functions usam sessão do usuário; service role só em jobs batch |
| Embedding desatualizado após mudança de permissão | Alto | Webhook/trigger reindex ao alterar `sensitivity_level` |
| Latência com filtros complexos | Médio | Índice HNSW + índice B-tree em `(client_id, sensitivity_level)` |
| Custo de embeddings | Médio | Chunking inteligente; não indexar binários; deduplicação |

---

## Perguntas para Decisão do Owner

1. A IA Interna entra no **MVP (Fase 0)** ou só na Fase 1? *(Recomendação: Fase 0 com escopo mínimo — busca em briefings e SOPs internos; financeiro só Fase 1)*
2. Quais **function_tags** iniciais para o time? *(social_media, designer, editor, videomaker, comercial — confirmar lista)*
3. Contratos e mensalidades são **`confidential`** por padrão?
4. Embedding model: **OpenAI text-embedding-3** (via API) ou alternativa compatível com pgvector 1536 dims? *(Anthropic não oferece embeddings nativos — exige decisão de provider de embedding separado do Claude)*

---

## Consequências se Aprovado

- Tabela `ai_embeddings` criada na migration inicial da Fase 0 (mesmo que ingestão comece vazia)
- Edge Function `rag-query` centraliza retrieval + revalidação + chamada Claude
- n8n WhatsApp chama Edge Function, não pgvector diretamente
- Provider de embeddings documentado em ADR adicional se necessário (embedding ≠ LLM)

---

## Nota sobre Provider de Embeddings

A stack aprovada cita **Anthropic (Claude)** para IA generativa. Embeddings exigem provider complementar (ex.: Voyage AI, OpenAI embeddings, ou model local). **Recomendação:** ADR-003 futuro para escolha do provider de embeddings, ou aprovar Voyage/OpenAI apenas para embedding mantendo Claude para geração.

---

**Aguardando aprovação explícita de Mairo antes de implementar qualquer módulo da Fase 0.**
