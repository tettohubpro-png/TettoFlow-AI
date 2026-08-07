import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Task {
  id: string
  workspace_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  operation_id: string | null
  assignee_id: string | null
  due_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  operations?: { title: string } | null
  assignee?: { name: string } | null
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'done']
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  in_progress: 'Em Andamento',
  done: 'Concluído',
}

export function useTasks() {
  const { workspace, user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!workspace?.id) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('tasks')
      .select('*, operations(title), assignee:assignee_id(name)')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })

    if (err) setError(err.message)
    else {
      setTasks((data ?? []) as unknown as Task[])
      setError(null)
    }
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = async (payload: {
    title: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    operation_id?: string
    assignee_id?: string
    due_date?: string
  }) => {
    if (!workspace?.id) return { error: 'Workspace não carregado' }

    const { error: err } = await supabase.from('tasks').insert({
      workspace_id: workspace.id,
      title: payload.title,
      description: payload.description || null,
      status: payload.status ?? 'backlog',
      priority: payload.priority ?? 'MEDIUM',
      operation_id: payload.operation_id || null,
      assignee_id: payload.assignee_id || null,
      due_date: payload.due_date || null,
      created_by: user?.id ?? null,
    })

    if (!err) await fetchTasks()
    return { error: err?.message ?? null }
  }

  const updateStatus = async (id: string, status: TaskStatus) => {
    const { error: err } = await supabase.from('tasks').update({ status }).eq('id', id)
    if (!err) await fetchTasks()
    return { error: err?.message ?? null }
  }

  const deleteTask = async (id: string) => {
    const { error: err } = await supabase.from('tasks').delete().eq('id', id)
    if (!err) await fetchTasks()
    return { error: err?.message ?? null }
  }

  return { tasks, loading, error, createTask, updateStatus, deleteTask, refresh: fetchTasks }
}
