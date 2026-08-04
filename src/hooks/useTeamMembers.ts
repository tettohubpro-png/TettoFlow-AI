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

export function useTeamMembers() {
  const { workspace } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    if (!workspace?.id) {
      setMembers([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data: memberships } = await supabase
      .from('memberships')
      .select('id, user_id, role, job_role')
      .eq('workspace_id', workspace.id)
      .neq('role', 'CLIENT')

    if (!memberships?.length) {
      setMembers([])
      setLoading(false)
      return
    }

    const userIds = memberships.map((m) => m.user_id)
    const { data: users } = await supabase.from('users').select('*').in('id', userIds)

    const byId = Object.fromEntries((users ?? []).map((u) => [u.id, u as AppUser]))
    setMembers(
      memberships
        .filter((m) => byId[m.user_id])
        .map((m) => ({
          membership_id: m.id,
          user_id: m.user_id,
          role: m.role,
          job_role: m.job_role ?? null,
          user: byId[m.user_id],
        })),
    )
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  return { members, loading, refresh: fetchMembers }
}
