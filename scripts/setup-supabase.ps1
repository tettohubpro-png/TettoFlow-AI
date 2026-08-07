# TettoFlow AI OS — Setup Supabase + Deploy
# Execute após DESPAUSAR o projeto em:
# https://supabase.com/dashboard/project/lniinjegcvdcrmsrzqkt

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== 1. Vincular projeto Supabase ===" -ForegroundColor Cyan
supabase link --project-ref lniinjegcvdcrmsrzqkt

Write-Host "`n=== 2. Aplicar migrations ===" -ForegroundColor Cyan
supabase db push

Write-Host "`n=== 3. Deploy Edge Functions (WhatsApp) ===" -ForegroundColor Cyan
supabase functions deploy whatsapp-webhook --no-verify-jwt
supabase functions deploy agent-whatsapp --no-verify-jwt

Write-Host "`n=== 4. Secrets do agente WhatsApp (edite os placeholders antes de rodar) ===" -ForegroundColor Cyan
Write-Host @"
supabase secrets set GROQ_API_KEY=<sua-groq-key>
supabase secrets set EVOLUTION_BASE_URL=http://<host-da-evolution>:8080
supabase secrets set EVOLUTION_API_KEY=tettoflow-evolution-key
supabase secrets set EVOLUTION_INSTANCE=tettohub
supabase secrets set WEBHOOK_SHARED_SECRET=<token-aleatorio-forte>
supabase secrets set INTERNAL_ALERT_PHONE=<numero-interno-opcional>
"@

Write-Host "`n=== 5. Chaves do projeto ===" -ForegroundColor Cyan
Write-Host "Pegue a anon key em: Settings > API no dashboard Supabase"
Write-Host "Cole em .env.local:"
Write-Host "  VITE_SUPABASE_URL=https://lniinjegcvdcrmsrzqkt.supabase.co"
Write-Host "  VITE_SUPABASE_ANON_KEY=<sua-key>"

Write-Host "`n=== 6. Definir owner (após criar usuário no Auth) ===" -ForegroundColor Cyan
Write-Host @"
UPDATE profiles SET role = 'owner', full_name = 'Mairo' WHERE id = '<seu-uuid>';
"@

Write-Host "`nConcluído!" -ForegroundColor Green
