import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Approval, ApprovalStatus, ApprovalType } from '@/types/database'

export function useApprovals() {
  const { workspace, user } = useAuth()
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApprovals = useCallback(async () => {
    if (!workspace?.id) {
      setApprovals([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error: err } = await supabase
      .from('approvals')
      .select('*, operations(title, status, clients(name))')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })

    if (err) setError(err.message)
    else {
      setApprovals((data ?? []) as Approval[])
      setError(null)
    }
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchApprovals()
  }, [fetchApprovals])

  const requestApproval = async (
    operationId: string,
    type: ApprovalType = 'INTERNAL',
  ) => {
    if (!workspace?.id || !user?.id) {
      return { error: 'Sessão inválida' }
    }

    const { data: approval, error: apprErr } = await supabase
      .from('approvals')
      .insert({
        workspace_id: workspace.id,
        operation_id: operationId,
        type,
        status: 'PENDING',
        requested_by: user.id,
      })
      .select('id')
      .single()

    if (apprErr || !approval) {
      return { error: apprErr?.message ?? 'Falha ao solicitar aprovação' }
    }

    await supabase.from('approval_rounds').insert({
      workspace_id: workspace.id,
      approval_id: approval.id,
      round_number: 1,
    })

    await supabase
      .from('operations')
      .update({ status: 'REVIEW' })
      .eq('id', operationId)

    await fetchApprovals()
    return { error: null }
  }

  const decide = async (
    approvalId: string,
    operationId: string,
    status: ApprovalStatus,
    note?: string,
  ) => {
    if (!user?.id) return { error: 'Sessão inválida' }

    const { error: apprErr } = await supabase
      .from('approvals')
      .update({
        status,
        decided_by: user.id,
        decision_note: note ?? null,
      })
      .eq('id', approvalId)

    if (apprErr) return { error: apprErr.message }

    let operationStatus: string | null = null
    if (status === 'APPROVED') operationStatus = 'APPROVED'
    if (status === 'REJECTED' || status === 'CHANGES_REQUESTED') {
      operationStatus = 'PRODUCTION'
    }

    if (operationStatus) {
      await supabase
        .from('operations')
        .update({ status: operationStatus })
        .eq('id', operationId)
    }

    await fetchApprovals()
    return { error: null }
  }

  const pending = approvals.filter((a) => a.status === 'PENDING')

  return {
    approvals,
    pending,
    loading,
    error,
    requestApproval,
    decide,
    refresh: fetchApprovals,
  }
}
