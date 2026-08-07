import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { AppUser } from '@/types/database'

export interface TeamMember {
  membership_id: string
  user_id: string
  role: string
  job_role: string | null
  user: AppUser
}

function placeholderUser(userId: string): AppUser {
  return {
    id: userId,
    name: 'Usuário (perfil incompleto)',
    email: '',
    avatar_url: null,
    must_change_password: false,
    created_at: '',
    updated_at: '',
  }
}

export function useTeamMembers() {
  const { workspace } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    if (!workspace?.id) {
      setMembers([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Prefer join — PostgREST embeds users when RLS allows
    const { data: joined, error: joinErr } = await supabase
      .from('memberships')
      .select('id, user_id, role, job_role, users(*)')
      .eq('workspace_id', workspace.id)
      .neq('role', 'CLIENT')
      .order('created_at', { ascending: true })

    if (!joinErr && joined) {
      setMembers(
        joined.map((m) => {
          const row = m as {
            id: string
            user_id: string
            role: string
            job_role: string | null
            users: AppUser | AppUser[] | null
          }
          const userRow = Array.isArray(row.users) ? row.users[0] : row.users
          return {
            membership_id: row.id,
            user_id: row.user_id,
            role: row.role,
            job_role: row.job_role ?? null,
            user: userRow ?? placeholderUser(row.user_id),
          }
        }),
      )
      setLoading(false)
      return
    }

    const { data: memberships, error: memErr } = await supabase
      .from('memberships')
      .select('id, user_id, role, job_role')
      .eq('workspace_id', workspace.id)
      .neq('role', 'CLIENT')

    if (memErr) {
      setError(memErr.message)
      setMembers([])
      setLoading(false)
      return
    }

    if (!memberships?.length) {
      setMembers([])
      setLoading(false)
      return
    }

    const userIds = memberships.map((m) => m.user_id)
    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds)

    if (usersErr) setError(usersErr.message)

    const byId = Object.fromEntries((users ?? []).map((u) => [u.id, u as AppUser]))
    setMembers(
      memberships.map((m) => ({
        membership_id: m.id,
        user_id: m.user_id,
        role: m.role,
        job_role: m.job_role ?? null,
        user: byId[m.user_id] ?? placeholderUser(m.user_id),
      })),
    )
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  return { members, loading, error, refresh: fetchMembers }
}
