import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Department =
  | 'social_media'
  | 'videomaker'
  | 'video_editor'
  | 'traffic'
  | 'manager'
  | 'commercial'
  | 'general'

const DEPARTMENT_LABELS: Record<Department, string> = {
  social_media: 'Social Media',
  videomaker: 'Videomaker',
  video_editor: 'Editor de Vídeo',
  traffic: 'Gestor de Tráfego',
  manager: 'Gestor',
  commercial: 'Comercial',
  general: 'Atendimento',
}

const DEFAULT_TEMPLATE_ID = '2e8a4766-ac69-438f-b916-ecfc79637d02'

// Roteiro de vendas pro agente conversar com LEADS (números ainda não cadastrados
// como cliente). PLACEHOLDER — Mairo vai trocar por conteúdo real (diferenciais,
// cases, prioridade de serviço). Até lá, mantém regras seguras: nunca cita preço
// fechado e sempre escala pro comercial quando o lead topar.
const SALES_PLAYBOOK = {
  service_focus:
    'os serviços da TettoHub (social media, tráfego pago, produção de vídeo, ou pacote completo)',
  pitch_points:
    'atendimento próximo e personalizado, equipe própria (não terceiriza), entrega recorrente e acompanhamento de perto',
  pricing_policy:
    'nunca informar valor fechado por WhatsApp — sempre dizer que a proposta é personalizada e será enviada pelo time comercial',
  escalation_trigger:
    'assim que o lead demonstrar interesse claro em contratar/fechar, ou pedir proposta/contrato',
  tone: 'consultivo, cordial, sem ser insistente',
}

// Campos que o agente coleta de um lead novo antes de cadastrar no CRM (INACTIVE,
// aguardando o comercial fechar contrato/pagamento). email é opcional.
const INTAKE_FIELD_ORDER = ['company_name', 'contact_name', 'service_interest', 'email'] as const
type IntakeField = (typeof INTAKE_FIELD_ORDER)[number]
type IntakeData = Record<IntakeField, string | null>
const INTAKE_MEMORY_TITLE = '__lead_intake__'

const INTAKE_QUESTIONS: Record<IntakeField, string> = {
  company_name: 'Qual o nome da sua empresa?',
  contact_name: 'Legal! E qual seu nome, pra eu saber com quem estou falando?',
  service_interest:
    'Perfeito. O que você está buscando: posts/redes sociais, tráfego pago, produção de vídeo, ou um pacote completo?',
  email:
    'Última coisa (pode pular se quiser): tem um e-mail pra eu deixar registrado? Se não quiser informar, é só dizer "pular".',
}

// Mesmo conjunto de padrões de src/utils/intentRouter.ts — mantido inline pois
// Deno edge functions não importam módulos de src/ de forma confiável.
const INTENT_RULES: {
  department: Department
  intent: string
  patterns: RegExp[]
  needsHuman?: boolean
}[] = [
  {
    department: 'social_media',
    intent: 'content_request',
    patterns: [
      /post(s)?/i,
      /storie?s?/i,
      /reels?/i,
      /legenda/i,
      /feed/i,
      /calend[aá]rio/i,
      /carrossel/i,
      /conte[uú]do/i,
      /instagram/i,
    ],
  },
  {
    department: 'videomaker',
    intent: 'recording_schedule',
    patterns: [
      /grava[cç][aã]o/i,
      /filmar/i,
      /filmagem/i,
      /marcar\s+(grava|filma)/i,
      /agendar\s+(grava|filma)/i,
      /local\s+da\s+grava/i,
      /roteiro\s+de\s+grava/i,
    ],
  },
  {
    department: 'video_editor',
    intent: 'editing_request',
    patterns: [
      /edi[cç][aã]o/i,
      /editar\s+(o\s+)?v[ií]deo/i,
      /corte/i,
      /legendas?\s+(no\s+)?v[ií]deo/i,
      /after\s*effects/i,
      /capcut/i,
      /vers[aã]o\s+editada/i,
    ],
  },
  {
    department: 'traffic',
    intent: 'ads_request',
    patterns: [
      /tr[aá]fego/i,
      /an[uú]ncio/i,
      /ads/i,
      /meta\s*ads/i,
      /google\s*ads/i,
      /impulsionar/i,
      /campanha/i,
      /investir\s+em\s+ads/i,
    ],
  },
  {
    department: 'commercial',
    intent: 'commercial',
    patterns: [
      /proposta/i,
      /or[cç]amento/i,
      /contrato/i,
      /pacote/i,
      /quanto\s+custa/i,
      /pre[cç]o/i,
      /renovar/i,
      /incluir\s+servi[cç]o/i,
    ],
    needsHuman: true,
  },
  {
    department: 'manager',
    intent: 'escalation',
    patterns: [
      /reclama/i,
      /atrasad/i,
      /urgente/i,
      /aprov(a|ação|ar)/i,
      /gestor/i,
      /respons[aá]vel/i,
      /problema\s+s[eé]rio/i,
    ],
    needsHuman: true,
  },
]

// Mesmo conjunto de padrões de src/utils/compliance.ts.
const LEGAL_PATTERNS = [
  /processo\s+n[úu]mero/i,
  /meu\s+caso/i,
  /posso\s+processar/i,
  /direito\s+de/i,
  /advogad[oa]/i,
  /jurídic/i,
]

const HEALTH_PATTERNS = [
  /garante\s+resultado/i,
  /emagrecer\s+\d+/i,
  /cura\s+/i,
  /sem\s+risco/i,
  /procedimento\s+seguro/i,
]

const ELECTORAL_PATTERNS = [
  /votem?\s+em/i,
  /candidat[oa]/i,
  /elei[çc][ãa]o/i,
  /propaganda\s+eleitoral/i,
  /n[úu]mero\s+\d{2,5}/i,
]

interface Payload {
  phone: string
  message: string
  contact_name?: string
  client_id?: string
  instance?: string
}

