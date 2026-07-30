# ADR-001 — Isolamento de Dados por Cliente

| Campo | Valor |
|-------|-------|
| **Status** | Aprovado — Opção A (RLS único) |
| **Data** | 2026-07-30 |
| **Decisor** | Mairo (owner) |
| **Autor** | Equipe TettoFlow (Cursor) |

---

## Contexto

Hoje a TettoHub opera com **isolamento físico por cliente**: cada cliente possui repositório, deploy Netlify e projeto Supabase próprios. Isso reduz risco de vazamento cruzado, mas impede visão unificada da operação, duplica esforço de manutenção e dificulta a construção de uma "IA Interna" que conheça toda a agência.

O **TettoFlow AI OS** centraliza CRM, projetos, atendimento IA, financeiro e conhecimento interno em **um único produto**. A mudança arquitetural central é: **como garantir isolamento equivalente (ou superior) ao modelo atual, dentro de uma plataforma multi-tenant?**

Segmentos atendidos incluem clientes regulados:
- **Jurídico** (OAB — sigilo, dados sensíveis de processos)
- **Saúde/Estética** (ANVISA — promessas, dados de pacientes)
- **Campanhas eleitorais** (TSE — propaganda, dados eleitorais)
- Demais segmentos (automotivo, varejo, consultoria, nutrição, editorial)

**Vazamento de dado entre clientes é inaceitável** — não é bug de UX, é incidente de compliance e reputação.

---

## Opções Consideradas

### Opção A — Projeto Supabase único + RLS por `client_id` (multi-tenant lógico)

Todas as tabelas de dados de cliente carregam `client_id` (UUID). Row Level Security (RLS) garante que cada query retorne apenas linhas do(s) cliente(s) permitido(s) para aquele usuário/sessão.

```
┌─────────────────────────────────────────┐
│           Supabase Project              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Client A│ │ Client B│ │ Client C│   │
│  │  rows   │ │  rows   │ │  rows   │   │
│  └────┬────┘ └────┬────┘ └────┬────┘   │
│       └───────────┼───────────┘       │
│              RLS + client_id            │
└─────────────────────────────────────────┘
```

**Prós**
- Visão unificada da operação (dashboards, IA interna, relatórios cross-client para owner)
- Um conjunto de migrations, um ambiente de staging, menor custo operacional
- Alinhado com produto SaaS interno da agência
- pgvector/RAG em um único banco facilita busca global com filtros de permissão (ADR-002)

**Contras**
- RLS mal configurada = vazamento catastrófico
- Exige disciplina rigorosa em toda migration, Edge Function e query
- Clientes regulados podem exigir auditoria extra ("por que compartilham banco?")
- Blast radius: comprometimento do projeto afeta todos os clientes

**Mitigações**
- RLS em **100%** das tabelas com dados de cliente (deny-by-default)
- Testes automatizados de isolamento (usuário A nunca vê dados de B)
- `client_id` propagado via JWT claims + trigger de validação
- Auditoria de queries em staging antes de cada release
- Segregação lógica adicional por `sensitivity_level` para dados críticos

---

### Opção B — Schemas PostgreSQL separados por cliente (multi-tenant por schema)

Um único projeto Supabase, mas cada cliente recebe schema próprio (`client_abc`, `client_xyz`). Tabelas replicadas por schema ou views federadas.

**Prós**
- Isolamento mais forte que RLS puro — erro de policy não expõe outro schema trivialmente
- Backup/restore por schema possível
- Narrativa de compliance mais forte para clientes regulados

**Contras**
- Migrations multiplicadas (N schemas) ou pipeline complexo de provisionamento
- Cross-client analytics exige queries federadas ou ETL
- pgvector: embeddings por schema complica busca global da IA Interna
- Onboarding de novo cliente = criar schema + rodar migrations (automatizável, mas complexo)
- Limite prático de schemas em PostgreSQL (~ centenas antes de overhead)

**Mitigações**
- Schema `platform` para dados compartilhados (usuários, config)
- Automação de provisionamento via Edge Function + migration runner
- Busca RAG: índice unificado em schema `ai` com metadata `client_id` (volta parcialmente ao modelo lógico)

---

### Opção C — Manter projetos Supabase separados por cliente (status quo estendido)

TettoFlow vira "painel de controle" que se conecta a N projetos Supabase via API/federation. Dados permanecem fisicamente isolados.

**Prós**
- Máximo isolamento — zero risco de RLS cross-tenant
- Compatível com operação atual sem migração de dados
- Compliance mais fácil de explicar a clientes regulados

**Contras**
- **Contradiz o objetivo central** do TettoFlow (sistema operacional único)
- IA Interna precisa consultar N bancos — latência, complexidade, custo
- CRM/pipeline unificado vira camada de agregação frágil
- Manutenção N× (migrations, bugs, features)
- Não escala operacionalmente para agência em crescimento

