# Módulo: Briefing + Upload Drive

| Status | Implementado |
|--------|--------------|

## Responsabilidades

- **Social Media** (OWNER/ADMIN/MANAGER): preenche e salva onboard/briefing do cliente
- **Videomaker** (MEMBER+): sobe gravações via drag-and-drop

## Dados persistidos

| Seção | Tabela |
|-------|--------|
| Identidade | `client_brand` |
| Produtos | `client_products` |
| Briefing textual | `client_ai_memory` |
| Arquivos / gravações | `files` (link Drive em `storage_path`) |

## Pasta no Google Drive

Padrão: `NomeEmpresa_YYYY-MM-DD`  
Ex.: `AM-Consultoria_2026-07-30`

## Secrets (Supabase Edge Function)

Configure no projeto Supabase (`tettoflow`):

```bash
supabase secrets set GOOGLE_DRIVE_PARENT_FOLDER_ID="<id-da-pasta-mae>"
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
supabase functions deploy drive-upload
```

### Setup Google (checklist)

1. Google Cloud → ativar **Google Drive API**
2. Criar **Service Account** e baixar JSON
3. No Drive da TettoHub, criar pasta-mãe (ex.: `TettoFlow Gravações`)
4. Compartilhar a pasta-mãe com o e-mail da service account (**Editor**)
5. Copiar o ID da pasta (URL: `.../folders/<ID>`)

Sem secrets, o upload registra o arquivo como `pending-drive/...` no banco (fallback) e avisa na UI.

## Rotas

- `/crm` — lista + Abrir briefing
- `/crm/:clientId` — abas Briefing e Gravações

## Arquivos

- `src/pages/ClientBriefingPage.tsx`
- `src/hooks/useClientBriefing.ts`
- `src/hooks/useDriveUpload.ts`
- `src/components/files/DriveDropzone.tsx`
- `supabase/functions/drive-upload/index.ts`