type NormalizeResult =
  | { kind: 'payload'; payload: Payload }
  | { kind: 'skip' }
  | { kind: 'invalid' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const webhookSecret = Deno.env.get('WEBHOOK_SHARED_SECRET')
    if (webhookSecret && url.searchParams.get('token') !== webhookSecret) {
      return json({ error: 'unauthorized' }, 401)
    }

    const rawBody = await req.json()
    const normalized = await normalizePayload(rawBody)
    if (normalized.kind === 'skip') {
      return json({ ok: true, skipped: true })
    }
    if (normalized.kind === 'invalid') {
      return json({ error: 'phone e message obrigatórios' }, 400)
    }
    const payload = normalized.payload
    const instance = payload.instance || Deno.env.get('EVOLUTION_INSTANCE') || undefined

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const groqKey = Deno.env.get('GROQ_API_KEY')

    // Hermes: se o telefone é de um membro da equipe (users.whatsapp_phone),
    // desvia totalmente do fluxo de atendimento a cliente/lead abaixo.
    const operator = await resolveOperator(supabase, payload.phone)
    if (operator) {
      const hermesResult = await handleHermesMessage(supabase, operator, payload, instance)
      return json(hermesResult)
    }

    await sendEvolutionPresence(instance, payload.phone, 'composing')

    let client = await resolveClient(supabase, payload)

    if (!client) {
      client = await createLeadClient(supabase, payload)
      if (!client) {
        // Falha de infra ao criar o lead (ex. sem workspace configurado) — mantém
        // o comportamento seguro antigo em vez de travar sem resposta.
        const reply =
          'Olá! Sou o assistente da TettoHub. Não encontrei seu cadastro pelo WhatsApp. Pode me dizer o nome da empresa?'
        await sendEvolutionText(instance, payload.phone, reply)
        await sendEvolutionPresence(instance, payload.phone, 'paused')
        return json({
          reply,
          department: 'commercial',
          handoff: true,
          handoff_reason: 'Cliente não identificado',
          create_operation: false,
        })
      }
    }

    // Lead ainda em qualificação (cliente criado pelo agente, INACTIVE, faltando
    // dados) — conversa de vendas + coleta de dados, fora do fluxo normal.
    const intakeMemory =
      client.status === 'INACTIVE' ? await getIntakeMemory(supabase, client.id) : null

    if (intakeMemory) {
      const result = await handleLeadIntake(groqKey, intakeMemory, payload.message)
      await saveIntakeProgress(supabase, client, intakeMemory.id, result, instance)
      await logConversation(supabase, client, payload, result.reply, false)
      await sendEvolutionText(instance, payload.phone, result.reply)
      await sendEvolutionPresence(instance, payload.phone, 'paused')
      return json({
        reply: result.reply,
        department: 'commercial',
        handoff: false,
        create_operation: false,
        client_id: client.id,
        client_name: client.name,
        lead_intake: !result.done,
      })
    }

    const { data: memories } = await supabase
      .from('client_ai_memory')
      .select('title, content, category')
      .eq('client_id', client.id)
      .eq('active', true)
      .order('importance', { ascending: false })
      .limit(8)

    const route = routeIntent(payload.message)
    const segment = inferSegment(memories ?? [])
    const compliance = needsHandoff(segment, payload.message)

    if (compliance.handoff) {
      const reply =
        'Recebi sua mensagem. Vou encaminhar para um especialista da equipe TettoHub continuar o atendimento, ok?'
      await logHistory(supabase, client, payload, reply, route.department, true, compliance.reason)
      await logConversation(supabase, client, payload, reply, true)
      await sendEvolutionText(instance, payload.phone, reply)
      await sendEvolutionPresence(instance, payload.phone, 'paused')
      return json({
        reply,
        department: 'manager',
        department_label: DEPARTMENT_LABELS.manager,
        handoff: true,
        handoff_reason: compliance.reason,
        create_operation: false,
        client_id: client.id,
        client_name: client.name,
      })
    }

    let reply: string
    if (groqKey) {
      reply = await generateWithGroq(groqKey, {
        clientName: client.name,
        message: payload.message,
        memories: memories ?? [],
        department: route.department,
        departmentLabel: DEPARTMENT_LABELS[route.department],
      })
    } else {
      reply = fallbackReply(client.name, route.department, payload.message)
    }

    let operationId: string | null = null
    const shouldCreateOp = route.department !== 'general'

    if (shouldCreateOp) {
      const title = `[WhatsApp] ${DEPARTMENT_LABELS[route.department]} — ${payload.message.slice(0, 60)}`
      const { data: op } = await supabase
        .from('operations')
        .insert({
          workspace_id: client.workspace_id,
          client_id: client.id,
          template_id: DEFAULT_TEMPLATE_ID,
          title,
          status: 'DRAFT',
          priority: route.needsHuman ? 'HIGH' : 'MEDIUM',
        })
        .select('id')
        .single()
      operationId = op?.id ?? null
    }

    await logHistory(
      supabase,
      client,
      payload,
      reply,
      route.department,
      route.needsHuman,
      null,
    )
    await logConversation(supabase, client, payload, reply, route.needsHuman)

    await sendEvolutionText(instance, payload.phone, reply)
    await sendEvolutionPresence(instance, payload.phone, 'paused')
    if (shouldCreateOp) {
      await sendInternalAlert(instance, client.name, route.department, payload.message)
    }

    return json({
      reply,
      department: route.department,
      department_label: DEPARTMENT_LABELS[route.department],
      intent: route.intent,
      handoff: route.needsHuman,
      handoff_reason: route.needsHuman ? 'Requer equipe humana' : null,
      create_operation: shouldCreateOp,
      operation_id: operationId,
      client_id: client.id,
      client_name: client.name,
    })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

/**
 * fetch com timeout — a Evolution API pode ficar sem responder (ex. instância
 * desconectada) em vez de devolver erro rápido, e isso travaria a function
 * inteira sem isso (confirmado em teste: sendPresence trava >10s quando a
 * instância está "connecting"). Groq raramente trava, mas protege igual.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Aceita tanto o payload cru da Evolution API (evento MESSAGES_UPSERT) quanto o
 * payload simples { phone, message, ... } usado pelo simulador/testes manuais.
 */
async function normalizePayload(raw: unknown): Promise<NormalizeResult> {
  const body = raw as Record<string, unknown> | null
  if (!body || typeof body !== 'object') return { kind: 'invalid' }

  const data = body.data as Record<string, unknown> | undefined
  if (data && typeof data === 'object' && data.key) {
    const key = data.key as { remoteJid?: string; fromMe?: boolean; id?: string }
    if (key.fromMe) return { kind: 'skip' } // eco da própria resposta do bot

    const remoteJid = key.remoteJid ?? ''
    if (remoteJid.endsWith('@g.us')) return { kind: 'skip' } // grupos não são atendidos pelo agente

    const phone = remoteJid.replace(/@.*/, '').replace(/\D/g, '')
    if (!phone) return { kind: 'skip' }

    const msg = (data.message ?? {}) as Record<string, unknown>
    let text =
      (msg.conversation as string | undefined) ??
      ((msg.extendedTextMessage as Record<string, unknown> | undefined)?.text as string | undefined) ??
      ((msg.imageMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ??
      ((msg.videoMessage as Record<string, unknown> | undefined)?.caption as string | undefined)

    if (!text && (msg.audioMessage || msg.pttMessage) && key.id) {
      text = await transcribeAudio(body.instance as string | undefined, key.id)
    }

    if (!text?.trim()) return { kind: 'skip' } // tipo não suportado (figurinha, reação, etc.)

    return {
      kind: 'payload',
      payload: {
        phone,
        message: text.trim(),
        contact_name: data.pushName as string | undefined,
        instance: body.instance as string | undefined,
      },
    }
  }

  if (typeof body.phone === 'string' && typeof body.message === 'string') {
    if (!body.phone || !body.message.trim()) return { kind: 'invalid' }
    return { kind: 'payload', payload: body as unknown as Payload }
  }

  return { kind: 'invalid' }
}

/**
 * Gera todas as variações plausíveis de um número de telefone BR pra
 * comparação: com/sem DDI (55) e com/sem o 9º dígito do celular. O WhatsApp
 * às vezes manda o remoteJid SEM o 9 extra (formato antigo), mesmo quando o
 * número "oficial" da pessoa tem os 9 dígitos — sem isso o match falha
 * silenciosamente (confirmado em teste: operador cadastrado com o 9 não
 * bateu com a mensagem real, que chegou sem o 9).
 */
function phoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return []

  const withoutDDI = digits.startsWith('55') ? digits.slice(2) : digits
  const withDDI = `55${withoutDDI}`
  const variants = new Set([digits, withoutDDI, withDDI])

  // withoutDDI aqui é DDD (2 dígitos) + assinante (8 ou 9 dígitos)
  if (withoutDDI.length === 11 && withoutDDI[2] === '9') {
    const without9 = withoutDDI.slice(0, 2) + withoutDDI.slice(3)
    variants.add(without9)
    variants.add(`55${without9}`)
  } else if (withoutDDI.length === 10) {
    const with9 = withoutDDI.slice(0, 2) + '9' + withoutDDI.slice(2)
    variants.add(with9)
    variants.add(`55${with9}`)
  }

  return Array.from(variants)
}

async function resolveClient(
  supabase: ReturnType<typeof createClient>,
  payload: Payload,
) {
  if (payload.client_id) {
    const { data } = await supabase
      .from('clients')
      .select('id, name, workspace_id, status')
      .eq('id', payload.client_id)
      .maybeSingle()
    if (data) return data
  }

  const variants = phoneVariants(payload.phone)
  if (variants.length === 0) return null

  const orFilter = variants
    .flatMap((v) => [`phone.eq.${v}`, `phone.ilike.%${v}`])
    .join(',')

  const { data: contacts } = await supabase
    .from('client_contacts')
    .select('client_id, phone, clients(id, name, workspace_id, status)')
    .not('phone', 'is', null)
    .or(orFilter)
    .limit(10)

  for (const c of contacts ?? []) {
    const client = c.clients as unknown as {
      id: string
      name: string
      workspace_id: string
      status: string
    }
    if (client?.id) return client
  }

  return null
}

// ============================================================================
// Hermes — agente operacional via WhatsApp (equipe interna, não cliente)
// ============================================================================
//
// Fluxo por mensagem recebida de um número cadastrado em users.whatsapp_phone:
// 1. Se há uma ação de escrita pendente de confirmação (agent_actions_log,
//    status='pending_confirmation') para esse ator, a mensagem é interpretada
//    como sim/não — não passa pelo Claude de novo.
// 2. Caso contrário, roda um loop de tool-calling com o Claude: ferramentas de
//    LEITURA executam na hora; ferramentas de ESCRITA só ficam "staged"
//    (pending_confirmation) — o Claude é instruído a parar e perguntar
//    confirmação em português, e a execução real só acontece no passo 1 da
//    próxima mensagem.
// Toda chamada de ferramenta (leitura ou escrita) grava uma linha em
// agent_actions_log.

const HERMES_WRITE_TOOLS = new Set([
  'update_client',
  'create_task',
  'update_task_status',
  'assign_task',
  'create_operation',
  'update_operation_status',
  'add_operation_comment',
])

const OPERATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'ANALYSIS',
  'PRODUCTION',
  'REVIEW',
  'CLIENT',
  'APPROVED',
  'PUBLISHED',
  'DONE',
]
const TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'done']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const CLIENT_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED']

