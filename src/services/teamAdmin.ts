import { supabase } from '@/lib/supabase'
import type { AccessStatus, JobRole, MembershipRole } from '@/types/database'

export interface AccessUser {
  id: string
  name: string
  email: string
  avatar_url: string | null
  access_status: AccessStatus
  auth_provider: string | null
  created_at: string
  role: MembershipRole | null
  job_role: JobRole | null
  is_self: boolean
}

const FUNCTIONS_URL = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-team`

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão inválida')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function createTeamMember(input: {
  name: string
  email: string
  password: string
  role: Extract<MembershipRole, 'MANAGER' | 'MEMBER'>
  job_role?: JobRole | null
}): Promise<{ error: string | null }> {
  try {
    const headers = await authHeader()
    const res = await fetch(FUNCTIONS_URL(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'create_member', ...input }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error ?? `HTTP ${res.status}` }
    return { error: null }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function deleteTeamMember(userId: string): Promise<{ error: string | null }> {
  try {
    const headers = await authHeader()
    const res = await fetch(FUNCTIONS_URL(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'delete_member', user_id: userId }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error ?? `HTTP ${res.status}` }
    return { error: null }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function updateTeamMemberRole(input: {
  user_id: string
  role: Extract<MembershipRole, 'MANAGER' | 'MEMBER'>
  job_role?: JobRole | null
}): Promise<{ error: string | null }> {
  try {
    const headers = await authHeader()
    const res = await fetch(FUNCTIONS_URL(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'update_member_role', ...input }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error ?? `HTTP ${res.status}` }
    return { error: null }
  } catch (err) {
    return { error: String(err) }
  }
}

export async function inviteTeamMember(input: {
  name: string
  email: string
  role: Extract<MembershipRole, 'MANAGER' | 'MEMBER'>
  job_role?: JobRole | null
}): Promise<{ error: string | null }> {
  try {
    const headers = await authHeader()
    const res = await fetch(FUNCTIONS_URL(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'invite_member', ...input }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error ?? `HTTP ${res.status}` }
    return { error: null }
  } catch (err) {
    return { error: String(err) }
  }
}

/** Lista todo mundo que já apareceu no Auth (pendente, ativo ou bloqueado). */
export async function listAccess(): Promise<{ users: AccessUser[]; error: string | null }> {
  try {
    const headers = await authHeader()
    const res = await fetch(FUNCTIONS_URL(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'list_access' }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { users: [], error: body.error ?? `HTTP ${res.status}` }
    return { users: (body.users ?? []) as AccessUser[], error: null }
  } catch (err) {
    return { users: [], error: String(err) }
  }
}

/** Autoriza (ou reativa) o login de alguém, já atribuindo o papel dele. */
export async function approveAccess(input: {
  user_id: string
  role: Extract<MembershipRole, 'MANAGER' | 'MEMBER'>
  job_role?: JobRole | null
}): Promise<{ error: string | null }> {
  try {
    const headers = await authHeader()
    const res = await fetch(FUNCTIONS_URL(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'approve_access', ...input }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error ?? `HTTP ${res.status}` }
    return { error: null }
  } catch (err) {
    return { error: String(err) }
  }
}

/** Bloqueia o login: remove o vínculo com o workspace e marca a conta como bloqueada. */
export async function blockAccess(user_id: string): Promise<{ error: string | null }> {
  try {
    const headers = await authHeader()
    const res = await fetch(FUNCTIONS_URL(), {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'block_access', user_id }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { error: body.error ?? `HTTP ${res.status}` }
    return { error: null }
  } catch (err) {
    return { error: String(err) }
  }
}
