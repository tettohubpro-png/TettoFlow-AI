# Módulo: WhatsApp IA

| Status | Implementado (Fase 0) |
|--------|----------------------|

## Fluxo

Evolution API → n8n → Edge Function `whatsapp-webhook` → handoff/compliance → log

## Compliance (Regra 3)

- Segmento lido do CRM
- Handoff obrigatório: jurídico, saúde, eleitoral
- Log em `ai_interaction_logs`

## Arquivos

- `supabase/functions/whatsapp-webhook/index.ts`
- `n8n/workflows/whatsapp-ai.json`
- `src/utils/compliance.ts` + testes
