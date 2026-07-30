import { supabase } from '@/lib/supabase'
import type { OnboardingResult } from '@/types/database'
import {
  DEFAULT_TEMPLATE_ID,
  ONBOARDING_EVENT_KEY,
  ONBOARDING_MARKER_TITLE,
} from '@/types/database'
import { ONBOARDING_OPERATIONS, buildClientStoragePath } from '@/utils/onboardingSteps'

const MANAGER_ROLES = ['OWNER', 'ADMIN', 'MANAGER']

export async function runClientOnboarding(
  clientId: string,
  userId: string,
  userRole: string,
): Promise<{ data: OnboardingResult | null; error: string | null }> {
  if (!MANAGER_ROLES.includes(userRole)) {
    return { data: null, error: 'Sem permissão para executar onboarding' }
  }

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, name, status, workspace_id')
    .eq('id', clientId)
    .single()

  if (clientErr || !client) {
    return { data: null, error: 'Cliente não encontrado' }
  }

  const { data: existingMarker } = await supabase
    .from('client_ai_memory')
    .select('id')
    .eq('client_id', client.id)
    .eq('title', ONBOARDING_MARKER_TITLE)
    .maybeSingle()

  if (existingMarker) {
    return {
      data: {
        alreadyDone: true,
        runId: null,
        operationsCreated: 0,
        clientId: client.id,
        clientName: client.name,
      },
      error: null,
    }
  }

  let automationId: string
  const { data: automation } = await supabase
    .from('automations')
    .select('id')
    .eq('workspace_id', client.workspace_id)
    .eq('event_key', ONBOARDING_EVENT_KEY)
    .eq('active', true)
    .limit(1)
    .maybeSingle()

  if (automation) {
    automationId = automation.id
  } else {
    const { data: created, error: autoErr } = await supabase
      .from('automations')
      .insert({
        workspace_id: client.workspace_id,
        name: 'Onboarding de Cliente',
        event_key: ONBOARDING_EVENT_KEY,
        active: true,
        config_json: { version: 1 },
      })
      .select('id')
      .single()

    if (autoErr || !created) {
      return { data: null, error: autoErr?.message ?? 'Falha ao criar automação' }
    }
    automationId = created.id
  }

  const { data: run, error: runErr } = await supabase
    .from('automation_runs')
    .insert({
      workspace_id: client.workspace_id,
      automation_id: automationId,
      status: 'RUNNING',
    })
    .select('id')
    .single()

  if (runErr || !run) {
    return { data: null, error: runErr?.message ?? 'Falha ao iniciar execução' }
  }

  const finishRun = async (status: 'SUCCEEDED' | 'FAILED', error?: string) => {
    await supabase
      .from('automation_runs')
      .update({
        status,
        error: error ?? null,
        finished_at: new Date().toISOString(),
      })
      .eq('id', run.id)
  }

  try {
    if (client.status !== 'ACTIVE') {
      await supabase.from('clients').update({ status: 'ACTIVE' }).eq('id', client.id)
    }

    const storagePath = buildClientStoragePath(client.workspace_id, client.id)

    const { data: existingFolder } = await supabase
      .from('files')
      .select('id')
      .eq('client_id', client.id)
      .eq('storage_path', storagePath)
      .maybeSingle()

    if (!existingFolder) {
      const { error: fileErr } = await supabase.from('files').insert({
        workspace_id: client.workspace_id,
        client_id: client.id,
        name: `${client.name} — Pasta raiz`,
        storage_path: storagePath,
        mime_type: 'inode/directory',
        created_by: userId,
      })
      if (fileErr) throw new Error(fileErr.message)
    }

    const operationsPayload = ONBOARDING_OPERATIONS.map((step) => ({
      workspace_id: client.workspace_id,
      client_id: client.id,
      template_id: DEFAULT_TEMPLATE_ID,
      title: step.title,
      status: step.status,
      priority: step.priority,
      created_by: userId,
    }))

    const { error: opsErr } = await supabase.from('operations').insert(operationsPayload)
    if (opsErr) throw new Error(opsErr.message)

    const memoryContent = [
      `Onboarding inteligente concluído para ${client.name}.`,
      `Foram criadas ${ONBOARDING_OPERATIONS.length} operações iniciais.`,
      'Pasta de arquivos do cliente provisionada.',
    ].join(' ')

    const { error: memErr } = await supabase.from('client_ai_memory').insert([
      {
        workspace_id: client.workspace_id,
        client_id: client.id,
        category: 'BRIEFING',
        title: ONBOARDING_MARKER_TITLE,
        content: memoryContent,
        importance: 10,
        active: true,
        created_by: userId,
      },
      {
        workspace_id: client.workspace_id,
        client_id: client.id,
        category: 'BRIEFING',
        title: 'Briefing Inicial — contexto',
        content: `Cliente ${client.name} entrou em operação. Revisar briefing, identidade visual e calendário editorial.`,
        importance: 8,
        active: true,
        created_by: userId,
      },
    ])
    if (memErr) throw new Error(memErr.message)

    // RLS permite notificação apenas para o próprio usuário
    await supabase.from('notifications').insert({
      workspace_id: client.workspace_id,
      user_id: userId,
      type: ONBOARDING_EVENT_KEY,
      payload_json: {
        client_id: client.id,
        client_name: client.name,
        operations_created: ONBOARDING_OPERATIONS.length,
        run_id: run.id,
      },
    })

    await finishRun('SUCCEEDED')

    return {
      data: {
        alreadyDone: false,
        runId: run.id,
        operationsCreated: ONBOARDING_OPERATIONS.length,
        clientId: client.id,
        clientName: client.name,
      },
      error: null,
    }
  } catch (stepErr) {
    await finishRun('FAILED', String(stepErr))
    return { data: null, error: String(stepErr) }
  }
}
