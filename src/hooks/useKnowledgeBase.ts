import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { KnowledgeAudience, KnowledgeBaseEntry, KnowledgeCategory } from '@/types/database'

/**
 * Base de conhecimento do workspace — não é por cliente (ver useClientMemory
 * pra isso). É a "segunda memória" que o Hermes e o agente de WhatsApp
 * consultam antes de responder perguntas sobre política, preço, procedimento
 * etc. (ver search_knowledge no agent-whatsapp e o bloco de conhecimento
 * injetado na resposta pro cliente).
 */
export function useKnowledgeBase() {
  const { workspace, user } = useAuth()
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    if (!workspace?.id) {
      setEntries([])
      return
    }

    setLoading(true)
    const { data, error: err } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('category')
      .order('importance', { ascending: false })

    if (err) setError(err.message)
    else {
      setEntries((data ?? []) as KnowledgeBaseEntry[])
      setError(null)
    }
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const addEntry = async (payload: {
    title: string
    content: string
    category: KnowledgeCategory
    audience: KnowledgeAudience
    importance?: number
    tags?: string[]
  }) => {
    if (!workspace?.id) return { error: 'Workspace não encontrado' }

    const { error: err } = await supabase.from('knowledge_base').insert({
      workspace_id: workspace.id,
      title: payload.title,
      content: payload.content,
      category: payload.category,
      audience: payload.audience,
      importance: payload.importance ?? 5,
      tags: payload.tags ?? [],
      active: true,
      created_by: user?.id ?? null,
    })

    if (!err) await fetchEntries()
    return { error: err?.message ?? null }
  }

  const updateEntry = async (
    id: string,
    payload: Partial<{
      title: string
      content: string
      category: KnowledgeCategory
      audience: KnowledgeAudience
      importance: number
      tags: string[]
      active: boolean
    }>,
  ) => {
    const { error: err } = await supabase
      .from('knowledge_base')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!err) await fetchEntries()
    return { error: err?.message ?? null }
  }

  const deleteEntry = async (id: string) => {
    const { error: err } = await supabase.from('knowledge_base').delete().eq('id', id)
    if (!err) await fetchEntries()
    return { error: err?.message ?? null }
  }

  return { entries, loading, error, addEntry, updateEntry, deleteEntry, refresh: fetchEntries }
}