const HERMES_TOOLS = [
  {
    name: 'search_clients',
    description:
      'Busca clientes do workspace pelo nome (ou parte dele). Use antes de qualquer outra ferramenta que precise de client_id, a menos que o usuário já tenha informado o ID.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nome ou parte do nome do cliente/empresa a buscar.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_client_summary',
    description:
      'Retorna um resumo completo de um cliente: dados cadastrais, contato principal, memórias/briefing mais importantes e quantidade de operações em aberto.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID do cliente (obtido via search_clients).' },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'update_client',
    description:
      'ESCRITA. Atualiza dados cadastrais de um cliente (nome, status, segmento, cidade, estado, observações, origem, CPF/CNPJ). Só envie os campos que devem mudar.',
    input_schema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'UUID do cliente.' },
        name: { type: 'string' },
        status: { type: 'string', enum: CLIENT_STATUSES },
        segment: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        notes: { type: 'string' },
        origin: { type: 'string' },
        cpf_cnpj: { type: 'string' },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'create_task',
    description: 'ESCRITA. Cria uma tarefa no quadro de Tarefas do workspace.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título da tarefa.' },
        description: { type: 'string' },
        priority: { type: 'string', enum: PRIORITIES, description: 'Padrão: MEDIUM.' },
        operation_id: { type: 'string', description: 'UUID da operação relacionada, se houver.' },
        assignee_id: { type: 'string', description: 'UUID do responsável, se já souber.' },
        assignee_name: { type: 'string', description: 'Nome do responsável, se não souber o UUID.' },
        due_date: { type: 'string', description: 'Data de vencimento no formato YYYY-MM-DD.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task_status',
    description: 'ESCRITA. Muda o status de uma tarefa existente.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID da tarefa.' },
        status: { type: 'string', enum: TASK_STATUSES },
      },
      required: ['task_id', 'status'],
    },
  },
  {
    name: 'assign_task',
    description: 'ESCRITA. Atribui (ou reatribui) uma tarefa a um membro da equipe.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID da tarefa.' },
        assignee_id: { type: 'string', description: 'UUID do responsável, se já souber.' },
        assignee_name: { type: 'string', description: 'Nome do responsável, se não souber o UUID.' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'create_operation',
    description: 'ESCRITA. Cria uma nova operação/solicitação para um cliente (status inicial DRAFT).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        client_id: { type: 'string', description: 'UUID do cliente, se já souber.' },
        client_name: { type: 'string', description: 'Nome do cliente, se não souber o UUID.' },
        description: { type: 'string' },
        priority: { type: 'string', enum: PRIORITIES, description: 'Padrão: MEDIUM.' },
        deadline: { type: 'string', description: 'Prazo no formato YYYY-MM-DD.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_operation_status',
    description: 'ESCRITA. Muda o status de uma operação existente.',
    input_schema: {
      type: 'object',
      properties: {
        operation_id: { type: 'string', description: 'UUID da operação.' },
        status: { type: 'string', enum: OPERATION_STATUSES },
      },
      required: ['operation_id', 'status'],
    },
  },
  {
    name: 'add_operation_comment',
    description: 'ESCRITA. Adiciona um comentário/sugestão em uma operação.',
    input_schema: {
      type: 'object',
      properties: {
        operation_id: { type: 'string', description: 'UUID da operação.' },
        content: { type: 'string', description: 'Texto do comentário.' },
      },
      required: ['operation_id', 'content'],
    },
  },
]

