import type { JobRole, MembershipRole } from '@/types/database'

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

/** Labels amigáveis da hierarquia operacional */
export const ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: 'Master',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  MEMBER: 'Funcionário',
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

/** Conta bootstrap do primeiro acesso (e-mail real no Auth) */
export const BOOTSTRAP_ADMIN_EMAIL = 'admin@tettohub.com'
export const BOOTSTRAP_ADMIN_LOGIN = 'admin'

/** Papéis que o Master pode atribuir a funcionários */
export const ASSIGNABLE_ROLES: MembershipRole[] = ['MANAGER', 'MEMBER']

export function isMasterOwner(role: MembershipRole | undefined | null): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

/** Master: acesso total + criar/apagar equipe */
export function isMaster(role: MembershipRole | undefined | null): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

/** Gerente: vê tudo, não altera nem apaga */
export function isManager(role: MembershipRole | undefined | null): boolean {
  return role === 'MANAGER'
}

/** Funcionário: só operação (dashboard + tarefas) */
export function isEmployee(role: MembershipRole | undefined | null): boolean {
  return role === 'MEMBER'
}

/** Pode mutar dados (criar/editar/apagar entidades sensíveis) */
export function canMutateData(role: MembershipRole | undefined | null): boolean {
  return isMaster(role)
}

export function canManageTeam(role: MembershipRole | undefined | null): boolean {
  return isMaster(role)
}

export function canManageClients(role: MembershipRole | undefined): boolean {
  return isMaster(role)
}

export function canViewAllClients(role: MembershipRole | undefined): boolean {
  return isMaster(role) || isManager(role)
}

/** Ver financeiro/faturamento (Master + Gerente). Funcionário não. */
export function canViewFinance(role: MembershipRole | undefined): boolean {
  return isMaster(role) || isManager(role)
}

/** Alterar financeiro — só Master */
export function canManageFinance(role: MembershipRole | undefined): boolean {
  return isMaster(role)
}

export function canDeleteOperations(role: MembershipRole | undefined | null): boolean {
  return isMasterOwner(role)
}

export function canAssignTasks(role: MembershipRole | undefined): boolean {
  return isMaster(role)
}

export function canSendClientAlerts(role: MembershipRole | undefined): boolean {
  return isMaster(role)
}

export function canViewTeamReports(role: MembershipRole | undefined): boolean {
  return isMaster(role)
}

export function canManageApprovals(role: MembershipRole | undefined): boolean {
  return isMaster(role)
}

export function canEditBriefing(role: MembershipRole | undefined): boolean {
  return isMaster(role)
}

export function canUploadRecordings(role: MembershipRole | undefined): boolean {
  return isMaster(role) || isEmployee(role)
}

/** Operação de tarefas: funcionário e master editam; gerente só visualiza */
export function canOperateTasks(role: MembershipRole | undefined | null): boolean {
  return isMaster(role) || isEmployee(role)
}

export type NavItem = {
  to: string
  label: string
  short: string
  end?: boolean
}

const ALL_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', short: 'Home', end: true },
  { to: '/tarefas', label: 'Tarefas', short: 'Tasks' },
  { to: '/conteudo', label: 'Conteúdo', short: 'Cont' },
  { to: '/crm', label: 'CRM', short: 'CRM' },
  { to: '/financeiro', label: 'Financeiro', short: 'Fin' },
  { to: '/equipe', label: 'Equipe', short: 'Team' },
  { to: '/departamentos', label: 'Departamentos', short: 'Depts' },
  { to: '/aprovacoes', label: 'Aprovações', short: 'Aprov' },
  { to: '/alertas', label: 'Alertas', short: 'Alert' },
  { to: '/relatorios', label: 'Relatórios', short: 'Rel' },
  { to: '/ia', label: 'IA', short: 'IA' },
  { to: '/whatsapp', label: 'WhatsApp IA', short: 'Zap' },
  { to: '/mensagens', label: 'Mensagens', short: 'Msgs' },
  { to: '/configuracoes', label: 'Configurações', short: 'Config' },
]

/** Rotas liberadas para funcionário (operacional) */
const EMPLOYEE_PATHS = new Set([
  '/',
  '/projetos',
  '/tarefas',
  '/conteudo',
  '/configuracoes',
])

/** Rotas só Master (gestão de pessoas e ponto/relatório de tempo) */
const MASTER_ONLY_PATHS = new Set(['/equipe', '/assinatura', '/relatorios'])

export function canAccessPath(
  role: MembershipRole | undefined | null,
  pathname: string,
): boolean {
  if (!role) return false
  if (role === 'CLIENT') return false

  const path = pathname.split('?')[0].replace(/\/$/, '') || '/'

  if (isEmployee(role)) {
    if (path === '/') return true
    if ([...EMPLOYEE_PATHS].some((p) => p !== '/' && (path === p || path.startsWith(`${p}/`)))) {
      return true
    }
    return false
  }

  if (isManager(role)) {
    if (MASTER_ONLY_PATHS.has(path) || path.startsWith('/equipe')) return false
    return true
  }

  if (isMaster(role)) return true
  return false
}

export function filterNavByRole<T extends { to: string }>(
  items: T[],
  role: MembershipRole | undefined | null,
): T[] {
  return items.filter((item) => canAccessPath(role, item.to))
}

export function navItemsForRole(role: MembershipRole | undefined | null): NavItem[] {
  if (!role) return []
  return ALL_NAV.filter((item) => canAccessPath(role, item.to))
}

export function bottomNavForRole(role: MembershipRole | undefined | null): NavItem[] {
  const items = navItemsForRole(role)
  const preferred = ['/', '/tarefas', '/crm', '/relatorios', '/configuracoes']
  const picked: NavItem[] = []
  for (const to of preferred) {
    const found = items.find((i) => i.to === to)
    if (found) picked.push(found)
  }
  if (picked.length < 3) {
    for (const item of items) {
      if (!picked.some((p) => p.to === item.to)) picked.push(item)
      if (picked.length >= 5) break
    }
  }
  return picked.slice(0, 5)
}

/** Aceita "admin" ou e-mail completo no login */
export function normalizeLoginIdentifier(raw: string): string {
  const value = raw.trim().toLowerCase()
  if (!value) return value
  if (value === BOOTSTRAP_ADMIN_LOGIN) return BOOTSTRAP_ADMIN_EMAIL
  if (!value.includes('@')) return `${value}@tettohub.com`
  return value
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

export const PROJECT_STATUS_LABELS = OPERATION_STATUS_LABELS
export const PROJECT_STATUS_ORDER = OPERATION_STATUS_ORDER
export const nextProjectStatus = nextOperationStatus
export const previousProjectStatus = previousOperationStatus
