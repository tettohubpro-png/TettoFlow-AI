import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Project, ProjectStatus } from '@/types/database'

export function useProjects(clientId?: string) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('projects')
      .select('*, clients(name)')
      .order('updated_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data } = await query
    setProjects((data ?? []) as Project[])
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const createProject = async (payload: {
    client_id: string
    title: string
    description?: string
    due_date?: string
  }) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({ ...payload, status: 'briefing' })
      .select()
      .single()
    if (!error) await fetchProjects()
    return { data, error: error?.message ?? null }
  }

  const updateStatus = async (
    projectId: string,
    toStatus: ProjectStatus,
    fromStatus: ProjectStatus,
    note?: string,
  ) => {
    const { error: updateErr } = await supabase
      .from('projects')
      .update({ status: toStatus })
      .eq('id', projectId)

    if (updateErr) return { error: updateErr.message }

    await supabase.from('project_status_log').insert({
      project_id: projectId,
      from_status: fromStatus,
      to_status: toStatus,
      note,
    })

    await fetchProjects()
    return { error: null }
  }

  return { projects, loading, fetchProjects, createProject, updateStatus }
}
