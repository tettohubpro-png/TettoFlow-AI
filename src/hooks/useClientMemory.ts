import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ClientAiMemory, MemoryCategory } from '@/types/database'

export function useClientMemory(clientId: string | undefined) {
  const { workspace, user } = useAuth()
  const [memories, setMemories] = useState<ClientAiMemory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMemories = useCallback(async () => {
    if (!clientId || !workspace?.id) {
      setMemories([])
      return
    }

    setLoading(true)
    const { data, error: err } = await supabase
      .from('client_ai_memory')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('client_id', clientId)
      .eq('active', true)
      .order('importance', { ascending: false })

    if (err) setError(err.message)
    else {
      setMemories((data ?? []) as ClientAiMemory[])
      setError(null)
    }
    setLoading(false)
  }, [clientId, workspace?.id])

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  const addMemory = async (payload: {
    title: string
    content: string
    category?: MemoryCategory
    importance?: number
  }) => {
    if (!clientId || !workspace?.id) return { error: 'Cliente não selecionado' }

    const { error: err } = await supabase.from('client_ai_memory').insert({
      workspace_id: workspace.id,
      client_id: clientId,
      title: payload.title,
      content: payload.content,
      category: payload.category ?? 'BRIEFING',
      importance: payload.importance ?? 5,
      active: true,
      created_by: user?.id ?? null,
    })

    if (!err) await fetchMemories()
    return { error: err?.message ?? null }
  }

  const logInteraction = async (userMessage: string, assistantReply: string) => {
    if (!clientId || !workspace?.id) return

    await supabase.from('client_ai_memory').insert({
      workspace_id: workspace.id,
      client_id: clientId,
      category: 'HISTORY',
      title: `Chat ${new Date().toLocaleString('pt-BR')}`,
      content: `Usuário: ${userMessage}\nAssistente: ${assistantReply}`,
      importance: 3,
      active: true,
      created_by: user?.id ?? null,
    })
  }

  return { memories, loading, error, addMemory, logInteraction, refresh: fetchMemories }
}
