import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ClientFile, Operation, OperationStatus } from '@/types/database'
import { DEFAULT_TEMPLATE_ID } from '@/types/database'
import {
  buildMetadataJson,
  parseMetadataJson,
  type OperationExtendedMeta,
  type OperationFormData,
} from '@/utils/operationExtras'
import { logProjectActivity } from '@/utils/activityLog'

export interface OperationCardMeta {
  operation_id: string
  meta: OperationExtendedMeta
  hasDescription: boolean
}

export interface OperationDetails extends Operation {
  description: string
  meta: OperationExtendedMeta
  files: ClientFile[]
}

export function useOperations(clientId?: string) {
  const { workspace, user } = useAuth()
  const [operations, setOperations] = useState<Operation[]>([])
  const [cardMeta, setCardMeta] = useState<Record<string, OperationCardMeta>>({})
  const [loading, setLoading] = useState(true)

  const fetchOperations = useCallback(async () => {
    if (!workspace?.id) {
      setOperations([])
      setLoading(false)
      return
    }

    setLoading(true)
    let query = supabase
      .from('operations')
      .select('*, clients(name)')
      .eq('workspace_id', workspace.id)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data } = await query
    const ops = (data ?? []) as Operation[]
    setOperations(ops)

    const metaMap: Record<string, OperationCardMeta> = {}
    for (const op of ops) {
      metaMap[op.id] = {
        operation_id: op.id,
        meta: parseMetadataJson(op.metadata),
        hasDescription: Boolean(op.description?.trim()),
      }
    }
    setCardMeta(metaMap)
    setLoading(false)
  }, [workspace?.id, clientId])

  useEffect(() => {
    fetchOperations()
  }, [fetchOperations])

  const loadOperationDetails = async (operationId: string): Promise<OperationDetails | null> => {
    const op = operations.find((o) => o.id === operationId)
    if (!op) return null

    const { data: fileRows } = await supabase
      .from('files')
      .select('*')
      .eq('operation_id', operationId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    return {
      ...op,
      description: op.description ?? '',
      meta: parseMetadataJson(op.metadata),
      files: (fileRows ?? []) as ClientFile[],
    }
  }

  const createOperation = async (form: OperationFormData) => {
    if (!workspace?.id) return { data: null, error: 'Workspace não carregado' }

    const { data, error } = await supabase
      .from('operations')
      .insert({
        workspace_id: workspace.id,
        client_id: form.client_id,
        template_id: DEFAULT_TEMPLATE_ID,
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: 'DRAFT' as OperationStatus,
        priority: 'MEDIUM',
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        metadata: buildMetadataJson(form),
        created_by: user?.id ?? null,
      })
      .select()
      .single()

    if (error || !data) return { data: null, error: error?.message ?? 'Erro ao criar' }

    await fetchOperations()
    return { data, error: null }
  }

  const updateOperation = async (operationId: string, form: OperationFormData) => {
    const { error } = await supabase
      .from('operations')
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        metadata: buildMetadataJson(form),
      })
      .eq('id', operationId)

    if (error) return { error: error.message }

    await fetchOperations()
    return { error: null }
  }

  const attachFiles = async (
    operationId: string,
    clientId: string,
    files: File[],
  ): Promise<{ error: string | null }> => {
    if (!workspace?.id || !user?.id) return { error: 'Sessão inválida' }

    for (const file of files) {
      const storagePath = `operations/${operationId}/${file.name}`
      const { error } = await supabase.from('files').insert({
        workspace_id: workspace.id,
        client_id: clientId,
        operation_id: operationId,
        name: file.name,
        storage_path: storagePath,
        mime_type: file.type || null,
        created_by: user.id,
      })
      if (error) return { error: error.message }
    }

    return { error: null }
  }

  const updateStatus = async (operationId: string, toStatus: OperationStatus) => {
    const { error } = await supabase
      .from('operations')
      .update({ status: toStatus })
      .eq('id', operationId)

    if (!error) {
      if (workspace?.id) {
        await logProjectActivity(workspace.id, user?.id ?? null, 'operation', operationId, 'status', {
          toStatus,
        })
      }
      await fetchOperations()
    }
    return { error: error?.message ?? null }
  }

  const assignResponsible = async (operationId: string, responsibleId: string | null) => {
    const { error } = await supabase
      .from('operations')
      .update({ responsible_id: responsibleId })
      .eq('id', operationId)

    if (!error) {
      if (workspace?.id) {
        await logProjectActivity(
          workspace.id,
          user?.id ?? null,
          'operation',
          operationId,
          'assign_responsible',
          { responsible_id: responsibleId },
        )
      }
      await fetchOperations()
    }
    return { error: error?.message ?? null }
  }

  const archiveOperation = async (operationId: string) => {
    const { error } = await supabase
      .from('operations')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', operationId)

    if (!error) {
      if (workspace?.id) {
        await logProjectActivity(workspace.id, user?.id ?? null, 'operation', operationId, 'archive')
      }
      await fetchOperations()
    }
    return { error: error?.message ?? null }
  }

  return {
    operations,
    cardMeta,
    loading,
    fetchOperations,
    loadOperationDetails,
    createOperation,
    updateOperation,
    attachFiles,
    updateStatus,
    assignResponsible,
    archiveOperation,
  }
}

/** @deprecated Use useOperations */
export const useProjects = useOperations
