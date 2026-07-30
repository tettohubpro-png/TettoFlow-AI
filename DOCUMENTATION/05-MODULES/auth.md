# Módulo: Autenticação + RBAC

| Status | Implementado (Fase 0) |
|--------|----------------------|

## Escopo

- Supabase Auth (email/senha)
- Profiles com roles: `owner`, `team`, `client`
- Tags de função em `function_tags` (team)
- Rotas protegidas no frontend

## Arquivos

- `src/contexts/AuthContext.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/pages/LoginPage.tsx`
- `supabase/migrations/20260730000000_initial_schema.sql` (profiles, RLS)

## Setup owner

```sql
UPDATE profiles SET role = 'owner', full_name = 'Mairo' WHERE id = '<uuid>';
```
