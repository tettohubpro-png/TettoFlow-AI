import type { Profile, UserRole } from '@/types/database'

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  production: 'Produção',
  approval: 'Aprovação',
  correction: 'Correção',
  delivery: 'Entrega',
  completed: 'Concluído',
}

export const PROJECT_STATUS_ORDER = [
  'briefing',
  'production',
  'approval',
  'correction',
  'delivery',
  'completed',
] as const

export const SEGMENT_LABELS: Record<string, string> = {
  legal: 'Jurídico',
  health_aesthetics: 'Saúde/Estética',
  electoral: 'Eleitoral',
  general: 'Geral',
}

export function canManageClients(role: UserRole): boolean {
  return role === 'owner' || role === 'team'
}

export function canViewAllClients(profile: Profile | null): boolean {
  return profile?.role === 'owner'
}

export function nextProjectStatus(current: string): string | null {
  const idx = PROJECT_STATUS_ORDER.indexOf(
    current as (typeof PROJECT_STATUS_ORDER)[number],
  )
  if (idx < 0 || idx >= PROJECT_STATUS_ORDER.length - 1) return null
  return PROJECT_STATUS_ORDER[idx + 1]
}
