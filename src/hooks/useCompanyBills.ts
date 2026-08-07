import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CompanyBill, CompanyBillKind } from '@/types/database'

export function useCompanyBills(kind?: CompanyBillKind) {
  const { workspace, user } = useAuth()
  const [bills, setBills] = useState<CompanyBill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBills = useCallback(async () => {
    if (!workspace?.id) {
      setBills([])
      setLoading(false)
      return
    }
    setLoading(true)
    let query = supabase
      .from('company_bills')
      .select('*, users:employee_user_id(name, email)')
      .eq('workspace_id', workspace.id)
      .order('due_day', { ascending: true })
      .order('name', { ascending: true })

    if (kind) query = query.eq('kind', kind)

    const { data, error: err } = await query
    if (err) setError(err.message)
    else {
      setBills((data ?? []) as CompanyBill[])
      setError(null)
    }
    setLoading(false)
  }, [workspace?.id, kind])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  const createBill = async (payload: {
    name: string
    amount: number
    due_day: number
    kind: CompanyBillKind
    category?: string
    notes?: string
    employee_user_id?: string | null
  }) => {
    if (!workspace?.id) return { error: 'Workspace não carregado' }
    const { error: err } = await supabase.from('company_bills').insert({
      workspace_id: workspace.id,
      name: payload.name.trim(),
      amount: payload.amount,
      due_day: payload.due_day,
      kind: payload.kind,
      category: payload.category ?? (payload.kind === 'employee' ? 'payroll' : 'subscription'),
      notes: payload.notes?.trim() || null,
      employee_user_id: payload.employee_user_id ?? null,
      active: true,
      created_by: user?.id ?? null,
    })
    if (!err) await fetchBills()
    return { error: err?.message ?? null }
  }

  const updateBill = async (
    id: string,
    patch: Partial<
      Pick<CompanyBill, 'name' | 'amount' | 'due_day' | 'notes' | 'active' | 'category' | 'employee_user_id'>
    >,
  ) => {
    const { error: err } = await supabase
      .from('company_bills')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!err) await fetchBills()
    return { error: err?.message ?? null }
  }

  const deleteBill = async (id: string) => {
    const { error: err } = await supabase.from('company_bills').delete().eq('id', id)
    if (!err) await fetchBills()
    return { error: err?.message ?? null }
  }

  return { bills, loading, error, refresh: fetchBills, createBill, updateBill, deleteBill }
}

/** Próxima data de vencimento a partir do due_day (1–28). */
export function nextDueDateForDay(dueDay: number, from = new Date()): string {
  const day = Math.min(Math.max(dueDay, 1), 28)
  const y = from.getFullYear()
  const m = from.getMonth()
  let candidate = new Date(y, m, day)
  const today = new Date(y, m, from.getDate())
  if (candidate < today) {
    candidate = new Date(y, m + 1, day)
  }
  const yyyy = candidate.getFullYear()
  const mm = String(candidate.getMonth() + 1).padStart(2, '0')
  const dd = String(candidate.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function daysUntil(dateIso: string, from = new Date()): number {
  const target = new Date(dateIso + 'T12:00:00')
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.round((target.getTime() - start.getTime()) / 86400000)
}
