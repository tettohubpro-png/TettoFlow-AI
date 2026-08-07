import type { AppUser, JobRole, MembershipRole } from '@/types/database'

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
  OWNER: 'Proprietário (Master)',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente / Gestor',
  MEMBER: 'Membro',
  CLIENT: 'Cliente',
}

export const JOB_ROLE_LABELS: Record<JobRole, string> = {
  gerente: 'Gerente',
  gestor: 'Gestor',
  social_media: 'Social Media',
  design: 'Design',
  videomaker: 'Videomaker',
  photographer: 'Fotógrafo',
  video_editor: 'Editor de Vídeo',
  traffic: 'Tráfego Pago',
}

export const JOB_ROLE_ORDER: JobRole[] = [
  'gerente',
  'gestor',
  'social_media',
  'design',
  'videomaker',
  'photographer',
  'video_editor',
  'traffic',
]

/** E-mail master do proprietário (Mairo / TettoHub) */
export const MASTER_OWNER_EMAIL = 'tettohub@gmail.com'

const MANAGER_ROLES: MembershipRole[] = ['OWNER', 'ADMIN', 'MANAGER']

export function isMasterOwner(
  role: MembershipRole | undefined | null,
  appUser?: Pick<AppUser, 'email' | 'name'> | null,
): boolean {
  if (role === 'OWNER') return true
  const email = appUser?.email?.toLowerCase() ?? ''
  if (email === MASTER_OWNER_EMAIL) return true
  const name = appUser?.name?.toLowerCase() ?? ''
  return name.includes('mairo')
}

export function canManageClients(role: MembershipRole | undefined): boolean {
  if (!role) return false
  return MANAGER_ROLES.includes(role)
}

export function canViewAllClients(role: MembershipRole | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

/** Financeiro é dado sensível — mesmo corte de papéis usado na RLS de
 * client_contracts/financial_entries (OWNER/ADMIN/MANAGER). */
export function canManageFinance(role: MembershipRole | undefined): boolean {
  if (!role) return false
  return MANAGER_ROLES.includes(role)
}

export function canDeleteOperations(
  role: MembershipRole | undefined | null,
  appUser?: Pick<AppUser, 'email' | 'name'> | null,
): boolean {
  return isMasterOwner(role, appUser)
}

export function canAssignTasks(role: MembershipRole | undefined): boolean {
  if (!role) return false
  return MANAGER_ROLES.includes(role)
}

export function canSendClientAlerts(role: MembershipRole | undefined): boolean {
  if (!role) return false
  return MANAGER_ROLES.includes(role)
}

export function canViewTeamReports(role: MembershipRole | undefined): boolean {
  if (!role) return false
  return MANAGER_ROLES.includes(role)
}

export function nextOperationStatus(current: string): string | null {
  const idx = OPERATION_STATUS_ORDER.indexOf(
    current as (typeof OPERATION_STATUS_ORDER)[number],
  )
  if (idx < 0 || idx >= OPERATION_STATUS_ORDER.length - 1) return null
  return OPERATION_STATUS_ORDER[idx + 1]
}

export function previousOperationStatus(current: string): string | null {
  const idx = OPERATION_STATUS_ORDER.indexOf(
    current as (typeof OPERATION_STATUS_ORDER)[number],
  )
  if (idx <= 0) return null
  return OPERATION_STATUS_ORDER[idx - 1]
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

export function canEditBriefing(role: MembershipRole | undefined): boolean {
  if (!role) return false
  return MANAGER_ROLES.includes(role)
}

export function canUploadRecordings(role: MembershipRole | undefined): boolean {
  if (!role) return false
  return MANAGER_ROLES.includes(role) || role === 'MEMBER'
}

export const PROJECT_STATUS_LABELS = OPERATION_STATUS_LABELS
export const PROJECT_STATUS_ORDER = OPERATION_STATUS_ORDER
export const nextProjectStatus = nextOperationStatus
export const previousProjectStatus = previousOperationStatus
