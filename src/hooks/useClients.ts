import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Client, ClientContact, ClientStatus } from '@/types/database'

export function useClients() {
  const { workspace } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    if (!workspace?.id) {
      setClients([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error: err } = await supabase
      .from('clients')
      .select('*')
      .eq('workspace_id', workspace.id)
      .is('archived_at', null)
      .order('name')

    if (err) setError(err.message)
    else {
      setClients((data ?? []) as Client[])
      setError(null)
    }
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const createClient = async (payload: { name: string; status?: ClientStatus }) => {
    if (!workspace?.id) return { data: null, error: 'Workspace não carregado' }

    const { data, error: err } = await supabase
      .from('clients')
      .insert({
        name: payload.name,
        status: payload.status ?? 'ACTIVE',
        workspace_id: workspace.id,
      })
      .select()
      .single()

    if (!err) await fetchClients()
    return { data, error: err?.message ?? null }
  }

  const updateClient = async (id: string, payload: Partial<Client>) => {
    const { error: err } = await supabase.from('clients').update(payload).eq('id', id)
    if (!err) await fetchClients()
    return { error: err?.message ?? null }
  }

  return { clients, loading, error, fetchClients, createClient, updateClient }
}

export function useClientContacts(clientId: string | undefined) {
  const [contacts, setContacts] = useState<ClientContact[]>([])

  useEffect(() => {
    if (!clientId) return
    supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .then(({ data }) => setContacts((data ?? []) as ClientContact[]))
  }, [clientId])

  return { contacts }
}
