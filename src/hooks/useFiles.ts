import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ClientFile } from '@/types/database'

export function useFiles(clientId?: string) {
  const { workspace } = useAuth()
  const [files, setFiles] = useState<ClientFile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFiles = useCallback(async () => {
    if (!workspace?.id) {
      setFiles([])
      setLoading(false)
      return
    }

    setLoading(true)
    let query = supabase
      .from('files')
      .select('*, clients(name)')
      .eq('workspace_id', workspace.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data } = await query
    setFiles((data ?? []) as ClientFile[])
    setLoading(false)
  }, [workspace?.id, clientId])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  return { files, loading, refresh: fetchFiles }
}
