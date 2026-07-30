# TettoFlow AI OS — Estratégia de Produto

| Campo | Valor |
|-------|-------|
| **Versão** | 0.1 (rascunho) |
| **Data** | 2026-07-30 |
| **Status** | Aguardando aprovação |

---

## Posicionamento

**TettoFlow AI OS** é o sistema nervoso central da TettoHub — não um produto para o mercado externo na Fase 0, mas a **infraestrutura interna** que permite a agência escalar operação, compliance e inteligência sem multiplicar ferramentas.

**Proposta de valor interna:**
> "Um lugar para ver clientes, projetos e atendimento — com IA que conhece a operação, respeita permissões e escala para humano quando necessário."

---

## Contexto de mercado (TettoHub)

**Quem somos:** Agência full-service em São Luís-MA.

**Segmentos atuais:**
- Jurídico (advocacia)
- Saúde e estética
- Automotivo
- Varejo
- Consultoria
- Nutrição
- Lançamento editorial/digital

**Expansão planejada:** Marketing de campanhas eleitorais (TSE).

**Modelo de receita da agência:** Planos mensais (mensalidades) + projetos pontuais. O CRM do TettoFlow reflete isso desde o MVP.

---

## Problemas prioritários (ordenados por dor operacional)

| # | Dor | Impacto | Resolvido em |
|---|-----|---------|--------------|
| 1 | Não sei status de todos os projetos de relance | Alto — owner perde tempo perguntando | Fase 0 (pipeline + dashboard) |
| 2 | Atendimento WhatsApp manual e repetitivo | Alto — horas da equipe | Fase 0 (WhatsApp IA) |
| 3 | Dados de clientes espalhados (Supabase/repo por cliente) | Médio-Alto — ops overhead | Fase 0 (CRM centralizado + ADR-001) |
| 4 | Aprovações de cliente sem rastreio | Médio — retrabalho | Fase 0 (pipeline) |
| 5 | Sem visão financeira consolidada | Médio | Fase 1 |
| 6 | Calendário de conteúdo desconectado do CRM | Médio | Fase 1 |
| 7 | Equipe sem visibilidade de carga | Baixo-Médio | Fase 2 (Centro de Inteligência) |

---

## Estratégia de fases

### Fase 0 — MVP: "Operação visível + WhatsApp inteligente"

**Objetivo:** Substituir planilhas e atendimento manual para os clientes atuais. Mairo e equipe passam a usar o TettoFlow no dia a dia.

**Módulos:**
1. Auth + RBAC
2. CRM básico
3. Pipeline de projeto
4. Atendimento IA (WhatsApp)
5. Dashboard

**Critério de saída da Fase 0:**
- ≥ 3 membros da equipe usando semanalmente
- ≥ 5 clientes no CRM
- ≥ 1 semana de atendimento WhatsApp sem incidente de compliance
- ADR-001 e ADR-002 aprovados e implementados

**Não incluir:** financeiro, Instagram, social media calendar, RH.

---

### Fase 1 — "Operação completa"

**Pré-requisito:** Fase 0 em uso real por ≥ 30 dias.

**Adições:**
- Instagram + Messenger no atendimento IA
- Módulo financeiro (mensalidades, entradas, saídas, fluxo de caixa)
- Social media (calendário, aprovação, publicação)
- Relatórios operacionais e financeiros
- IA Interna expandida (busca em contratos, histórico financeiro com permissões)

**Critério de saída:** Owner consegue responder "quanto entrou esse mês?" e "qual conteúdo está pendente de aprovação?" no sistema.

---

### Fase 2 — "Inteligência e escala"

**Pré-requisito:** Fase 1 estável + sinais de sobrecarga operacional.

**Adições:**
- RH (cadastro, funções, carga)
- Automações multi-etapa (n8n avançado)
- Centro de Inteligência (análises proativas)
- Telegram, Email
- Campanhas eleitorais (se demanda confirmada)

---

## Personas

### Mairo — Owner
- **Quer:** visão global, controle, decisões rápidas
- **Usa:** dashboard, CRM, aprovações, (futuro) financeiro
- **Medo:** vazamento de dados entre clientes; IA respondendo besteira em segmento regulado

### Colaborador — Team
- **Quer:** saber o que fazer hoje, sem ruído de outros clientes
- **Usa:** pipeline, tarefas, arquivos do cliente atribuído
- **Medo:** ferramenta complicada; acessar dado errado por engano

### Cliente da agência — Client
- **Quer:** ver andamento do projeto, aprovar entregas
- **Usa:** portal restrito (pipeline, arquivos, chat futuro)
- **Medo:** não saber o que está acontecendo; aprovar coisa errada

### Lead (WhatsApp) — Externo
- **Quer:** resposta rápida, agendar, tirar dúvida
- **Interage via:** bot IA com handoff para humano
- **Medo:** (regulado) receber aconselhamento indevido da IA

---

## Diferenciais vs. ferramentas genéricas

| Aspecto | CRM genérico (HubSpot, etc.) | TettoFlow |
|---------|------------------------------|-----------|
| Segmentos regulados BR | Adaptação manual | Handoff nativo por segmento |
| Stack TettoHub | Integração custom | Supabase + n8n + Evolution nativos |
| IA Interna | Não incluída | RAG com permissões (ADR-002) |
| Pipeline agência | Genérico | Briefing → Entrega (workflow TettoHub) |
| Custo | SaaS mensal alto | Infra própria, custo controlado |

---

## Riscos de produto

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| MVP muito grande — nunca lança | Alta | Fase 0 estrita; 5 módulos apenas |
| Equipe não adota | Média | UX simples; migrar 1 cliente piloto primeiro |
| IA erra em segmento regulado | Média | Handoff obrigatório + logs (Regra 3) |
| Migração de clientes do modelo antigo | Média | Import manual Fase 0; automação Fase 1 |
| Scope creep (Mairo pede financeiro no MVP) | Alta | Roadmap documentado; ADR para exceções |

---

## Cliente piloto recomendado (Fase 0)

Escolher **1 cliente de segmento `general`** (não regulado) para:
- Primeiro cadastro no CRM
- Primeiro projeto no pipeline
- Primeiro teste de WhatsApp IA

Migrar clientes regulados (jurídico, saúde) **após** validar handoff e logs por ≥ 2 semanas.

---

## KPIs por fase

### Fase 0
- Adoção interna (DAU/WAU owner + team)
- Tempo médio de resposta WhatsApp IA
- Taxa de handoff (% conversas escaladas)
- Projetos com status atualizado (< 7 dias stale)

### Fase 1
- MRR visível no dashboard
- Conteúdos aprovados vs. publicados no prazo
- Canais adicionais (Instagram/Messenger) ativos

### Fase 2
- Alertas proativos acionados/semana
- Redução de tempo em tarefas manuais (baseline vs. atual)

---

## Decisões estratégicas pendentes (owner)

1. Aprovar ADR-001 (isolamento RLS vs. schemas vs. híbrido)
2. Aprovar ADR-002 (RAG com metadata vs. fallback SQL-only no MVP)
3. Definir **cliente piloto** para Fase 0
4. Confirmar se IA Interna entra no MVP ou só Fase 1
5. Confirmar provider de embeddings (complementar ao Claude)

---

## Próximo passo após aprovação deste documento

Documentação técnica do módulo **Autenticação** em `DOCUMENTATION/05-MODULES/auth.md` — aguardando aprovação explícita antes de implementar.

---

**Aguardando aprovação de Mairo.**
