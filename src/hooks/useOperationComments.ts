import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface OperationComment {
  id: string
  operation_id: string
  author_id: string | null
  content: string
  created_at: string
  users?: { name: string } | null
}

/** Sugestões/comentários numa operação — feedback rápido sem precisar mudar
 * status ou abrir uma aprovação formal. */
export function useOperationComments(operationId: string | null | undefined) {
  const { workspace, user } = useAuth()
  const [comments, setComments] = useState<OperationComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    if (!operationId) {
      setComments([])
      return
    }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('operation_comments')
      .select('*, users(name)')
      .eq('operation_id', operationId)
      .order('created_at', { ascending: true })

    if (err) setError(err.message)
    else {
      setComments((data ?? []) as OperationComment[])
      setError(null)
    }
    setLoading(false)
  }, [operationId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const addComment = async (content: string) => {
    if (!operationId || !workspace?.id || !content.trim()) return { error: 'Comentário vazio' }

    const { error: err } = await supabase.from('operation_comments').insert({
      workspace_id: workspace.id,
      operation_id: operationId,
      author_id: user?.id ?? null,
      content: content.trim(),
    })

    if (!err) await fetchComments()
    return { error: err?.message ?? null }
  }

  return { comments, loading, error, addComment, refresh: fetchComments }
}