function hermesSystemPrompt(operatorName: string, operatorRole: string): string {
  const roleLabel = ROLE_LABELS[operatorRole] ?? operatorRole
  const isOwnerOrAdmin = operatorRole === 'OWNER' || operatorRole === 'ADMIN'

  const hierarchyBlock = isOwnerOrAdmin
    ? `Quem está falando com você agora é ${operatorName}, o(a) **${roleLabel}** da TettoHub — a maior autoridade na agência. Trate essa pessoa com prioridade máxima: dê respostas completas, sem omitir informação, e assuma que ela tem acesso irrestrito a qualquer dado do CRM (todos os clientes, todas as operações, tudo). Não hesite nem peça permissão extra além da confirmação normal de ações de escrita.`
    : `Quem está falando com você agora é ${operatorName}, **${roleLabel}** da equipe TettoHub. Por enquanto o acesso dele(a) às ferramentas é o mesmo de qualquer operador (a restrição de informação por cargo ainda não foi implementada — está planejada, mas ainda não vale). Trate normalmente, com o mesmo cuidado de sempre nas confirmações de escrita.`

  return `Você é o Hermes, assistente operacional interno da TettoHub, conversando por WhatsApp com um membro da equipe (não é cliente).

${hierarchyBlock}

Seu papel: ajudar a equipe a consultar e atualizar o CRM (clientes, tarefas, operações) por comando no WhatsApp.

Você tem memória das últimas mensagens dessa conversa (aparecem no histórico abaixo) — use esse contexto pra entender pedidos que fazem referência a algo dito antes ("aquele cliente", "a tarefa que criei"), sem precisar que a pessoa repita tudo.

Regras:
1. Para qualquer pedido envolvendo um cliente específico, use search_clients primeiro se você não tiver o client_id — nunca invente um ID.
2. Ferramentas de LEITURA (search_clients, get_client_summary) você pode chamar livremente para reunir contexto.
3. Ferramentas de ESCRITA (update_client, create_task, update_task_status, assign_task, create_operation, update_operation_status, add_operation_comment) NUNCA são executadas na hora — ao chamar uma delas, o sistema apenas registra a ação como pendente. Depois de chamar uma ferramenta de escrita, pare e pergunte ao usuário, em português, se ele confirma a ação, descrevendo em uma frase o que vai mudar e terminando com algo como "Confirma? Responda *sim* ou *não*."
4. Chame no máximo UMA ferramenta de escrita por mensagem do usuário.
5. Seja direto e breve — está no WhatsApp, não é um relatório.
6. Se não entender o pedido ou faltar informação (ex: qual cliente, qual tarefa), pergunte antes de agir.`
}

async function callClaudeMessages(
  apiKey: string,
  system: string,
  tools: unknown[],
  messages: unknown[],
): Promise<{ stop_reason: string; content: Array<Record<string, unknown>> }> {
  const res = await fetchWithTimeout(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2048,
        system,
        tools,
        messages,
      }),
    },
    15000,
  )
  const body = await res.json()
  if (!res.ok) {
    console.error('Anthropic API error', body)
    throw new Error(body?.error?.message || `Anthropic API error ${res.status}`)
  }
  return body
}

async function resolveOperator(
  supabase: ReturnType<typeof createClient>,
  phone: string,
): Promise<{ id: string; name: string; email: string } | null> {
  const variants = phoneVariants(phone)
  if (variants.length === 0) return null

  const orFilter = variants.map((v) => `whatsapp_phone.eq.${v}`).join(',')

  const { data } = await supabase
    .from('users')
    .select('id, name, email')
    .not('whatsapp_phone', 'is', null)
    .or(orFilter)
    .limit(1)
    .maybeSingle()

  return (data as { id: string; name: string; email: string } | null) ?? null
}

async function getOperatorMembership(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ workspaceId: string; role: string } | null> {
  const { data } = await supabase
    .from('memberships')
    .select('workspace_id, role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  if (!data?.workspace_id) return null
  return { workspaceId: data.workspace_id as string, role: (data.role as string) ?? 'MEMBER' }
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Dono da agência',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  MEMBER: 'Funcionário',
}

async function logAgentAction(
  supabase: ReturnType<typeof createClient>,
  params: {
    workspaceId: string
    actorUserId: string
    actorPhone: string
    toolName: string
    input: unknown
    status: 'pending_confirmation' | 'executed' | 'failed'
    result?: unknown
    error?: string
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from('agent_actions_log')
    .insert({
      workspace_id: params.workspaceId,
      actor_user_id: params.actorUserId,
      actor_phone: params.actorPhone,
      tool_name: params.toolName,
      input: params.input ?? {},
      status: params.status,
      result: params.result ?? null,
      error: params.error ?? null,
      resolved_at: params.status === 'pending_confirmation' ? null : new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) {
    console.error('logAgentAction failed', error)
    return null
  }
  return (data?.id as string | undefined) ?? null
}

async function updateAgentAction(
  supabase: ReturnType<typeof createClient>,
  id: string,
  fields: { status: 'confirmed' | 'rejected' | 'executed' | 'failed'; result?: unknown; error?: string },
) {
  await supabase
    .from('agent_actions_log')
    .update({
      status: fields.status,
      result: fields.result ?? null,
      error: fields.error ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
}

async function resolveClientRef(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  input: { client_id?: string; client_name?: string },
): Promise<{ id: string } | { error: string }> {
  if (input.client_id) return { id: input.client_id }
  if (input.client_name) {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .ilike('name', `%${input.client_name}%`)
      .limit(2)
    if (!data || data.length === 0) {
      return { error: `Nenhum cliente encontrado com o nome "${input.client_name}".` }
    }
    if (data.length > 1) {
      return {
        error: `Mais de um cliente encontrado com o nome "${input.client_name}" — use search_clients e informe o client_id.`,
      }
    }
    return { id: data[0].id as string }
  }
  return { error: 'Informe client_id ou client_name.' }
}

async function resolveUserRef(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  input: { assignee_id?: string; assignee_name?: string },
): Promise<{ id: string | null } | { error: string }> {
  if (input.assignee_id) return { id: input.assignee_id }
  if (input.assignee_name) {
    const { data: memberships } = await supabase
      .from('memberships')
      .select('user_id, users(id, name)')
      .eq('workspace_id', workspaceId)
    const needle = input.assignee_name.toLowerCase()
    const matches = (memberships ?? []).filter((m) => {
      const u = m.users as unknown as { name: string } | null
      return u?.name?.toLowerCase().includes(needle)
    })
    if (matches.length === 0) {
      return { error: `Nenhum membro da equipe encontrado com o nome "${input.assignee_name}".` }
    }
    if (matches.length > 1) {
      return { error: `Mais de um membro encontrado com o nome "${input.assignee_name}" — seja mais específico.` }
    }
    return { id: matches[0].user_id as string }
  }
  return { id: null }
}

async function executeReadTool(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  toolName: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  if (toolName === 'search_clients') {
    const query = String(input.query ?? '').trim()
    if (!query) return { error: 'query vazia' }
    const { data } = await supabase
      .from('clients')
      .select('id, name, status, city, state')
      .eq('workspace_id', workspaceId)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10)
    return { clients: data ?? [] }
  }

  if (toolName === 'get_client_summary') {
    const clientId = String(input.client_id ?? '')
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, status, segment, city, state, origin, notes, cpf_cnpj')
      .eq('id', clientId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (!client) return { error: 'Cliente não encontrado.' }

    const { data: contact } = await supabase
      .from('client_contacts')
      .select('name, email, phone')
      .eq('client_id', clientId)
      .eq('is_primary', true)
      .maybeSingle()

    const { data: memories } = await supabase
      .from('client_ai_memory')
      .select('title, content, category')
      .eq('client_id', clientId)
      .eq('active', true)
      .order('importance', { ascending: false })
      .limit(5)

    const { count: openOperations } = await supabase
      .from('operations')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .not('status', 'in', '(DONE,PUBLISHED)')

    return {
      client,
      contact: contact ?? null,
      memories: memories ?? [],
      open_operations: openOperations ?? 0,
    }
  }

  return { error: `Ferramenta desconhecida: ${toolName}` }
}

async function executeWriteTool(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  actorId: string,
  toolName: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (toolName) {
    case 'update_client': {
      const clientId = String(input.client_id ?? '')
      const fields: Record<string, unknown> = {}
      for (const key of ['name', 'status', 'segment', 'city', 'state', 'notes', 'origin', 'cpf_cnpj']) {
        if (input[key] !== undefined) fields[key] = input[key]
      }
      if (Object.keys(fields).length === 0) throw new Error('Nenhum campo para atualizar.')
      const { data, error } = await supabase
        .from('clients')
        .update(fields)
        .eq('id', clientId)
        .eq('workspace_id', workspaceId)
        .select('id, name')
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) throw new Error('Cliente não encontrado.')
      return { updated: true, client: data }
    }

    case 'create_task': {
      const assignee = await resolveUserRef(supabase, workspaceId, {
        assignee_id: input.assignee_id as string | undefined,
        assignee_name: input.assignee_name as string | undefined,
      })
      if ('error' in assignee) throw new Error(assignee.error)
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          workspace_id: workspaceId,
          title: String(input.title ?? ''),
          description: (input.description as string | undefined) ?? null,
          priority: (input.priority as string | undefined) ?? 'MEDIUM',
          operation_id: (input.operation_id as string | undefined) ?? null,
          assignee_id: assignee.id,
          due_date: (input.due_date as string | undefined) ?? null,
          created_by: actorId,
        })
        .select('id, title')
        .single()
      if (error) throw new Error(error.message)
      return { created: true, task: data }
    }

    case 'update_task_status': {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: input.status })
        .eq('id', String(input.task_id ?? ''))
        .eq('workspace_id', workspaceId)
        .select('id, title, status')
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) throw new Error('Tarefa não encontrada.')
      return { updated: true, task: data }
    }

    case 'assign_task': {
      const assignee = await resolveUserRef(supabase, workspaceId, {
        assignee_id: input.assignee_id as string | undefined,
        assignee_name: input.assignee_name as string | undefined,
      })
      if ('error' in assignee) throw new Error(assignee.error)
      if (!assignee.id) throw new Error('Informe assignee_id ou assignee_name.')
      const { data, error } = await supabase
        .from('tasks')
        .update({ assignee_id: assignee.id })
        .eq('id', String(input.task_id ?? ''))
        .eq('workspace_id', workspaceId)
        .select('id, title')
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) throw new Error('Tarefa não encontrada.')
      return { updated: true, task: data }
    }

    case 'create_operation': {
      const clientRef = await resolveClientRef(supabase, workspaceId, {
        client_id: input.client_id as string | undefined,
        client_name: input.client_name as string | undefined,
      })
      if ('error' in clientRef) throw new Error(clientRef.error)
      const { data, error } = await supabase
        .from('operations')
        .insert({
          workspace_id: workspaceId,
          client_id: clientRef.id,
          template_id: DEFAULT_TEMPLATE_ID,
          title: String(input.title ?? ''),
          description: (input.description as string | undefined) ?? null,
          status: 'DRAFT',
          priority: (input.priority as string | undefined) ?? 'MEDIUM',
          deadline: (input.deadline as string | undefined) ?? null,
          created_by: actorId,
        })
        .select('id, title')
        .single()
      if (error) throw new Error(error.message)
      return { created: true, operation: data }
    }

    case 'update_operation_status': {
      const { data, error } = await supabase
        .from('operations')
        .update({ status: input.status })
        .eq('id', String(input.operation_id ?? ''))
        .eq('workspace_id', workspaceId)
        .select('id, title, status')
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) throw new Error('Operação não encontrada.')
      return { updated: true, operation: data }
    }

    case 'add_operation_comment': {
      const { data, error } = await supabase
        .from('operation_comments')
        .insert({
          workspace_id: workspaceId,
          operation_id: String(input.operation_id ?? ''),
          author_id: actorId,
          content: String(input.content ?? ''),
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      return { created: true, comment_id: data?.id }
    }

    default:
      throw new Error(`Ferramenta de escrita desconhecida: ${toolName}`)
  }
}

