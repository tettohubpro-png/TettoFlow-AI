import type { MembershipRole } from '@/types/database'

export const OPERATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Enviado',
  ANALYSIS: 'Análise',
  PRODUCTION: 'Produção',
  REVIEW: 'Revisão',
  CLIENT: 'Cliente',
  APPROVED: 'Aprovado',
  PUBLISHED: 'Publicado',
  DONE: 'Concluído',
}

export const OPERATION_STATUS_ORDER = [
  'DRAFT',
  'SUBMITTED',
  'ANALYSIS',
  'PRODUCTION',
  'REVIEW',
  'CLIENT',
  'APPROVED',
  'PUBLISHED',
  'DONE',
] as const

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  ARCHIVED: 'Arquivado',
}

export const OPERATION_PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export const ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  MEMBER: 'Membro',
  CLIENT: 'Cliente',
}

/** Papéis que podem gerenciar clientes e operações */
const MANAGER_ROLES: MembershipRole[] = ['OWNER', 'ADMIN', 'MANAGER']

export function canManageClients(role: MembershipRole | undefined): boolean {
  if (!role) return false
  return MANAGER_ROLES.includes(role)
}

export function canViewAllClients(role: MembershipRole | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

export function nextOperationStatus(current: string): string | null {
  const idx = OPERATION_STATUS_ORDER.indexOf(
    current as (typeof OPERATION_STATUS_ORDER)[number],
  )
  if (idx < 0 || idx >= OPERATION_STATUS_ORDER.length - 1) return null
  return OPERATION_STATUS_ORDER[idx + 1]
}

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  CHANGES_REQUESTED: 'Alterações solicitadas',
  CANCELLED: 'Cancelado',
}

export const APPROVAL_TYPE_LABELS: Record<string, string> = {
  INTERNAL: 'Interna',
  CLIENT: 'Cliente',
}

export function canManageApprovals(role: MembershipRole | undefined): boolean {
  if (!role) return false
  return MANAGER_ROLES.includes(role)
}

/** Social Media / gestores editam onboard e briefing */
export function canEditBriefing(role: MembershipRole | undefined): boolean {
  if (!role) return false
  return MANAGER_ROLES.includes(role)
}

/** Videomaker / gestores sobem gravações */
export function canUploadRecordings(role: MembershipRole | undefined): boolean {
  if (!role) return false
  return MANAGER_ROLES.includes(role) || role === 'MEMBER'
}

// Aliases legados
export const PROJECT_STATUS_LABELS = OPERATION_STATUS_LABELS
export const PROJECT_STATUS_ORDER = OPERATION_STATUS_ORDER
export const nextProjectStatus = nextOperationStatus
