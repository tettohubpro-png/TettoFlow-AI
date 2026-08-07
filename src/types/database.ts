// Tipos alinhados ao schema Supabase remoto (workspace-centric)

export type MembershipRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'CLIENT'
export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
export type OperationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ANALYSIS'
  | 'PRODUCTION'
  | 'REVIEW'
  | 'CLIENT'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'DONE'
export type OperationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
/** Segmento regulatório para compliance de IA (WhatsApp) */
export type ClientSegment = 'legal' | 'health_aesthetics' | 'electoral' | 'general'

export interface AppUser {
  id: string
  name: string
  email: string
  avatar_url: string | null
  must_change_password?: boolean
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Membership {
  id: string
  workspace_id: string
  user_id: string
  role: MembershipRole
  job_role: JobRole | null
  created_at: string
  updated_at: string
}

/** Especialidade operacional do membro (hierarquia de função) */
export type JobRole =
  | 'gerente'
  | 'gestor'
  | 'social_media'
  | 'design'
  | 'videomaker'
  | 'photographer'
  | 'video_editor'
  | 'traffic'

export interface ClientSocialLinks {
  instagram?: string
  tiktok?: string
  youtube?: string
  facebook?: string
  linkedin?: string
}

export interface Client {
  id: string
  workspace_id: string
  name: string
  status: ClientStatus
  segment: string | null
  cpf_cnpj: string | null
  city: string | null
  state: string | null
  origin: string | null
  notes: string | null
  social_links: ClientSocialLinks
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type ContractStatus = 'active' | 'paused' | 'ended'
export type ContractPeriodicity = 'weekly' | 'monthly' | 'yearly'

export interface ClientContract {
  id: string
  workspace_id: string
  client_id: string
  title: string
  status: ContractStatus
  start_date: string | null
  file_url: string | null
  service_description: string | null
  monthly_value: number | null
  repetitions: number | null
  periodicity: ContractPeriodicity
  payment_method: string | null
  first_billing_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type FinancialEntryType = 'income' | 'expense'
export type FinancialEntryStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'

export interface FinancialEntry {
  id: string
  workspace_id: string
  client_id: string | null
  contract_id: string | null
  type: FinancialEntryType
  category: string
  description: string
  amount: number
  due_date: string
  status: FinancialEntryStatus
  paid_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  clients?: { name: string }
}

export type CompanyBillKind = 'company' | 'employee'

export interface CompanyBill {
  id: string
  workspace_id: string
  name: string
  amount: number
  due_day: number
  kind: CompanyBillKind
  category: string
  notes: string | null
  active: boolean
  employee_user_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  users?: { name: string; email: string } | null
}

export interface ClientContact {
  id: string
  workspace_id: string
  client_id: string
  name: string
  email: string | null
  phone: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface Operation {
  id: string
  workspace_id: string
  client_id: string
  template_id: string
  title: string
  description: string | null
  status: OperationStatus
  priority: OperationPriority
  start_date: string | null
  deadline: string | null
  responsible_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  metadata: Record<string, unknown> | null
  clients?: { name: string }
}

export interface DashboardStats {
  activeClients: number
  pendingOperations: number
  pendingApprovals: number
  todayAgenda: number
  newLeadsWeek: number
  messagesWeek: number
  contentThisMonth: number
  tasksPending: number
  revenueMonth: number
}

/** @deprecated Use AppUser + Membership */
export type UserRole = MembershipRole

/** @deprecated Use AppUser */
export interface Profile {
  id: string
  full_name: string
  role: MembershipRole
}

export const DEFAULT_TEMPLATE_ID = '2e8a4766-ac69-438f-b916-ecfc79637d02'

export const ONBOARDING_EVENT_KEY = 'client.onboarded'
export const ONBOARDING_MARKER_TITLE = '__tettoflow_onboarding__'

export type AutomationRunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'REVERTED'
export type MemoryCategory =
  | 'PREFERENCES'
  | 'HISTORY'
  | 'BRIEFING'
  | 'CONSTRAINTS'
  | 'INSIGHTS'
  | 'BRAND'

export interface Automation {
  id: string
  workspace_id: string
  name: string
  event_key: string
  active: boolean
  config_json: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface AutomationRun {
  id: string
  workspace_id: string
  automation_id: string
  status: AutomationRunStatus
  error: string | null
  created_at: string
  finished_at: string | null
}

export interface OnboardingResult {
  alreadyDone: boolean
  runId: string | null
  operationsCreated: number
  clientId: string
  clientName: string
}

export type Department =
  | 'social_media'
  | 'design'
  | 'videomaker'
  | 'video_editor'
  | 'photographer'
  | 'traffic'
  | 'general'

export interface ClientAssignment {
  id: string
  workspace_id: string
  client_id: string
  user_id: string
  department: Exclude<Department, 'general'>
  created_at: string
  updated_at: string
  users?: { id: string; name: string; email: string }
  clients?: { name: string }
}

export type AlertChannel = 'whatsapp' | 'gmail'
export type AlertType = 'monthly_report' | 'schedule' | 'themes'
export type AlertStatus = 'draft' | 'queued' | 'sent' | 'failed'

export interface ClientAlert {
  id: string
  workspace_id: string
  client_id: string
  channel: AlertChannel
  alert_type: AlertType
  subject: string | null
  body: string
  status: AlertStatus
  created_by: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
  clients?: { name: string }
}

export interface WorkDeliverables {
  posts?: number
  themes?: string[]
  companies?: string[]
  drive_files?: string[]
  video_themes?: string[]
  notes?: string
}

export interface WorkSession {
  id: string
  workspace_id: string
  user_id: string
  operation_id: string | null
  client_id: string | null
  department: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  summary: string | null
  deliverables: WorkDeliverables
  created_at: string
  updated_at: string
  users?: { name: string; email: string }
  clients?: { name: string }
  operations?: { title: string }
}

export interface ProjectActivity {
  id: string
  workspace_id: string
  actor_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  detail: Record<string, unknown>
  created_at: string
}

export type ApprovalType = 'INTERNAL' | 'CLIENT'
export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'CANCELLED'

export interface Approval {
  id: string
  workspace_id: string
  operation_id: string
  type: ApprovalType
  status: ApprovalStatus
  requested_by: string | null
  decided_by: string | null
  decision_note: string | null
  created_at: string
  updated_at: string
  operations?: {
    title: string
    status: OperationStatus
    clients?: { name: string }
  }
}

export interface ApprovalRound {
  id: string
  workspace_id: string
  approval_id: string
  round_number: number
  created_at: string
}

export interface ClientFile {
  id: string
  workspace_id: string
  client_id: string
  operation_id: string | null
  name: string
  storage_path: string
  mime_type: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  clients?: { name: string }
}

export interface ClientAiMemory {
  id: string
  workspace_id: string
  client_id: string
  category: MemoryCategory
  title: string
  content: string
  importance: number
  active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
  handoff?: boolean
  contextSnippets?: string[]
}

export interface ClientBrand {
  id: string
  workspace_id: string
  client_id: string
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  fonts: string | null
  tone_of_voice: string | null
  guidelines: string | null
  created_at: string
  updated_at: string
}

export interface ClientProduct {
  id: string
  workspace_id: string
  client_id: string
  name: string
  description: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type ConversationChannel = 'whatsapp'
export type ConversationStatus = 'open' | 'closed'
export type MessageDirection = 'inbound' | 'outbound'

export interface Conversation {
  id: string
  workspace_id: string
  client_id: string
  channel: ConversationChannel
  contact_phone: string | null
  contact_name: string | null
  status: ConversationStatus
  handoff_required: boolean
  last_message_at: string | null
  created_at: string
  updated_at: string
  clients?: { name: string; status: ClientStatus }
}

export interface ConversationMessage {
  id: string
  workspace_id: string
  conversation_id: string
  client_id: string
  direction: MessageDirection
  content: string
  is_ai: boolean
  created_at: string
}

export interface BriefingFormData {
  logo_url: string
  primary_color: string
  secondary_color: string
  fonts: string
  tone_of_voice: string
  guidelines: string
  history: string
  objectives: string
  persona: string
  constraints: string
  productsText: string
}

export const BRIEFING_MEMORY_TITLES = {
  history: 'Briefing — História',
  objectives: 'Briefing — Objetivos',
  persona: 'Briefing — Persona',
  constraints: 'Briefing — Restrições',
} as const