function interpretConfirmation(message: string): 'yes' | 'no' | 'unclear' {
  const text = message.trim().toLowerCase()
  if (/^(sim|s|ok|confirmo|confirmado|pode|manda|isso|yes)\b/.test(text)) return 'yes'
  if (/^(n[aã]o|nao|n|cancela|cancelar|para|no)\b/.test(text)) return 'no'
  return 'unclear'
}

function summarizeWriteResult(toolName: string, result: unknown): string {
  const r = (result ?? {}) as Record<string, unknown>
  switch (toolName) {
    case 'update_client':
      return 'Cliente atualizado.'
    case 'create_task':
      return `Tarefa criada: "${(r.task as { title?: string } | undefined)?.title ?? ''}".`
    case 'update_task_status':
      return 'Status da tarefa atualizado.'
    case 'assign_task':
      return 'Tarefa reatribuída.'
    case 'create_operation':
      return `Operação criada: "${(r.operation as { title?: string } | undefined)?.title ?? ''}".`
    case 'update_operation_status':
      return 'Status da operação atualizado.'
    case 'add_operation_comment':
      return 'Comentário adicionado.'
    default:
      return 'Ação executada.'
  }
}

async function handlePendingConfirmation(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  actorId: string,
  pending: { id: string; tool_name: string; input: Record<string, unknown> },
  message: string,
): Promise<string> {
  const decision = interpretConfirmation(message)

  if (decision === 'unclear') {
    return 'Não entendi. Confirma essa ação? Responda *sim* ou *não*.'
  }

  if (decision === 'no') {
    await updateAgentAction(supabase, pending.id, { status: 'rejected' })
    return 'Ação cancelada. ✋'
  }

  await updateAgentAction(supabase, pending.id, { status: 'confirmed' })
  try {
    const result = await executeWriteTool(supabase, workspaceId, actorId, pending.tool_name, pending.input)
    await updateAgentAction(supabase, pending.id, { status: 'executed', result })
    return `Pronto! ✅ ${summarizeWriteResult(pending.tool_name, result)}`
  } catch (err) {
    await updateAgentAction(supabase, pending.id, { status: 'failed', error: String(err) })
    return `Não consegui concluir a ação: ${String(err)}`
  }
}

