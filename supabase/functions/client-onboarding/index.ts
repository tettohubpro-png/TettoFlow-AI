import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_TEMPLATE_ID = '2e8a4766-ac69-438f-b916-ecfc79637d02'
const ONBOARDING_EVENT_KEY = 'client.onboarded'
const ONBOARDING_MARKER_TITLE = '__tettoflow_onboarding__'

const MANAGER_ROLES = ['OWNER', 'ADMIN', 'MANAGER']

const ONBOARDING_OPERATIONS = [
  { title: '[Onboarding] Briefing Inicial', status: 'DRAFT', priority: 'HIGH' },
  { title: '[Onboarding] Checklist de Documentos', status: 'DRAFT', priority: 'HIGH' },
  { title: '[Onboarding] Produção Mensal', status: 'DRAFT', priority: 'MEDIUM' },
  { title: '[Onboarding] Calendário Editorial', status: 'DRAFT', priority: 'MEDIUM' },
  { title: '[Onboarding] Social Media — Setup', status: 'DRAFT', priority: 'MEDIUM' },
  { title: '[Onboarding] Design — Identidade Visual', status: 'DRAFT', priority: 'MEDIUM' },
  { title: '[Onboarding] Videomaker — Planejamento', status: 'DRAFT', priority: 'LOW' },
  { title: '[Onboarding] Editor — Roteiro Inicial', status: 'DRAFT', priority: 'LOW' },
] as const

interface Payload {
  client_id: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Não autenticado' }, 401)
  }

  try {
    const payload = (await req.json()) as Payload
    if (!payload.client_id) {
      return json({ error: 'client_id obrigatório' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const admin = createClient(supabaseUrl, serviceKey)

    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser()

    if (authErr || !user) {
      return json({ error: 'Sessão inválida' }, 401)
    }

    const { data: client, error: clientErr } = await admin
      .from('clients')
      .select('id, name, status, workspace_id')
      .eq('id', payload.client_id)
      .single()

    if (clientErr || !client) {
      return json({ error: 'Cliente não encontrado' }, 404)
    }

    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('workspace_id', client.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership || !MANAGER_ROLES.includes(membership.role)) {
      return json({ error: 'Sem permissão para executar onboarding' }, 403)
    }

    const { data: existingMarker } = await admin
      .from('client_ai_memory')
      .select('id')
      .eq('client_id', client.id)
      .eq('title', ONBOARDING_MARKER_TITLE)
      .maybeSingle()

    if (existingMarker) {
      return json({
        alreadyDone: true,
        runId: null,
        operationsCreated: 0,
        clientId: client.id,
        clientName: client.name,
      })
    }

    let automationId: string
    const { data: automation } = await admin
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
      const { data: created, error: autoErr } = await admin
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
        return json({ error: autoErr?.message ?? 'Falha ao criar automação' }, 500)
      }
      automationId = created.id
    }

    const { data: run, error: runErr } = await admin
      .from('automation_runs')
      .insert({
        workspace_id: client.workspace_id,
        automation_id: automationId,
        status: 'RUNNING',
      })
      .select('id')
      .single()

    if (runErr || !run) {
      return json({ error: runErr?.message ?? 'Falha ao iniciar execução' }, 500)
    }

    const finishRun = async (status: 'SUCCEEDED' | 'FAILED', error?: string) => {
      await admin
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
        await admin.from('clients').update({ status: 'ACTIVE' }).eq('id', client.id)
      }

      const storagePath = `${client.workspace_id}/${client.id}/`

      const { data: existingFolder } = await admin
        .from('files')
        .select('id')
        .eq('client_id', client.id)
        .eq('storage_path', storagePath)
        .maybeSingle()

      if (!existingFolder) {
        await admin.from('files').insert({
          workspace_id: client.workspace_id,
          client_id: client.id,
          name: `${client.name} — Pasta raiz`,
          storage_path: storagePath,
          mime_type: 'inode/directory',
          created_by: user.id,
        })
      }

      const operationsPayload = ONBOARDING_OPERATIONS.map((step) => ({
        workspace_id: client.workspace_id,
        client_id: client.id,
        template_id: DEFAULT_TEMPLATE_ID,
        title: step.title,
        status: step.status,
        priority: step.priority,
        created_by: user.id,
      }))

      const { error: opsErr } = await admin.from('operations').insert(operationsPayload)
      if (opsErr) throw new Error(opsErr.message)

      const memoryContent = [
        `Onboarding inteligente concluído para ${client.name}.`,
        `Foram criadas ${ONBOARDING_OPERATIONS.length} operações iniciais.`,
        'Pasta de arquivos do cliente provisionada.',
      ].join(' ')

      await admin.from('client_ai_memory').insert([
        {
          workspace_id: client.workspace_id,
          client_id: client.id,
          category: 'BRIEFING',
          title: ONBOARDING_MARKER_TITLE,
          content: memoryContent,
          importance: 10,
          active: true,
          created_by: user.id,
        },
        {
          workspace_id: client.workspace_id,
          client_id: client.id,
          category: 'BRIEFING',
          title: 'Briefing Inicial — contexto',
          content: `Cliente ${client.name} entrou em operação. Revisar briefing, identidade visual e calendário editorial.`,
          importance: 8,
          active: true,
          created_by: user.id,
        },
      ])

      const { data: members } = await admin
        .from('memberships')
        .select('user_id')
        .eq('workspace_id', client.workspace_id)
        .in('role', MANAGER_ROLES)

      const notifications = (members ?? []).map((m) => ({
        workspace_id: client.workspace_id,
        user_id: m.user_id,
        type: ONBOARDING_EVENT_KEY,
        payload_json: {
          client_id: client.id,
          client_name: client.name,
          operations_created: ONBOARDING_OPERATIONS.length,
          run_id: run.id,
        },
      }))

      if (notifications.length > 0) {
        await admin.from('notifications').insert(notifications)
      }

      await finishRun('SUCCEEDED')

      return json({
        alreadyDone: false,
        runId: run.id,
        operationsCreated: ONBOARDING_OPERATIONS.length,
        clientId: client.id,
        clientName: client.name,
      })
    } catch (stepErr) {
      await finishRun('FAILED', String(stepErr))
      return json({ error: String(stepErr) }, 500)
    }
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
