# TettoFlow AI OS

Sistema operacional interno da TettoHub — CRM, projetos, atendimento IA e dashboard.

## Stack

React + Vite + TypeScript + TailwindCSS · Supabase · Claude · n8n · Evolution API · Netlify

## Setup rápido

### 1. Supabase

```bash
# Crie projeto em https://supabase.com
# Rode as migrations em supabase/migrations/
supabase db push
```

Depois crie um usuário no Auth e defina como owner:

```sql
UPDATE profiles SET role = 'owner', full_name = 'Mairo' WHERE id = '<seu-uuid>';
```

### 2. Frontend

```bash
cp .env.example .env.local
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

Abre em **http://localhost:5173**

### 3. Edge Functions

```bash
supabase functions deploy whatsapp-webhook
```

### 4. n8n

Importe `n8n/workflows/whatsapp-ai.json` e configure variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

### 5. Deploy Netlify

Conecte o repositório — `netlify.toml` já configurado.

## Módulos Fase 0

| Módulo | Rota | Status |
|--------|------|--------|
| Auth + RBAC | `/login` | ✅ |
| Dashboard | `/` | ✅ |
| CRM | `/crm` | ✅ |
| Pipeline | `/projetos` | ✅ |
| WhatsApp IA | `/whatsapp` | ✅ (webhook + n8n) |

## Documentação

- [Visão](DOCUMENTATION/00-MASTER/vision.md)
- [Estratégia](DOCUMENTATION/00-MASTER/product-strategy.md)
- [ADR-001](DOCUMENTATION/01-ADR/ADR-001-data-isolation.md)
- [ADR-002](DOCUMENTATION/01-ADR/ADR-002-rag-access-control.md)
- [Roadmap](DOCUMENTATION/ROADMAP.md)

## Testes

```bash
npm test
```