async function loadRecentHermesMessages(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  actorUserId: string,
  limit = 20,
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const { data } = await supabase
    .from('hermes_messages')
    .select('role, content')
    .eq('workspace_id', workspaceId)
    .eq('actor_user_id', actorUserId)
    .order('created_at', { ascending: false })
    .limit(limit)
  const rows = (data ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>
  return rows.reverse() // mais antiga primeiro — ordem cronológica pra API do Claude
}

async function persistHermesTurn(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  actorUserId: string,
  userMessage: string,
  assistantReply: string,
) {
  const { error } = await supabase.from('hermes_messages').insert([
    { workspace_id: workspaceId, actor_user_id: actorUserId, role: 'user', content: userMessage },
    { workspace_id: workspaceId, actor_user_id: actorUserId, role: 'assistant', content: assistantReply },
  ])
  if (error) console.error('persistHermesTurn failed', error)
}

async function runHermesAgentLoop(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  workspaceId: string,
  operator: { id: string; name: string; role: string },
  actorPhone: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const messages: Array<Record<string, unknown>> = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ]

  for (let iteration = 0; iteration < 4; iteration++) {
    const response = await callClaudeMessages(
      apiKey,
      hermesSystemPrompt(operator.name, operator.role),
      HERMES_TOOLS,
      messages,
    )

    if (response.stop_reason !== 'tool_use') {
      const textBlock = response.content.find((b) => b.type === 'text') as { text: string } | undefined
      return textBlock?.text?.trim() || 'Não consegui responder a isso agora.'
    }

    messages.push({ role: 'assistant', content: response.content })

    const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use') as Array<{
      type: 'tool_use'
      id: string
      name: string
      input: Record<string, unknown>
    }>

    const toolResults: Array<Record<string, unknown>> = []
    let staged = false

    for (const block of toolUseBlocks) {
      if (HERMES_WRITE_TOOLS.has(block.name)) {
        if (staged) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: 'Ignorado: só uma ação de escrita por mensagem.',
          })
          continue
        }
        const logId = await logAgentAction(supabase, {
          workspaceId,
          actorUserId: operator.id,
          actorPhone,
          toolName: block.name,
          input: block.input,
          status: 'pending_confirmation',
        })
        staged = true
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: logId
            ? 'STAGED_PENDING_CONFIRMATION: a ação foi registrada e está aguardando confirmação do usuário. Agora explique em português, em uma frase, o que essa ação vai fazer, e pergunte "Confirma? Responda sim ou não." Não chame outra ferramenta nesta resposta.'
            : 'Falha ao registrar a ação pendente — avise o usuário que não deu pra continuar agora.',
        })
      } else {
        try {
          const result = await executeReadTool(supabase, workspaceId, block.name, block.input)
          await logAgentAction(supabase, {
            workspaceId,
            actorUserId: operator.id,
            actorPhone,
            toolName: block.name,
            input: block.input,
            status: 'executed',
            result,
          })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          })
        } catch (err) {
          await logAgentAction(supabase, {
            workspaceId,
            actorUserId: operator.id,
            actorPhone,
            toolName: block.name,
            input: block.input,
            status: 'failed',
            error: String(err),
          })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: String(err),
            is_error: true,
          })
        }
      }
    }

    messages.push({ role: 'user', content: toolResults })
  }

  return 'Desculpa, não consegui concluir isso agora. Pode tentar de novo, de um jeito mais direto?'
}

async function handleHermesMessage(
  supabase: ReturnType<typeof createClient>,
  operator: { id: string; name: string; email: string },
  payload: Payload,
  instance: string | undefined,
): Promise<Record<string, unknown>> {
  const membership = await getOperatorMembership(supabase, operator.id)
  if (!membership) {
    const reply = 'Não achei seu workspace cadastrado. Fala com o admin pra revisar seu acesso.'
    await sendEvolutionText(instance, payload.phone, reply)
    return { reply, hermes: true, actor_user_id: operator.id }
  }
  const { workspaceId, role } = membership

  await sendEvolutionPresence(instance, payload.phone, 'composing')

  const { data: pending } = await supabase
    .from('agent_actions_log')
    .select('id, tool_name, input')
    .eq('actor_user_id', operator.id)
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending_confirmation')
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

  let reply: string
  if (pending) {
    reply = await handlePendingConfirmation(
      supabase,
      workspaceId,
      operator.id,
      pending as { id: string; tool_name: string; input: Record<string, unknown> },
      payload.message,
    )
  } else if (!apiKey) {
    reply = 'Hermes ainda não está configurado (falta a chave da IA). Avisa o time técnico.'
  } else {
    try {
      const history = await loadRecentHermesMessages(supabase, workspaceId, operator.id)
      reply = await runHermesAgentLoop(
        supabase,
        apiKey,
        workspaceId,
        { ...operator, role },
        payload.phone,
        payload.message,
        history,
      )
    } catch (err) {
      console.error('runHermesAgentLoop failed', err)
      reply = 'Deu ruim aqui do meu lado processando seu pedido. Tenta de novo?'
    }
  }

  await persistHermesTurn(supabase, workspaceId, operator.id, payload.message, reply)

  await sendEvolutionText(instance, payload.phone, reply)
  await sendEvolutionPresence(instance, payload.phone, 'paused')

  return { reply, hermes: true, actor_user_id: operator.id, workspace_id: workspaceId }
}

function emptyIntake(): IntakeData {
  return { company_name: null, contact_name: null, service_interest: null, email: null }
}

function firstMissingField(intake: IntakeData): IntakeField | null {
  // Percorre TODOS os campos (inclusive email) — email só fica "preenchido"
  // quando o lead responde de verdade ou pede pra pular (vira 'não informado').
  // Se checássemos só INTAKE_REQUIRED, o fluxo terminaria antes de perguntar o email.
  for (const f of INTAKE_FIELD_ORDER) {
    if (!intake[f]) return f
  }
  return null
}

async function getDefaultWorkspaceId(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  // Deployment atual é single-tenant (uma agência) — reaproveita o workspace de
  // qualquer cliente existente em vez de exigir um ID fixo no código.
  const { data } = await supabase.from('clients').select('workspace_id').limit(1).maybeSingle()
  return data?.workspace_id ?? null
}

async function createLeadClient(
  supabase: ReturnType<typeof createClient>,
  payload: Payload,
): Promise<{ id: string; name: string; workspace_id: string; status: string } | null> {
  const workspaceId = await getDefaultWorkspaceId(supabase)
  if (!workspaceId) return null

  const placeholderName = payload.contact_name?.trim() || `Novo contato — ${payload.phone.slice(-4)}`

  const { data: client, error } = await supabase
    .from('clients')
    .insert({ workspace_id: workspaceId, name: placeholderName, status: 'INACTIVE' })
    .select('id, name, workspace_id, status')
    .single()
  if (error || !client) return null

  await supabase.from('client_contacts').insert({
    workspace_id: workspaceId,
    client_id: client.id,
    name: payload.contact_name?.trim() || placeholderName,
    phone: payload.phone,
    is_primary: true,
  })

  const intake = emptyIntake()
  if (payload.contact_name?.trim()) intake.contact_name = payload.contact_name.trim()

  await supabase.from('client_ai_memory').insert({
    workspace_id: workspaceId,
    client_id: client.id,
    category: 'BRIEFING',
    title: INTAKE_MEMORY_TITLE,
    content: JSON.stringify(intake),
    importance: 9,
    active: true,
  })

  return client as { id: string; name: string; workspace_id: string; status: string }
}

async function getIntakeMemory(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
): Promise<{ id: string; data: IntakeData } | null> {
  const { data } = await supabase
    .from('client_ai_memory')
    .select('id, content')
    .eq('client_id', clientId)
    .eq('title', INTAKE_MEMORY_TITLE)
    .eq('active', true)
    .maybeSingle()
  if (!data) return null

  let parsed: IntakeData
  try {
    parsed = { ...emptyIntake(), ...JSON.parse(data.content) }
  } catch {
    parsed = emptyIntake()
  }
  return { id: data.id as string, data: parsed }
}

