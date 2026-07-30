# TettoFlow AI OS — Visão do Produto

| Campo | Valor |
|-------|-------|
| **Versão** | 0.1 (rascunho) |
| **Data** | 2026-07-30 |
| **Status** | Aguardando aprovação |

---

## O que é

**TettoFlow AI OS** é o sistema operacional interno da **TettoHub** — agência de marketing digital full-service sediada em São Luís, Maranhão.

Não é um CRM genérico nem um chatbot isolado. É a **camada central** que unifica como a agência opera: clientes, projetos, atendimento inteligente, conhecimento interno e (em fases futuras) financeiro, social media e inteligência estratégica.

---

## Problema que resolve

Hoje a TettoHub opera com **fragmentação**:

- Cada cliente em stack separada (repo, Netlify, Supabase)
- Atendimento disperso entre WhatsApp manual, planilhas e automações pontuais
- Projetos gerenciados sem pipeline único visível
- Conhecimento da operação na cabeça das pessoas, não no sistema
- Impossível perguntar à IA "como está a operação?" com contexto real

Isso funciona com poucos clientes. **Não escala** com crescimento em segmentos regulados (jurídico, saúde, eleitoral) e equipe ampliada.

---

## Visão de futuro (horizonte 12–24 meses)

Um único sistema onde:

1. **Mairo (owner)** abre o dashboard e vê clientes ativos, aprovações pendentes, agenda do dia e (futuro) fluxo de caixa
2. **Equipe (team)** vê apenas seus clientes e tarefas, com tags por função (social media, designer, editor, videomaker, comercial)
3. **Clientes (client)** acessam status do próprio projeto — briefing, produção, aprovação, entrega
4. **Atendimento IA** responde no WhatsApp (e futuramente Instagram, Messenger, Telegram, Email) com contexto do CRM e handoff inteligente para humanos em temas regulados
5. **IA Interna** responde perguntas operacionais respeitando permissões — "qual o status do projeto X?", "o que ficou pendente de aprovação?", (futuro) "a equipe de design está sobrecarregada?"

---

## Princípios inegociáveis

### 1. Construção em fases
Nunca implementar 20+ módulos de uma vez. MVP primeiro, uso real, depois expansão.

### 2. Compliance desde o dia 1
Clientes em segmentos regulados (OAB, ANVISA, TSE) exigem handoff humano e logs de auditoria — não são "fase 2".

### 3. Isolamento de dados
Centralizar gestão ≠ misturar dados de clientes. Isolamento explícito (ADR-001).

### 4. IA com permissões, não IA onisciente
A IA Interna filtra o que pode ver por role, cliente e sensibilidade (ADR-002).

### 5. Stack que já roda
React + Vite + Supabase + n8n + Evolution API + Claude + Netlify. Sem dependências novas sem ADR.

---

## Usuários e papéis (Fase 0)

| Papel | Quem | Acesso |
|-------|------|--------|
| `owner` | Mairo | Tudo — todos os clientes, configurações, visão global |
| `team` | Funcionários/colaboradores | Clientes atribuídos + módulos conforme tags de função |
| `client` | Cliente da agência | Apenas seu projeto — pipeline, arquivos, aprovações |

Tags de função (flexíveis, não papéis rígidos): `social_media`, `designer`, `editor`, `videomaker`, `comercial`.

---

## Segmentos de clientes

| Segmento | Regulação | Implicação para IA |
|----------|-----------|-------------------|
| Jurídico | OAB | Handoff em aconselhamento jurídico específico |
| Saúde/Estética | ANVISA | Handoff em promessas de resultado |
| Eleitoral | TSE | Handoff em propaganda eleitoral (Fase 2+) |
| Geral | — | Atendimento autônomo com limites padrão |

---

## Fase 0 — MVP (escopo inicial)

- Autenticação (Supabase Auth)
- RBAC simplificado (owner / team / client)
- CRM básico (cliente, contato, plano, mensalidade, status, histórico, arquivos)
- Pipeline: Briefing → Produção → Aprovação → Correção → Entrega → Concluído
- Atendimento IA: **WhatsApp** via Evolution API
- Dashboard: clientes ativos, tarefas pendentes, aprovações pendentes, agenda do dia

**Fora do MVP:** Instagram, Messenger, financeiro, social media, RH, automações avançadas, Telegram, Email.

---

## Métricas de sucesso (Fase 0)

| Métrica | Meta |
|---------|------|
| Clientes cadastrados no CRM | ≥ 5 clientes reais migrados |
| Projetos no pipeline | ≥ 10 projetos ativos |
| Conversas WhatsApp via IA | ≥ 50 interações/semana com handoff correto |
| Tempo de resposta IA | < 30s (p95) |
| Incidentes de vazamento cross-client | **0** |
| Uso diário pelo owner | Dashboard aberto ≥ 1x/dia |

---

## O que NÃO é o TettoFlow

- Não é produto white-label para vender a outras agências (por enquanto)
- Não substitui ferramentas especializadas (Adobe, Meta Business Suite) — integra ou complementa
- Não é "ChatGPT com skin" — é sistema operacional com dados reais, permissões e auditoria

---

## Referências

- Prompt Mestre: `.cursor/rules/00_master.md`
- Estratégia: `DOCUMENTATION/00-MASTER/product-strategy.md`
- Roadmap: `DOCUMENTATION/ROADMAP.md`
- ADRs pendentes: `DOCUMENTATION/01-ADR/`

---

**Aguardando aprovação de Mairo.**
