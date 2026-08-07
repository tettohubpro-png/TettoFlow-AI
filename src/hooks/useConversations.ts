import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Conversation, ConversationMessage } from '@/types/database'

/** Lista de conversas do workspace (Inbox), mais recentes primeiro. */
export function useConversations() {
  const { workspace } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    if (!workspace?.id) {
      setConversations([])
      setPreviews({})
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error: err } = await supabase
      .from('conversations')
      .select('*, clients(name, status)')
      .eq('workspace_id', workspace.id)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const list = (data ?? []) as Conversation[]
    setConversations(list)
    setError(null)

    const ids = list.map((c) => c.id)
    if (ids.length > 0) {
      const { data: recentMessages } = await supabase
        .from('conversation_messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false })

      const previewMap: Record<string, string> = {}
      for (const m of recentMessages ?? []) {
        if (!previewMap[m.conversation_id]) previewMap[m.conversation_id] = m.content
      }
      setPreviews(previewMap)
    } else {
      setPreviews({})
    }

    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  return { conversations, previews, loading, error, refresh: fetchConversations }
}

/** Thread de mensagens de uma conversa específica, em ordem cronológica. */
export function useConversationMessages(conversationId: string | undefined) {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([])
      return
    }

    setLoading(true)
    const { data, error: err } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (err) setError(err.message)
    else {
      setMessages((data ?? []) as ConversationMessage[])
      setError(null)
    }
    setLoading(false)
  }, [conversationId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  return { messages, loading, error, refresh: fetchMessages }
}
