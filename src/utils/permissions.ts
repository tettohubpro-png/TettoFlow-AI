import type { JobRole, MembershipRole } from '@/types/database'

export const OPERATION_STATUS_LABELS: Record<string, string> = {
  NEW: 'Nova tarefa',
  IN_PROGRESS: 'Em criação',
  APPROVAL: 'Aprovação',
  REVISION: 'Revisão',
  DONE: 'Concluído',
}

export const OPERATION_STATUS_ORDER = [
  'NEW',
  'IN_PROGRESS',
  'APPROVAL',
  'REVISION',
  'DONE',
] as const

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  ARCHIVED: 'Arquivado',
}

export const CLIENT_TYPE_LABELS: Record<string, string> = {
  CLIENT: 'Cliente',
  PARTNER: 'Parceiro',
}

export const PIPELINE_STAGE_LABELS: Record<string, string> = {
  PROSPECT: 'Prospecção',
  CONTACTED: 'Contatado',
  INTERESTED: 'Interessado',
  PROPOSAL_SENT: 'Proposta enviada',
  WON: 'Convertido',
  LOST: 'Perdido',
}

/** Ordem das colunas do Kanban de Prospecção — 'LOST' fica de fora do fluxo linear. */
export const PIPELINE_STAGE_ORDER = [
  'PROSPECT',
  'CONTACTED',
  'INTERESTED',
  'PROPOSAL_SENT',
] as const

export const LOST_REASON_LABELS: Record<string, string> = {
  NO_INTEREST: 'Sem interesse',
  HAS_AGENCY: 'Já tem agência',
  NO_BUDGET: 'Sem orçamento',
  NO_RESPONSE: 'Sem resposta',
  OTHER: 'Outro motivo',
}

export function nextPipelineStage(current: string): string | null {
  const idx = PIPELINE_STAGE_ORDER.indexOf(current as (typeof PIPELINE_STAGE_ORDER)[number])
  if (idx < 0) return null
  if (idx >= PIPELINE_STAGE_ORDER.length - 1) return 'WON'
  return PIPELINE_STAGE_ORDER[idx + 1]
}

export function previousPipelineStage(current: string): string | null {
  const idx = PIPELINE_STAGE_ORDER.indexOf(current as (typeof PIPELINE_STAGE_ORDER)[number])
  if (idx <= 0) return null
  return PIPELINE_STAGE_ORDER[idx - 1]
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

/**
 * Os 3 níveis da estrutura do CRM — Operação (executa a demanda) →
 * Gerência (organiza, entrega, aprova internamente) → Administrativa
 * (contas, valores, decide o que vai pro cliente). Puramente visual/
 * organizacional: não é checado em nenhum `can*()`, só rotula o papel real
 * (`MembershipRole`) pra quem está logado saber em qual nível está.
 */
export const TIER_LABELS: Record<MembershipRole, string> = {
  OWNER: 'Administrativa',
  ADMIN: 'Administrativa',
  MANAGER: 'Gerência',
  MEMBER: 'Operação',
  CLIENT: '—',
}

export const JOB_ROLE_LABELS: Record<JobRole, string> = {
  gerente: 'Gerente',
  gestor: 'Gestor',
  social_media: 'Social Media',
  design: 'Design',
  videomaker: 'Videomaker',
  photographer: 'Fotógrafo',
  video_editor: 'Editor de Vídeo',
  traffic: 'Gestor de Tráfego',
  drone_pilot: 'Piloto de Drone',
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
  'drone_pilot',
]

/** Conta bootstrap do primeiro acesso (e-mail real no Auth) */
export const BOOTSTRAP_ADMIN_EMAIL = 'admin@tettohub.com'
export const BOOTSTRAP_ADMIN_LOGIN = 'admin'

/** Papéis que o Master pode atribuir a funcionários */
export const ASSIGNABLE_ROLES: MembershipRole[] = ['ADMIN', 'MANAGER', 'MEMBER']

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

/**
 * Decide (aprovar/rejeitar/pedir alteração) uma aprovação específica.
 * Master decide qualquer uma. Gerente decide só a etapa "Interna" — a
 * aprovação do cliente (comunicação externa, compromisso com quem paga)
 * continua exclusiva do Master. Ver reorganização de hierarquia:
 * Operação (Funcionário) → Gerência (Gerente, decide o interno) →
 * Administrativa (Master, decide tudo, inclusive o que vai pro cliente).
 */
export function canDecideApproval(
  role: MembershipRole | undefined,
  approvalType: 'INTERNAL' | 'CLIENT',
): boolean {
  if (isMaster(role)) return true
  if (isManager(role)) return approvalType === 'INTERNAL'
  return false
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
  { to: '/mensagens', label: 'WhatsApp', short: 'Zap' },
  { to: '/tarefas', label: 'Tarefas', short: 'Tasks' },
  { to: '/crm', label: 'CRM', short: 'CRM' },
  { to: '/prospeccao', label: 'Prospecção', short: 'Prosp' },
  { to: '/financeiro', label: 'Financeiro', short: 'Fin' },
  { to: '/equipe', label: 'Equipe', short: 'Team' },
  { to: '/departamentos', label: 'Departamentos', short: 'Depts' },
  { to: '/aprovacoes', label: 'Aprovações', short: 'Aprov' },
  { to: '/alertas', label: 'Alertas', short: 'Alert' },
  { to: '/relatorios', label: 'Relatórios', short: 'Rel' },
  { to: '/ia', label: 'IA', short: 'IA' },
  { to: '/configuracoes', label: 'Configurações', short: 'Config' },
]

/** Rotas liberadas para funcionário (operacional) */
const EMPLOYEE_PATHS = new Set([
  '/',
  '/projetos',
  '/tarefas',
  '/mensagens',
  '/whatsapp',
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
    // Página de UM cliente (Briefing/Gravações — nunca Contrato, escondido
    // à parte em ClientBriefingPage via canViewFinance) é liberada, mas só
    // o detalhe: '/crm' sozinho (a lista/gestão de clientes) continua
    // bloqueado — o Funcionário só chega lá clicando na própria demanda.
    if (/^\/crm\/.+/.test(path)) return true
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