**Veredicto preliminar:** descartada como arquitetura alvo, salvo exceção pontual para 1–2 clientes ultra-regulados durante transição.

---

### Opção D — Híbrido: plataforma central + silos para clientes regulados

Projeto Supabase central (Opção A) para maioria dos clientes. Clientes de segmento crítico (advocacia, saúde, eleitoral) permanecem em projeto/schema dedicado, sincronizados via API ou read-replica lógica.

**Prós**
- Balanceia centralização com compliance segmentado
- Permite migração gradual do status quo
- Owner mantém visão parcial unificada via camada de agregação

**Contras**
- Duas arquiteturas para manter — complexidade permanente
- IA Interna precisa saber "de onde buscar" por cliente
- Risco de virar Opção C disfarçada se muitos clientes forem para silo

---

## Matriz de Comparação

| Critério | A (RLS) | B (Schemas) | C (Silos) | D (Híbrido) |
|----------|---------|-------------|-----------|-------------|
| Isolamento | Médio-Alto* | Alto | Máximo | Variável |
| Complexidade ops | Baixa | Média-Alta | Muito Alta | Alta |
| IA Interna / RAG | Excelente | Médio | Ruim | Médio |
| Time-to-MVP | Rápido | Médio | Lento | Médio |
| Compliance narrativa | Média | Boa | Excelente | Boa |
| Custo infra | Baixo | Baixo | Alto | Médio |

\* *Com RLS rigorosa + testes automatizados, atinge nível aceitável para MVP.*

---

## Recomendação da Equipe

**Recomendamos a Opção A (projeto Supabase único + RLS por `client_id`) para o MVP e Fase 1**, com as seguintes condições inegociáveis:

1. **RLS deny-by-default** em toda tabela com dado de cliente — nenhuma policy permissiva "para facilitar dev"
2. **`client_id` obrigatório** em todas as entidades de negócio (CRM, projetos, conversas, arquivos, embeddings)
3. **Suite de testes de isolamento** executada em CI antes de cada deploy
4. **JWT claims** com `role`, `client_ids[]` (ou `allowed_clients`) validados em Edge Functions
5. **Log de auditoria** (`audit_log`) para acessos a dados sensíveis
6. **Revisão de arquitetura na Fase 2**: se clientes eleitorais ou grandes escritórios exigirem silo, migrar apenas esses clientes para Opção D (schema ou projeto dedicado) — não antecipar no MVP

### Modelo de dados proposto (esboço)

```sql
-- Toda tabela de negócio segue o padrão:
clients (id, name, segment, plan, status, ...)
contacts (id, client_id, ...)
projects (id, client_id, ...)
conversations (id, client_id, channel, ...)
ai_interaction_logs (id, client_id, ...)

-- Usuários internos: N clientes via membership
user_client_memberships (user_id, client_id, role_tags[])

-- Clientes externos: 1 client_id fixo no profile
profiles (id, role, client_id NULLABLE) -- client_id preenchido só para role=client
```

### Políticas RLS (princípio)

| Role | Acesso |
|------|--------|
| `owner` | Todos os `client_id` |
| `team` | Apenas `client_id`s da membership + tags de função |
| `client` | Apenas seu próprio `client_id` |

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Policy RLS incorreta | Crítico | Testes automatizados + code review obrigatório em migrations |
| Edge Function bypassa RLS (service role) | Crítico | Service role só em funções auditadas; preferir `auth.uid()` + RLS |
| Vazamento via IA/RAG | Crítico | ADR-002 — filtro de permissão antes do prompt |
| Regulador questiona multi-tenant | Alto | Documentação de isolamento + logs + DPA por cliente |
| Performance com muitos clientes | Médio | Índices em `client_id`, particionamento futuro se necessário |

---

## Perguntas para Decisão do Owner

1. **Opção A é aceitável** para clientes jurídicos e de saúde atuais, ou algum cliente exige silo físico desde o dia 1?
2. Há **cliente eleitoral confirmado** na Fase 0, ou isso fica para Fase 2?
3. O owner (Mairo) precisa de **visão financeira consolidada** cross-client no MVP, ou só CRM/projetos?
4. Existe **prazo de migração** de clientes do modelo atual (Supabase separado) para o TettoFlow?

---

## Consequências se Aprovado

- Todas as migrations incluem `client_id` + RLS desde a primeira tabela
- Edge Functions usam contexto autenticado, não service role, exceto jobs batch auditados
- Onboarding de novo cliente = insert em `clients` + memberships, sem provisionar infra
- Documentação de compliance por segmento em `DOCUMENTATION/02-ARCHITECTURE/security.md`

---

## Consequências se Rejeitado (alternativa B ou D)

- Pipeline de provisionamento de schema/projeto por cliente
- Atraso estimado de 2–4 semanas no MVP
- IA Interna com arquitetura de federation desde o início

---

**Aguardando aprovação explícita de Mairo antes de implementar qualquer módulo da Fase 0.**
