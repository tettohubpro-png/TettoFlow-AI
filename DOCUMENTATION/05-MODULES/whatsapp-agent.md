# Módulo: Agente WhatsApp Operacional

| Campo | Valor |
|-------|-------|
| **Status** | Spec + workflow n8n + edge function |
| **Data** | 2026-07-30 |
| **Fase** | MVP operacional (gratuito) |

---

## 1. Objetivo

Agente de IA que recepciona clientes no WhatsApp de forma humanizada:

- Lê texto e **áudio** (transcrição)
- Mostra **“digitando…”** enquanto processa
- Resolve ou registra: pedidos de post, marcação de gravação, edição, tráfego
- **Roteia** automaticamente para o departamento certo
- Escala para humano em temas regulados (OAB/ANVISA/TSE)

---

## 2. Stack gratuita (escolhida)

| Camada | Tecnologia | Custo | Por quê |
|--------|------------|-------|---------|
| WhatsApp | **Evolution API** (self-host Docker) | Grátis (VPS) | Já previsto no TettoFlow; QR Code; typing; áudio |
| Orquestração | **n8n** | Grátis self-host / cloud trial | Nós visuais; webhooks |
| LLM | **Groq — Llama 3.3 70B** | Free tier generoso | Rápido, bom PT-BR, API simples |
| STT (áudio) | **Groq Whisper** (`whisper-large-v3`) | Free tier | Transcreve áudio WhatsApp |
| Backend | Supabase Edge `agent-whatsapp` | Incluso | Memória cliente + operações + log |

### Alternativas (se Groq acabar cota)

1. Google Gemini 2.0 Flash (free tier)
2. OpenRouter modelos free
3. Depois: Claude (pago) — ADR futuro

### WhatsApp: por que Evolution e não Cloud API Meta

- Cloud API Meta exige negócio verificado e cobra por conversa
- Evolution: conectar com QR em minutos, grátis
- **Risco:** não é API oficial Meta — usar número comercial dedicado, não o pessoal principal

---

## 3. Quem executa (roteamento)

| Intenção do cliente | `department` | Quem recebe | Exemplo |
|---------------------|--------------|-------------|---------|
| Post, story, reel, legenda, calendário | `social_media` | Social Media | “Quero 3 posts essa semana” |
| Gravação, filmagem, agenda, local | `videomaker` | Videomaker | “Marcar gravação sexta 14h” |
| Edição, corte, legenda em vídeo, after | `video_editor` | Editor | “Ainda não saiu o vídeo editado?” |
| Ads, anúncio, Meta Ads, Google Ads | `traffic` | Gestor de Tráfego | “Pausar campanha do Instagram” |
| Aprovação, prazo, reclamação, orçamento | `manager` | Gestor | “Quem aprova o post?” |
| Novo serviço, proposta, valor de pacote | `commercial` | Comercial/OWNER | “Quero incluir tráfego no contrato” |
| Dúvida geral / FAQ da empresa | `general` | Agente resolve | “Qual o horário de vocês?” |

Se o agente **resolver sozinho** (FAQ, status simples): responde e só registra log.  
Se precisar **execução humana**: cria/atualiza `operation` + notifica memberships do departamento.

---

## 4. Fluxo (nós n8n)

```
Evolution Webhook (MESSAGES_UPSERT)
    │
    ▼
Normalizar payload (telefone, tipo, mídia)
    │
    ├─ áudio? → Baixar mídia Evolution → Groq Whisper → texto
    │
    ▼
Presence: composing (digitando…)
    │
    ▼
Edge Function agent-whatsapp
    │  • identifica cliente (telefone / client_contacts)
    │  • carrega client_ai_memory
    │  • classifica intenção + departamento
    │  • compliance handoff
    │  • gera resposta humanizada (Groq)
    │  • cria operation se necessário
    │
    ▼
Presence: paused
    │
    ▼
Enviar texto (Evolution sendText)
    │
    ├─ handoff? → notificar gestor no TettoFlow
    └─ department != general? → notificação interna
```

Arquivo: `n8n/workflows/whatsapp-agent-operacional.json`

---

## 5. Tom humanizado (prompt)

- Português BR, natural, curto (máx. ~4 frases no WhatsApp)
- Apresenta-se como assistente da TettoHub / do cliente
- Confirma o pedido e diz **quem** vai cuidar (Social, Videomaker…)
- Nunca inventa prazo/preço sem dado em memória
- Em dúvida: pergunta 1 coisa objetiva

---

## 6. Variáveis de ambiente

### n8n / Edge

```
EVOLUTION_BASE_URL=https://sua-evolution.com
EVOLUTION_API_KEY=...
EVOLUTION_INSTANCE=tettohub
GROQ_API_KEY=gsk_...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # só na edge
SUPABASE_ANON_KEY=...           # n8n se precisar
```

### Secrets Supabase

```bash
supabase secrets set GROQ_API_KEY=gsk_...
supabase functions deploy agent-whatsapp
```

---

## 7. Setup rápido Evolution + Groq

1. Subir Evolution API (Docker) — [docs](https://doc.evolution-api.com)
2. Criar instância `tettohub` → escanear QR
3. Webhook da instância → URL do n8n `/webhook/whatsapp-agent`
4. Eventos: `MESSAGES_UPSERT`
5. Conta Groq: https://console.groq.com → API Key
6. Importar workflow `whatsapp-agent-operacional.json` no n8n
7. Preencher credenciais / env

---

## 8. Critérios de aceite (MVP)

- [ ] Texto inbound responde em < 8s (com typing)
- [ ] Áudio é transcrito e respondido
- [ ] Pedido de post → department `social_media` + operation
- [ ] Pedido de gravação → `videomaker`
- [ ] Tema jurídico sensível → handoff humano
- [ ] Resposta cita quem vai executar

---

## 9. Arquivos

- `n8n/workflows/whatsapp-agent-operacional.json`
- `supabase/functions/agent-whatsapp/index.ts`
- `src/utils/intentRouter.ts`
- `DOCUMENTATION/05-MODULES/whatsapp-agent.md` (este)