async function handleLeadIntake(
  groqKey: string | undefined,
  intake: { id: string; data: IntakeData },
  message: string,
): Promise<{ reply: string; done: boolean; data: IntakeData }> {
  const data = { ...intake.data }

  if (groqKey) {
    const extracted = await extractIntakeWithGroq(groqKey, data, message)
    if (extracted?.reply) {
      for (const f of INTAKE_FIELD_ORDER) {
        if (extracted[f]) data[f] = extracted[f]
      }
      return { reply: extracted.reply, done: !firstMissingField(data), data }
    }
  }

  // Fallback sem Groq (ou se a extração falhar): fluxo sequencial determinístico —
  // a mensagem que chegou agora é tratada como resposta à pergunta anterior.
  const askedField = firstMissingField(intake.data)
  if (askedField) {
    const answer = message.trim()
    if (askedField === 'email' && /pular|n[aã]o|sem/i.test(answer)) {
      data.email = 'não informado'
    } else if (answer) {
      data[askedField] = answer
    }
  }

  const nextMissing = firstMissingField(data)
  if (!nextMissing) {
    return {
      reply: `Perfeito, ${data.contact_name}! Já anotei tudo. Vou passar seus dados pro nosso time comercial da TettoHub — em breve alguém entra em contato pra fechar os detalhes. 🙌`,
      done: true,
      data,
    }
  }
  return { reply: INTAKE_QUESTIONS[nextMissing], done: false, data }
}

async function extractIntakeWithGroq(
  apiKey: string,
  known: IntakeData,
  message: string,
): Promise<(IntakeData & { reply: string }) | null> {
  const system = `Você é o assistente comercial de WhatsApp da TettoHub, agência de marketing digital full-service em São Luís-MA.
Está conversando com um LEAD (ainda não é cliente). Seu objetivo:
1) Ser simpático e persuasivo sobre ${SALES_PLAYBOOK.service_focus}. Argumentos: ${SALES_PLAYBOOK.pitch_points}.
2) Regra de preço: ${SALES_PLAYBOOK.pricing_policy}.
3) Tom: ${SALES_PLAYBOOK.tone}.
4) Ao longo da conversa, colete de forma natural (sem parecer formulário): nome da empresa, nome de quem está falando, qual serviço interessa, e-mail (opcional).
Dados já conhecidos: ${JSON.stringify(known)}

Responda em português, no máximo 4 frases, terminando com UMA pergunta objetiva se ainda faltar dado (nesta ordem: empresa, nome, serviço, e-mail).
Depois da resposta, em uma NOVA LINHA, escreva exatamente:
DADOS: {"company_name": "...ou null", "contact_name": "...ou null", "service_interest": "...ou null", "email": "...ou null"}
Só preencha com valor não-null se o lead informou isso claramente nesta mensagem ou antes. Nunca invente dado.
Se o lead disser que não quer/vai pular o e-mail, preencha "email": "não informado" (não deixe null nesse caso).`

  try {
    const res = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.4,
          max_tokens: 320,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: message },
          ],
        }),
      },
      15000,
    )

    const body = await res.json()
    const content: string | undefined = body?.choices?.[0]?.message?.content
    if (!content) return null

    const match = content.match(/DADOS:\s*(\{[\s\S]*\})/)
    const replyText = (match ? content.slice(0, match.index) : content).trim()
    if (!replyText) return null

    let extracted: Partial<IntakeData> = {}
    if (match) {
      try {
        extracted = JSON.parse(match[1])
      } catch {
        extracted = {}
      }
    }

    return {
      company_name: extracted.company_name ?? null,
      contact_name: extracted.contact_name ?? null,
      service_interest: extracted.service_interest ?? null,
      email: extracted.email ?? null,
      reply: replyText,
    }
  } catch (err) {
    console.error('extractIntakeWithGroq failed', err)
    return null
  }
}

async function saveIntakeProgress(
  supabase: ReturnType<typeof createClient>,
  client: { id: string; workspace_id: string },
  memoryId: string,
  result: { done: boolean; data: IntakeData },
  instance: string | undefined,
) {
  if (!result.done) {
    await supabase
      .from('client_ai_memory')
      .update({ content: JSON.stringify(result.data) })
      .eq('id', memoryId)
    return
  }

  await supabase
    .from('client_ai_memory')
    .update({ title: '__lead_intake_done__', content: JSON.stringify(result.data) })
    .eq('id', memoryId)

  if (result.data.company_name) {
    await supabase.from('clients').update({ name: result.data.company_name }).eq('id', client.id)
  }

  await supabase
    .from('client_contacts')
    .update({
      name: result.data.contact_name ?? undefined,
      email:
        result.data.email && result.data.email !== 'não informado' ? result.data.email : undefined,
    })
    .eq('client_id', client.id)
    .eq('is_primary', true)

  await supabase.from('client_ai_memory').insert({
    workspace_id: client.workspace_id,
    client_id: client.id,
    category: 'BRIEFING',
    title: 'Lead qualificado via WhatsApp',
    content: `Empresa: ${result.data.company_name}\nContato: ${result.data.contact_name}\nInteresse: ${result.data.service_interest}\nE-mail: ${result.data.email ?? '-'}\nStatus: aguardando fechamento comercial (contrato/pagamento) antes de ativar.`,
    importance: 9,
    active: true,
  })

  const alertPhone = Deno.env.get('INTERNAL_ALERT_PHONE')
  if (alertPhone) {
    const text = `🟢 Novo lead qualificado via WhatsApp!\nEmpresa: ${result.data.company_name}\nContato: ${result.data.contact_name}\nInteresse: ${result.data.service_interest}\nE-mail: ${result.data.email ?? '-'}\n\nCadastrado como INATIVO no CRM — falta fechar contrato/pagamento pra ativar.`
    await sendEvolutionText(instance, alertPhone, text)
  }
}

function routeIntent(message: string) {
  for (const rule of INTENT_RULES) {
    if (rule.patterns.some((p) => p.test(message))) {
      return {
        department: rule.department,
        intent: rule.intent,
        needsHuman: rule.needsHuman ?? false,
      }
    }
  }
  return { department: 'general' as Department, intent: 'general_inquiry', needsHuman: false }
}

function inferSegment(memories: { title: string; content: string }[]) {
  const text = memories.map((m) => `${m.title} ${m.content}`).join(' ').toLowerCase()
  if (/oab|jurídic|advogad/.test(text)) return 'legal'
  if (/anvisa|estética|saúde|clínica/.test(text)) return 'health_aesthetics'
  if (/eleição|tse|candidat/.test(text)) return 'electoral'
  return 'general'
}

function needsHandoff(segment: string, text: string) {
  if (segment === 'legal' && LEGAL_PATTERNS.some((p) => p.test(text))) {
    return { handoff: true, reason: 'Aconselhamento jurídico específico — OAB' }
  }
  if (segment === 'health_aesthetics' && HEALTH_PATTERNS.some((p) => p.test(text))) {
    return { handoff: true, reason: 'Promessa de resultado em saúde/estética — ANVISA' }
  }
  if (segment === 'electoral' && ELECTORAL_PATTERNS.some((p) => p.test(text))) {
    return { handoff: true, reason: 'Conteúdo de propaganda eleitoral — TSE' }
  }
  return { handoff: false, reason: null }
}

