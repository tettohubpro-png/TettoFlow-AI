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
# Exemplo Docker (ajuste volumes/portas)
docker run -d --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua-chave-segura \
  atendai/evolution-api:latest
```

1. Abra o painel / docs da Evolution  
2. Crie instância `tettohub`  
3. Escaneie o QR com o WhatsApp **comercial**  
4. Configure webhook:
   - URL: `https://SEU-N8N/webhook/whatsapp-agent`
   - Evento: `MESSAGES_UPSERT`

## 3. n8n

1. Importar: `n8n/workflows/whatsapp-agent-operacional.json`  
2. Variáveis de ambiente no n8n:

```
EVOLUTION_BASE_URL=https://sua-evolution:8080
EVOLUTION_API_KEY=sua-chave-segura
EVOLUTION_INSTANCE=tettohub
GROQ_API_KEY=gsk_...
SUPABASE_URL=https://lniinjegcvdcrmsrzqkt.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
INTERNAL_ALERT_PHONE=5598XXXXXXXXX
```

3. Ativar o workflow

## 4. Supabase Edge

```bash
cd TettoFlow-AI
supabase secrets set GROQ_API_KEY=gsk_...
supabase functions deploy agent-whatsapp
```

## 5. Teste

1. Envie “Oi” no WhatsApp da agência → resposta humanizada + digitando…  
2. Envie “Quero 3 posts essa semana” → deve criar operação Social Media + alerta interno  
3. Envie áudio pedindo gravação → transcrição + Videomaker  

## Contatos no CRM

Para identificar o cliente, cadastre o telefone em `client_contacts.phone` (com DDI, ex. 5598988887777).
