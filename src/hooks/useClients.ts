import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Client, Contact } from '@/types/database'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('clients')
      .select('*')
      .order('name')

    if (err) setError(err.message)
    else {
      setClients((data ?? []) as Client[])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const createClient = async (payload: Partial<Client>) => {
    const { data, error: err } = await supabase
      .from('clients')
      .insert(payload)
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
  const [contacts, setContacts] = useState<Contact[]>([])

  useEffect(() => {
    if (!clientId) return
    supabase
      .from('contacts')
      .select('*')
      .eq('client_id', clientId)
      .then(({ data }) => setContacts((data ?? []) as Contact[]))
  }, [clientId])

  return { contacts }
}
