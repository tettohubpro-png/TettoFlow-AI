export type UserRole = 'owner' | 'team' | 'client'
export type ClientSegment = 'legal' | 'health_aesthetics' | 'electoral' | 'general'
export type ClientStatus = 'active' | 'paused' | 'churned' | 'prospect'
export type ProjectStatus =
  | 'briefing'
  | 'production'
  | 'approval'
  | 'correction'
  | 'delivery'
  | 'completed'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  client_id: string | null
  function_tags: string[]
  max_sensitivity: string
}

export interface Client {
  id: string
  name: string
  segment: ClientSegment
  plan: string | null
  monthly_fee: number
  status: ClientStatus
  whatsapp_instance: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  client_id: string
  name: string
  email: string | null
  phone: string | null
  role_label: string | null
  is_primary: boolean
}

export interface Project {
  id: string
  client_id: string
  title: string
  description: string | null
  status: ProjectStatus
  due_date: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
  clients?: { name: string }
}

export interface DashboardStats {
  activeClients: number
  pendingTasks: number
  pendingApprovals: number
  todayAgenda: number
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
      }
      clients: {
        Row: Client
        Insert: Partial<Client> & { name: string }
        Update: Partial<Client>
      }
      contacts: {
        Row: Contact
        Insert: Partial<Contact> & { client_id: string; name: string }
        Update: Partial<Contact>
      }
      projects: {
        Row: Project
        Insert: Partial<Project> & { client_id: string; title: string }
        Update: Partial<Project>
      }
      project_status_log: {
        Row: Record<string, unknown>
        Insert: {
          project_id: string
          from_status?: ProjectStatus
          to_status: ProjectStatus
          note?: string
        }
        Update: Record<string, unknown>
      }
    }
  }
}
