import { supabase } from '@/lib/supabase'
import type { JobRole, MembershipRole } from '@/types/database'

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