function fallbackReply(clientName: string, department: Department, message: string) {
  if (department === 'general') {
    return `Olá! Sou o assistente da ${clientName} / TettoHub. Li sua mensagem e estou à disposição. Como posso ajudar: posts, gravação, edição ou tráfego?`
  }
  const who = DEPARTMENT_LABELS[department]
  return `Perfeito! Anotei seu pedido (“${message.slice(0, 80)}”). Vou direcionar para nossa equipe de ${who}, que cuida disso. Em breve alguém retorna por aqui.`
}

async function generateWithGroq(
  apiKey: string,
  ctx: {
    clientName: string
    message: string
    memories: { title: string; content: string; category: string }[]
    department: Department
    departmentLabel: string
  },
) {
  const memoryBlock = ctx.memories
    .slice(0, 5)
    .map((m) => `- [${m.category}] ${m.title}: ${m.content.slice(0, 220)}`)
    .join('\n')

  const system = `Você é o assistente de WhatsApp da agência TettoHub, atendendo o cliente "${ctx.clientName}".
Tom: humano, acolhedor, profissional, frases curtas (máx 4 frases).
Idioma: português do Brasil.
Nunca invente preços, prazos ou fatos que não estejam no contexto.
Se o pedido for operacional, confirme e diga que a equipe de ${ctx.departmentLabel} vai executar.
Se for dúvida geral, responda com o que souber do contexto.
Intenção classificada: ${ctx.department}.`

  const user = `Contexto do cliente:\n${memoryBlock || '(sem memória)'}\n\nMensagem do cliente:\n${ctx.message}`

  try {
    const res = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.5,
          max_tokens: 280,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      },
      15000,
    )

    const body = await res.json()
    const content = body?.choices?.[0]?.message?.content
    if (!content) {
      return fallbackReply(ctx.clientName, ctx.department, ctx.message)
    }
    return String(content).trim()
  } catch (err) {
    console.error('generateWithGroq failed', err)
    return fallbackReply(ctx.clientName, ctx.department, ctx.message)
  }
}

async function logHistory(
  supabase: ReturnType<typeof createClient>,
  client: { id: string; workspace_id: string; name: string },
  payload: Payload,
  reply: string,
  department: string,
  handoff: boolean,
  reason: string | null,
) {
  await supabase.from('client_ai_memory').insert({
    workspace_id: client.workspace_id,
    client_id: client.id,
    category: 'HISTORY',
    title: `WhatsApp agent ${new Date().toISOString()}`,
    content: `De: ${payload.contact_name ?? payload.phone}\nMsg: ${payload.message}\nDept: ${department}\nReply: ${reply}${handoff ? `\nHandoff: ${reason}` : ''}`,
    importance: 2,
    active: true,
  })
}

/**
 * Grava a thread real (conversations + conversation_messages) que alimenta o
 * Inbox da UI — separado do logHistory (client_ai_memory), que continua
 * alimentando só o contexto da IA. Acha-ou-cria a conversation por
 * client_id+channel+telefone e insere as duas mensagens do turno (inbound do
 * cliente, outbound da IA).
 */
async function logConversation(
  supabase: ReturnType<typeof createClient>,
  client: { id: string; workspace_id: string },
  payload: Payload,
  reply: string,
  handoffRequired: boolean,
) {
  try {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('client_id', client.id)
      .eq('channel', 'whatsapp')
      .eq('contact_phone', payload.phone)
      .maybeSingle()

    let conversationId = existing?.id as string | undefined

    if (conversationId) {
      await supabase
        .from('conversations')
        .update({
          contact_name: payload.contact_name ?? undefined,
          status: 'open',
          handoff_required: handoffRequired,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
    } else {
      const { data: created } = await supabase
        .from('conversations')
        .insert({
          workspace_id: client.workspace_id,
          client_id: client.id,
          channel: 'whatsapp',
          contact_phone: payload.phone,
          contact_name: payload.contact_name ?? null,
          status: 'open',
          handoff_required: handoffRequired,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      conversationId = created?.id
    }

    if (!conversationId) return

    await supabase.from('conversation_messages').insert([
      {
        workspace_id: client.workspace_id,
        conversation_id: conversationId,
        client_id: client.id,
        direction: 'inbound',
        content: payload.message,
        is_ai: false,
      },
      {
        workspace_id: client.workspace_id,
        conversation_id: conversationId,
        client_id: client.id,
        direction: 'outbound',
        content: reply,
        is_ai: true,
      },
    ])
  } catch (err) {
    // Falha ao logar a thread não pode derrubar a resposta ao cliente.
    console.error('logConversation failed', err)
  }
}

function evolutionConfig(instance: string | undefined) {
  const base = Deno.env.get('EVOLUTION_BASE_URL')
  const apiKey = Deno.env.get('EVOLUTION_API_KEY')
  const inst = instance || Deno.env.get('EVOLUTION_INSTANCE')
  if (!base || !apiKey || !inst) return null
  return { base, apiKey, inst }
}

async function sendEvolutionText(instance: string | undefined, phone: string, text: string) {
  const cfg = evolutionConfig(instance)
  if (!cfg) return
  try {
    await fetchWithTimeout(`${cfg.base}/message/sendText/${cfg.inst}`, {
      method: 'POST',
      headers: { apikey: cfg.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone, text }),
    })
  } catch (err) {
    console.error('sendEvolutionText failed', err)
  }
}

async function sendEvolutionPresence(
  instance: string | undefined,
  phone: string,
  presence: 'composing' | 'paused',
) {
  const cfg = evolutionConfig(instance)
  if (!cfg) return
  try {
    await fetchWithTimeout(`${cfg.base}/chat/sendPresence/${cfg.inst}`, {
      method: 'POST',
      headers: { apikey: cfg.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: phone,
        presence,
        delay: presence === 'composing' ? 4000 : 0,
      }),
    })
  } catch (err) {
    console.error('sendEvolutionPresence failed', err)
  }
}

async function sendInternalAlert(
  instance: string | undefined,
  clientName: string,
  department: Department,
  message: string,
) {
  const alertPhone = Deno.env.get('INTERNAL_ALERT_PHONE')
  if (!alertPhone) return
  const text = `🔔 Nova solicitação — ${clientName}\nDepartamento: ${DEPARTMENT_LABELS[department]}\nMensagem: ${message.slice(0, 200)}`
  await sendEvolutionText(instance, alertPhone, text)
}

async function transcribeAudio(instance: string | undefined, messageId: string): Promise<string | undefined> {
  const cfg = evolutionConfig(instance)
  const groqKey = Deno.env.get('GROQ_API_KEY')
  if (!cfg || !groqKey) return undefined

  try {
    const mediaRes = await fetchWithTimeout(`${cfg.base}/chat/getBase64FromMediaMessage/${cfg.inst}`, {
      method: 'POST',
      headers: { apikey: cfg.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { key: { id: messageId } } }),
    })
    const mediaBody = await mediaRes.json()
    const base64: string | undefined = mediaBody?.base64
    if (!base64) return undefined

    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const form = new FormData()
    form.append('file', new Blob([bytes], { type: 'audio/ogg' }), 'audio.ogg')
    form.append('model', 'whisper-large-v3')
    form.append('language', 'pt')

    const whisperRes = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}` },
        body: form,
      },
      15000,
    )
    const whisperBody = await whisperRes.json()
    return typeof whisperBody?.text === 'string' ? whisperBody.text : undefined
  } catch (err) {
    console.error('transcribeAudio failed', err)
    return undefined
  }
}
