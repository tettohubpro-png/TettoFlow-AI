# Setup rápido — Agente WhatsApp (gratuito)

## 1. Groq (LLM + Whisper) — 5 min

1. Crie conta em https://console.groq.com  
2. API Keys → Create API Key  
3. Guarde `gsk_...`

Modelos usados:
- Chat: `llama-3.3-70b-versatile`
- Áudio: `whisper-large-v3`

## 2. Evolution API — WhatsApp grátis

```bash
cd TettoFlow-AI/evolution
docker compose up -d
```

Isso sobe a Evolution API (v2.2.3) na porta `8080`, com Postgres/Redis próprios
(`docker-compose.yml`). A chave de API do compose é `tettoflow-evolution-key` — troque por
uma chave forte antes de expor a instância publicamente.

1. Abra `http://SEU-HOST:8080` (ou os docs da Evolution) e crie a instância `tettohub`
2. Escaneie o QR com o WhatsApp **comercial**
3. Registre o webhook apontando **direto para a Edge Function** (sem n8n):

```bash
curl -X POST "http://SEU-HOST:8080/webhook/set/tettohub" \
  -H "apikey: tettoflow-evolution-key" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "url": "https://lniinjegcvdcrmsrzqkt.supabase.co/functions/v1/agent-whatsapp?token=SEU_WEBHOOK_SHARED_SECRET",
      "enabled": true,
      "events": ["MESSAGES_UPSERT"]
    }
  }'
```

`SEU_WEBHOOK_SHARED_SECRET` deve ser o mesmo valor definido em `WEBHOOK_SHARED_SECRET` no
passo 3 — é a forma de autenticar o webhook já que a Evolution API não assina as chamadas e
não consegue enviar um JWT do Supabase.

## 3. Supabase Edge — `agent-whatsapp`

O agente (`supabase/functions/agent-whatsapp`) já resolve o cliente, carrega memória,
classifica intenção, aplica compliance (OAB/ANVISA/TSE), gera a resposta com Groq, cria
`operations` quando necessário e **envia a resposta de volta pela Evolution API**
(`/message/sendText`), sem depender de n8n.

```bash
cd TettoFlow-AI
supabase secrets set GROQ_API_KEY=gsk_...
supabase secrets set EVOLUTION_BASE_URL=http://SEU-HOST:8080
supabase secrets set EVOLUTION_API_KEY=tettoflow-evolution-key
supabase secrets set EVOLUTION_INSTANCE=tettohub
supabase secrets set WEBHOOK_SHARED_SECRET=<token-aleatorio-forte>
supabase secrets set INTERNAL_ALERT_PHONE=5598XXXXXXXXX   # opcional, alerta interno de nova operação
supabase functions deploy agent-whatsapp --no-verify-jwt
```

`--no-verify-jwt` é obrigatório aqui: a Evolution API chama a function diretamente, sem
sessão Supabase — a proteção do endpoint passa a ser o `?token=` acima, validado dentro da
própria function.

> A `whatsapp-webhook` (função mais antiga, sem Groq/roteamento) continua deployada mas não
> é mais o caminho usado em produção — foi substituída pela `agent-whatsapp` estendida.

## 4. Teste

1. Envie “Oi” no WhatsApp da agência → resposta humanizada + digitando…
2. Envie “Quero 3 posts essa semana” → deve criar operação Social Media + alerta interno (se
   `INTERNAL_ALERT_PHONE` configurado)
3. Envie áudio pedindo gravação → transcrição (Groq Whisper) + Videomaker
4. Confira os logs da function (`supabase functions logs agent-whatsapp`) se alguma etapa
   falhar — chamadas à Evolution (envio/presence/áudio) nunca derrubam a resposta, só ficam
   logadas como erro.  

## Contatos no CRM

Para identificar o cliente, cadastre o telefone em `client_contacts.phone` (com DDI, ex. 5598988887777).
