import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { runClientOnboarding } from '@/services/onboardingClient'
import type { AutomationRun, OnboardingResult } from '@/types/database'
import { ONBOARDING_EVENT_KEY } from '@/types/database'

export function useOnboarding() {
  const { workspace, user, role } = useAuth()
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<OnboardingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchRuns = useCallback(async () => {
    if (!workspace?.id) return

    setLoading(true)
    const { data: automation } = await supabase
      .from('automations')
      .select('id')
      .eq('workspace_id', workspace.id)
      .eq('event_key', ONBOARDING_EVENT_KEY)
      .maybeSingle()

    if (!automation) {
      setRuns([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('automation_runs')
      .select('*')
      .eq('automation_id', automation.id)
      .order('created_at', { ascending: false })
      .limit(10)

    setRuns((data ?? []) as AutomationRun[])
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  const runOnboarding = useCallback(
    async (clientId: string) => {
      if (!user?.id || !role) {
        return { error: 'Sessão inválida' }
      }

      setRunning(true)
      setError(null)
      setLastResult(null)

      const { data, error: runErr } = await runClientOnboarding(clientId, user.id, role)

      setRunning(false)

      if (runErr) {
        setError(runErr)
        return { error: runErr }
      }

      if (data) setLastResult(data)
      await fetchRuns()
      return { data, error: null }
    },
    [user?.id, role, fetchRuns],
  )

  return { runs, loading, running, lastResult, error, runOnboarding, refreshRuns: fetchRuns }
}
