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

// Grupos internos da TettoHub (equipe conversando entre si sobre produção —
// não são grupos de cliente). O agente NÃO deve avisar o dono sobre o que
// rola neles por padrão — só quando ele é @-marcado diretamente, ou quando a
// mensagem é urgente e só ele consegue resolver (ver handleGroupMessage).
const INTERNAL_GROUP_JIDS = new Set([
  '120363418951902198@g.us', // Designer Lilian- TettoHub
  '120363419492601496@g.us', // Edição de Vídeo - André
  '120363423751527399@g.us', // Tetto Hub - Estagiários
  '120363425335706554@g.us', // Edição de Vídeo - Marcos
])

// Grupo do cliente Vagner Filho — quando ele manda foto + nome de alguém
// nesse grupo, é sempre pedido de nota de pesar (ver
// handleVagnerFilhoNotaDePesar). Automação específica desse cliente, não é
// um padrão genérico ainda.
const VAGNER_FILHO_GROUP_JID = '120363422935780174@g.us'

// Modelo base no Canva pra nota de pesar (design comum, não é modelo de
// marca — a conta do cliente não é Enterprise, então não dá pra usar a API
// de autofill do Canva; a troca de nome/foto ainda é manual). Ver
// createCanvaNotaPesarCopy.
const CANVA_NOTA_PESAR_TEMPLATE_ID = 'DAHEfULV-PE'
const CANVA_NOTA_PESAR_TEMPLATE_LINK = 'https://canva.link/jnuapj6czise6lp'

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
  isGroup?: boolean
  groupJid?: string
  mentionedPhones?: string[]
  hasImage?: boolean
  imageMessageId?: string
}

type NormalizeResult =
  | { kind: 'payload'; payload: Payload }
  | { kind: 'from_me'; phone: string; message: string; messageId: string | undefined; isGroup: boolean }
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    if (normalized.kind === 'skip') {
      return json({ ok: true, skipped: true })
    }
    if (normalized.kind === 'invalid') {
      return json({ error: 'phone e message obrigatórios' }, 400)
    }
    if (normalized.kind === 'from_me') {
      // Mensagem que SAIU da conta da agência — só interessa se foi alguém
      // da equipe digitando de verdade no WhatsApp (não a Evolution nem o
      // Hermes). handlePossibleHumanReply distingue os dois casos.
      if (!normalized.isGroup) {
        await handlePossibleHumanReply(supabase, normalized.phone, normalized.message, normalized.messageId)
      }
      return json({ ok: true, from_me: true })
    }
    const payload = normalized.payload
    const instance = payload.instance || Deno.env.get('EVOLUTION_INSTANCE') || undefined

    const groqKey = Deno.env.get('GROQ_API_KEY')

    // Hermes: se o telefone é de um membro da equipe (users.whatsapp_phone),
    // desvia totalmente do fluxo de atendimento a cliente/lead abaixo.
    // Mensagem de grupo: não passa pelo Hermes nem pelo atendimento normal
    // (sem resposta automática dentro do grupo) — só monitora e avisa o
    // dono por WhatsApp quando quem mandou não é da própria equipe.
    if (payload.isGroup) {
      await handleGroupMessage(supabase, payload, instance)
      return json({ ok: true, group: true })
    }

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

    // Imagem sem nenhum texto junto (cliente mandou só a foto, sem legenda) —
    // não dá pra rotear por intenção nem gerar resposta com Groq sem
    // conteúdo. Confirma o recebimento de forma simples, pelo mesmo
    // mecanismo de delay/checagem de humano dos outros casos.
    if (payload.hasImage && !payload.message.trim()) {
      const ackReply = 'Recebemos sua imagem! 📷 Se quiser me contar mais sobre o que precisa, é só mandar uma mensagem.'
      const conversationId = await logConversation(supabase, client, payload, null, false)
      if (conversationId) {
        await scheduleDeferredReply(supabase, {
          workspaceId: client.workspace_id,
          conversationId,
          clientId: client.id,
          phone: payload.phone,
          instance,
          replyText: ackReply,
        })
      }
      await sendEvolutionPresence(instance, payload.phone, 'paused')
      return json({
        reply: ackReply,
        department: 'general',
        handoff: false,
        create_operation: false,
        client_id: client.id,
        client_name: client.name,
        deferred: true,
      })
    }

    // Lead ainda em qualificação (cliente criado pelo agente, INACTIVE, faltando
    // dados) — conversa de vendas + coleta de dados, fora do fluxo normal.
    const intakeMemory =
      client.status === 'INACTIVE' ? await getIntakeMemory(supabase, client.id) : null

    if (intakeMemory) {
      const withinHours = isBusinessHours(new Date())
      const result = withinHours
        ? await handleLeadIntake(groqKey, intakeMemory, payload.message)
        : { reply: OFF_HOURS_MESSAGE, done: false, data: intakeMemory.data }
      if (withinHours) {
        await saveIntakeProgress(supabase, client, intakeMemory.id, result, instance)
      }

      // Mesmo delay de 90s do fluxo normal — lead novo também merece a
      // chance da secretária/comercial responder pessoalmente antes da IA,
      // e isso vale INDEPENDENTE do horário comercial: a equipe às vezes
      // responde cliente fora do horário configurado (comprovado em dados
      // reais de produção), então mandar a mensagem de "estamos fechados"
      // na hora, sem checar, podia atropelar uma resposta humana real que
      // já estava rolando na mesma conversa.
      const conversationId = await logConversation(supabase, client, payload, null, false)
      if (conversationId) {
        await scheduleDeferredReply(supabase, {
          workspaceId: client.workspace_id,
          conversationId,
          clientId: client.id,
          phone: payload.phone,
          instance,
          replyText: result.reply,
        })
      }
      await sendEvolutionPresence(instance, payload.phone, 'paused')

      return json({
        reply: result.reply,
        department: 'commercial',
        handoff: false,
        create_operation: false,
        client_id: client.id,
        client_name: client.name,
        lead_intake: !result.done,
        deferred: true,
        within_hours: withinHours,
      })
    }

    const { data: memories } = await supabase
      .from('client_ai_memory')
      .select('title, content, category')
      .eq('client_id', client.id)
      .eq('active', true)
      .order('importance', { ascending: false })
      .limit(8)

    // Só cumprimenta ("bom dia" etc.) na primeira mensagem do dia — se a
    // conversa é continuação do mesmo dia, vai direto ao ponto sem saudação
    // nem repetir o nome do cliente.
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('last_message_at')
      .eq('client_id', client.id)
      .eq('channel', 'whatsapp')
      .eq('contact_phone', payload.phone)
      .maybeSingle()
    const greeting = greetingIfNewDay(existingConv?.last_message_at as string | null | undefined)

    const route = routeIntent(payload.message)
    const segment = inferSegment(memories ?? [])
    const compliance = needsHandoff(segment, payload.message)

    if (compliance.handoff) {
      const reply =
        'Recebi sua mensagem. Vou encaminhar para um especialista da equipe TettoHub continuar o atendimento, ok?'
      await logHistory(supabase, client, payload, reply, route.department, true, compliance.reason)
      const sentId = await sendEvolutionText(instance, payload.phone, reply)
      await logConversation(supabase, client, payload, reply, true, sentId)
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

    const withinHours = isBusinessHours(new Date())
    let reply: string
    if (!withinHours) {
      reply = OFF_HOURS_MESSAGE
    } else if (groqKey) {
      const knowledge = await searchKnowledgeForClientBot(supabase, client.workspace_id, payload.message)
      reply = await generateWithGroq(groqKey, {
        clientName: client.name,
        message: payload.message,
        memories: memories ?? [],
        knowledge,
        department: route.department,
        departmentLabel: DEPARTMENT_LABELS[route.department],
        greeting,
      })
    } else {
      reply = fallbackReply(client.name, route.department, payload.message, greeting)
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

    // A resposta da IA sempre fica engatilhada 90s antes de sair, dentro OU
    // fora do horário comercial — dá tempo de alguém da equipe responder o
    // cliente pessoalmente antes. Achado real em produção: a equipe às
    // vezes responde cliente fora do horário configurado, então mandar a
    // mensagem de "estamos fechados" na hora (sem checar) podia atropelar
    // uma resposta humana genuína que já estava rolando na mesma conversa.
    const conversationId = await logConversation(supabase, client, payload, null, route.needsHuman)
    if (conversationId) {
      await scheduleDeferredReply(supabase, {
        workspaceId: client.workspace_id,
        conversationId,
        clientId: client.id,
        phone: payload.phone,
        instance,
        replyText: reply,
      })
    }
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
      deferred: true,
      within_hours: withinHours,
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
    const key = data.key as { remoteJid?: string; fromMe?: boolean; id?: string; participant?: string }

    const remoteJid = key.remoteJid ?? ''
    const isGroup = remoteJid.endsWith('@g.us')
    // Em grupo, remoteJid é o JID do grupo — quem mandou de verdade é
    // key.participant. Grupo não passa pelo fluxo normal de atendimento
    // (sem resposta automática ali), só monitoramento pra avisar o dono.
    // Se fromMe=true (mensagem SAÍDA da conta da agência), remoteJid já é
    // quem RECEBEU — é exatamente o telefone que precisamos pra achar a
    // conversa, tanto faz o sentido.
    const senderJid = isGroup && !key.fromMe ? key.participant ?? '' : remoteJid
    const phone = senderJid.replace(/@.*/, '').replace(/\D/g, '')
    if (!phone) return { kind: 'skip' }

    const msg = (data.message ?? {}) as Record<string, unknown>
    const hasImage = !!msg.imageMessage
    let text =
      (msg.conversation as string | undefined) ??
      ((msg.extendedTextMessage as Record<string, unknown> | undefined)?.text as string | undefined) ??
      ((msg.imageMessage as Record<string, unknown> | undefined)?.caption as string | undefined) ??
      ((msg.videoMessage as Record<string, unknown> | undefined)?.caption as string | undefined)

    if (!text && (msg.audioMessage || msg.pttMessage) && key.id) {
      text = await transcribeAudio(body.instance as string | undefined, key.id)
    }

    // Imagem sem legenda é uma mensagem válida (grupo: ex. foto pra nota de
    // pesar; 1:1: operador mandando foto pra encaminhar, com a instrução
    // vindo numa mensagem separada logo depois — ver operator_pending_media
    // em handleHermesMessage). Só pula mesmo quando não tem nem texto nem
    // imagem (figurinha, reação, outros tipos não suportados).
    if (!text?.trim() && !hasImage) return { kind: 'skip' }

    if (key.fromMe) {
      // Mensagem SAÍDA da conta da agência — pode ser eco da nossa própria
      // resposta automática (bot/Hermes) OU alguém da equipe digitando de
      // verdade no WhatsApp. O handler principal decide qual é dos dois
      // usando o messageId (compara com o que a gente mesmo mandou).
      return {
        kind: 'from_me',
        phone,
        message: (text ?? '').trim(),
        messageId: key.id,
        isGroup,
      }
    }

    return {
      kind: 'payload',
      payload: {
        phone,
        message: (text ?? '').trim(),
        contact_name: data.pushName as string | undefined,
        instance: body.instance as string | undefined,
        isGroup,
        groupJid: isGroup ? remoteJid : undefined,
        hasImage,
        imageMessageId: hasImage ? key.id : undefined,
        mentionedPhones: isGroup ? extractMentionedPhones(msg) : undefined,
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
 * Extrai os telefones @-marcados numa mensagem de grupo (WhatsApp só manda
 * isso em extendedTextMessage/imageMessage/videoMessage.contextInfo.mentionedJid,
 * nunca em "conversation" simples). Retorna só dígitos, sem @s.whatsapp.net.
 */
function extractMentionedPhones(msg: Record<string, unknown>): string[] {
  const sources = [msg.extendedTextMessage, msg.imageMessage, msg.videoMessage] as Array<
    Record<string, unknown> | undefined
  >
  for (const src of sources) {
    const contextInfo = src?.contextInfo as Record<string, unknown> | undefined
    const mentioned = contextInfo?.mentionedJid as string[] | undefined
    if (Array.isArray(mentioned) && mentioned.length > 0) {
      return mentioned.map((jid) => jid.replace(/@.*/, '').replace(/\D/g, '')).filter(Boolean)
    }
  }
  return []
}

/** Minúsculo, sem acento, sem espaço duplicado — pra comparar nomes de forma tolerante. */
function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Distância de Levenshtein simples (sem libs) — número de edições pra ir de a até b. */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const prev = new Array(n + 1)
  const curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

/**
 * Compara um nome dito/transcrito (needle) contra um nome cadastrado
 * (candidate) de forma tolerante a erro de digitação/transcrição de áudio
 * (ex: "Carol" vs "Karol", "Carlos Jefferson" vs "Carlos Jeffeson") — antes
 * era só substring exata, e qualquer diferença de uma letra fazia o Hermes
 * dizer "não encontrei ninguém" mesmo com a pessoa certa cadastrada.
 * Estratégia: substring nos dois sentidos primeiro (caso comum, barato);
 * senão compara palavra a palavra com distância de edição pequena — pega
 * nome ou sobrenome parecido mesmo que o resto não bata exatamente.
 */
function fuzzyNameMatch(needle: string, candidate: string): boolean {
  const a = normalizeName(needle)
  const b = normalizeName(candidate)
  if (!a || !b) return false
  if (b.includes(a) || a.includes(b)) return true

  const wordsA = a.split(' ').filter((w) => w.length >= 3)
  const wordsB = b.split(' ').filter((w) => w.length >= 3)
  for (const wa of wordsA) {
    for (const wb of wordsB) {
      if (wa === wb || wa.includes(wb) || wb.includes(wa)) return true
      const maxDist = wa.length <= 4 || wb.length <= 4 ? 1 : 2
      if (levenshtein(wa, wb) <= maxDist) return true
    }
  }
  return false
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

/**
 * Chamado quando o webhook manda de volta um evento fromMe=true — a
 * mensagem SAIU da conta da agência, mas pode ser eco da nossa própria
 * resposta automática (bot ou Hermes) OU alguém da equipe respondendo de
 * verdade pelo WhatsApp (não pela CRM). Se for eco, reconhece pelo
 * messageId (a gente mesmo grava esse id ao enviar) e ignora. Se não for,
 * é resposta manual — registra como outbound humano na conversa do
 * cliente, pra o flush-pending-replies enxergar que já responderam e não
 * mandar a resposta da IA em cima.
 */
async function handlePossibleHumanReply(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  message: string,
  messageId: string | undefined,
) {
  try {
    if (messageId) {
      const { data: ownMessage } = await supabase
        .from('conversation_messages')
        .select('id')
        .eq('evolution_message_id', messageId)
        .maybeSingle()
      if (ownMessage) return // eco da nossa própria resposta, ignora
    }

    const client = await resolveClient(supabase, { phone, message: '' })
    if (!client) return // não é telefone de cliente conhecido

    const variants = phoneVariants(phone)
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('client_id', client.id as string)
      .eq('channel', 'whatsapp')
      .in('contact_phone', variants.length > 0 ? variants : [phone])
      .maybeSingle()
    if (!conversation) return // sem conversa existente ainda, não força criar uma

    await supabase.from('conversation_messages').insert({
      workspace_id: client.workspace_id as string,
      conversation_id: conversation.id as string,
      client_id: client.id as string,
      direction: 'outbound',
      content: message,
      is_ai: false,
    })
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', conversation.id as string)
  } catch (err) {
    console.error('handlePossibleHumanReply failed', err)
  }
}

/**
 * Monitoramento de grupo de WhatsApp: nunca responde dentro do grupo (o
 * cliente não deve ver a IA falando ali), só avisa o dono da agência por
 * WhatsApp direto quando alguém que não é da equipe manda mensagem —
 * junto com uma avaliação curta de urgência (via Groq, se configurado) pra
 * ele decidir se responde ou resolve.
 *
 * Exceção: grupos INTERNOS da TettoHub (equipe conversando sobre produção
 * entre si, ver INTERNAL_GROUP_JIDS) não geram aviso por padrão — só quando
 * o dono é @-marcado diretamente, ou quando a mensagem é urgente E só ele
 * consegue resolver (ver assessInternalGroupUrgency).
 */
async function handleGroupMessage(
  supabase: ReturnType<typeof createClient>,
  payload: Payload,
  instance: string | undefined,
) {
  try {
    // Se quem mandou é da própria equipe, não precisa avisar — a pessoa já
    // está no grupo e sabe o que escreveu.
    const operator = await resolveOperator(supabase, payload.phone)
    if (operator) return

    // Grupo do Vagner Filho + foto com nome junto = pedido de nota de pesar.
    // Trata automaticamente (cria tarefa + avisa o designer) em vez de só
    // avisar o dono como os outros grupos de cliente.
    if (payload.groupJid === VAGNER_FILHO_GROUP_JID && payload.hasImage && payload.message.trim()) {
      const handled = await handleVagnerFilhoNotaDePesar(supabase, payload, instance)
      if (handled) return
    }

    const ownerPhone = await getOwnerWhatsappPhone(supabase)
    if (!ownerPhone) return

    const client = await resolveClient(supabase, payload)
    const senderLabel = client?.name ?? payload.contact_name ?? payload.phone

    const isInternalGroup = !!payload.groupJid && INTERNAL_GROUP_JIDS.has(payload.groupJid)
    const ownerMentioned = isOwnerMentioned(ownerPhone, payload.mentionedPhones)
    console.log(
      `[handleGroupMessage] group=${payload.groupJid} internal=${isInternalGroup} ownerMentioned=${ownerMentioned}`,
    )

    const groqKey = Deno.env.get('GROQ_API_KEY')

    if (isInternalGroup && !ownerMentioned) {
      // Grupo interno, dono não foi marcado: só avisa se for algo urgente
      // que só ele consegue resolver — chatter normal de produção fica de
      // fora, o dono não precisa saber de cada atualização de edição/design.
      if (!groqKey) return
      const verdict = await assessInternalGroupUrgency(groqKey, payload.message)
      console.log(`[handleGroupMessage] internal urgency verdict: notify=${verdict.shouldNotify} reason=${verdict.reason}`)
      if (!verdict.shouldNotify) return

      const text = `🔴 Grupo interno "${senderLabel !== payload.phone ? senderLabel : 'equipe'}" — precisa de você:\n"${payload.message.slice(0, 300)}"\n\n${verdict.reason}`
      await sendEvolutionText(instance, ownerPhone, text)
      return
    }

    const assessment = groqKey ? await assessGroupMessageUrgency(groqKey, payload.message) : ''
    const prefix = isInternalGroup && ownerMentioned ? '📌 Você foi marcado num grupo interno' : '📢 Mensagem em grupo'

    const text = `${prefix} — ${senderLabel}:\n"${payload.message.slice(0, 300)}"${
      assessment ? `\n\n${assessment}` : ''
    }`
    await sendEvolutionText(instance, ownerPhone, text)

    if (client) {
      await supabase.from('client_ai_memory').insert({
        workspace_id: client.workspace_id,
        client_id: client.id,
        category: 'HISTORY',
        title: `Mensagem em grupo ${new Date().toISOString()}`,
        content: `De: ${senderLabel}\nMsg: ${payload.message}`,
        importance: 3,
        active: true,
      })
    }
  } catch (err) {
    console.error('handleGroupMessage failed', err)
  }
}

/** Confere se o telefone do dono está entre os @-marcados na mensagem (tolerante ao 9º dígito). */
function isOwnerMentioned(ownerPhone: string, mentionedPhones: string[] | undefined): boolean {
  if (!mentionedPhones || mentionedPhones.length === 0) return false
  const ownerVariants = new Set(phoneVariants(ownerPhone))
  return mentionedPhones.some((p) => ownerVariants.has(p))
}

async function getOwnerWhatsappPhone(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('whatsapp_phone')
    .eq('id', OWNER_RESTRICTED_USER_ID)
    .maybeSingle()
  return (data?.whatsapp_phone as string | undefined) ?? null
}

/**
 * Pedido de nota de pesar do cliente Vagner Filho: ele manda a foto + nome
 * da pessoa no grupo, e alguém da equipe (design) precisa criar a arte no
 * Canva a partir do modelo-base e postar no Stories.
 *
 * O que essa função automatiza hoje: cria a tarefa no CRM (com o nome e o
 * aviso pra conferir a foto no grupo) e avisa quem for responsável por
 * WhatsApp. Retorna true se conseguiu tratar (pra handleGroupMessage não
 * cair também no aviso genérico de "mensagem em grupo" pro dono).
 *
 * A geração automática da cópia no Canva (createCanvaNotaPesarCopy) só
 * funciona quando as credenciais da integração Canva estiverem
 * configuradas — até lá, a tarefa aponta pro link do modelo-base pra
 * duplicar manualmente.
 */
async function handleVagnerFilhoNotaDePesar(
  supabase: ReturnType<typeof createClient>,
  payload: Payload,
  instance: string | undefined,
): Promise<boolean> {
  try {
    const workspaceId = await getDefaultWorkspaceId(supabase)
    if (!workspaceId) return false

    const personName = payload.message.trim().slice(0, 200)

    const canvaCopy = await createCanvaNotaPesarCopy(personName)

    const description = canvaCopy
      ? `Cliente: Vagner Filho (grupo Marketing ADV Vagner Filho).\nNome: ${personName}\nCópia já criada no Canva: ${canvaCopy.url}\nFoto: confira a imagem mandada no grupo.\nTroque nome/foto no Canva e publique no Stories.`
      : `Cliente: Vagner Filho (grupo Marketing ADV Vagner Filho).\nNome: ${personName}\nFoto: confira a imagem mandada no grupo.\nModelo-base pra duplicar manualmente: ${CANVA_NOTA_PESAR_TEMPLATE_LINK}\n(Cópia automática no Canva ainda não configurada.)`

    const assigneeId = await resolveDepartmentAssignee(supabase, workspaceId, 'design')

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        title: `[Nota de Pesar] ${personName}`,
        description,
        priority: 'HIGH',
        assignee_id: assigneeId,
        created_by: null,
      })
      .select('id, title')
      .maybeSingle()

    if (error) {
      console.error('handleVagnerFilhoNotaDePesar: falha ao criar tarefa', error)
      return false
    }

    if (assigneeId) {
      const { data: assigneeUser } = await supabase
        .from('users')
        .select('whatsapp_phone')
        .eq('id', assigneeId)
        .maybeSingle()
      const assigneePhone = assigneeUser?.whatsapp_phone as string | undefined
      if (assigneePhone) {
        const notifyText = canvaCopy
          ? `📋 Nova nota de pesar — ${personName}\nJá criei a cópia no Canva: ${canvaCopy.url}\nSó falta trocar nome/foto e postar no Stories. Foto tá no grupo do Vagner Filho.`
          : `📋 Nova nota de pesar — ${personName}\nUse o modelo: ${CANVA_NOTA_PESAR_TEMPLATE_LINK}\nFoto tá no grupo do Vagner Filho.`
        await sendEvolutionText(instance, assigneePhone, notifyText)
      }
    }

    console.log(`[handleVagnerFilhoNotaDePesar] tarefa criada: ${task?.id} — ${task?.title}`)
    return true
  } catch (err) {
    console.error('handleVagnerFilhoNotaDePesar failed', err)
    return false
  }
}

/**
 * Cria uma cópia renomeada do modelo-base de nota de pesar via Canva Connect
 * API. Requer CANVA_CLIENT_ID/CANVA_CLIENT_SECRET/CANVA_REFRESH_TOKEN
 * configurados (integração OAuth ainda não configurada em produção — ver
 * conversa sobre a integração do Canva). Retorna null (sem erro) quando as
 * credenciais não estão presentes, pra não travar a criação da tarefa.
 *
 * NÃO troca nome/foto dentro do design automaticamente — isso exige a API
 * de autofill do Canva, que só funciona em contas Enterprise. Só cria a
 * cópia já renomeada, pronta pra edição manual.
 */
async function createCanvaNotaPesarCopy(personName: string): Promise<{ id: string; url: string } | null> {
  const clientId = Deno.env.get('CANVA_CLIENT_ID')
  const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET')
  const refreshToken = Deno.env.get('CANVA_REFRESH_TOKEN')
  if (!clientId || !clientSecret || !refreshToken) return null

  try {
    const tokenRes = await fetchWithTimeout(
      'https://api.canva.com/rest/v1/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      },
      10000,
    )
    const tokenBody = await tokenRes.json()
    const accessToken = tokenBody?.access_token
    if (!accessToken) {
      console.error('createCanvaNotaPesarCopy: falha ao renovar token', tokenBody)
      return null
    }

    const designRes = await fetchWithTimeout(
      'https://api.canva.com/rest/v1/designs',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'design',
          design_id: CANVA_NOTA_PESAR_TEMPLATE_ID,
          title: `Vagner Filho - Nota de Pesar - ${personName}`.slice(0, 255),
        }),
      },
      10000,
    )
    const designBody = await designRes.json()
    const id = designBody?.design?.id
    const url = designBody?.design?.urls?.edit_url
    if (!id || !url) {
      console.error('createCanvaNotaPesarCopy: resposta inesperada', designBody)
      return null
    }
    return { id, url }
  } catch (err) {
    console.error('createCanvaNotaPesarCopy failed', err)
    return null
  }
}

/**
 * Classificador mais rígido pros 4 grupos internos da TettoHub (equipe de
 * produção). A régua não é "isso é importante?" — quase toda mensagem de
 * trabalho é — é "só o DONO da empresa consegue resolver isso, e é urgente?"
 * (ex: cliente ameaçando cancelar, decisão financeira/contratual, conflito
 * sério entre a equipe, prazo crítico batendo). Atualização de progresso,
 * dúvida técnica entre a equipe, ou aviso rotineiro não deve notificar.
 */
async function assessInternalGroupUrgency(
  apiKey: string,
  message: string,
): Promise<{ shouldNotify: boolean; reason: string }> {
  try {
    const res = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 80,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Você filtra mensagens de um grupo INTERNO de produção da agência TettoHub (equipe conversando entre si — design, edição de vídeo, estagiários) pra decidir se o DONO da empresa precisa ser interrompido. ' +
                'A régua é rígida: só notifique se for urgente E for algo que só o dono consegue resolver — ex: cliente insatisfeito/ameaçando cancelar, decisão financeira ou contratual, conflito sério entre a equipe, prazo crítico estourando sem solução, pedido de demissão. ' +
                'NÃO notifique para: atualização de progresso de trabalho, dúvida técnica entre a equipe, aviso rotineiro, arquivo/link compartilhado, combinados de horário, conversa social. ' +
                'Responda em JSON: {"notify": true|false, "reason": "frase curta em português explicando por quê"}.',
            },
            { role: 'user', content: message },
          ],
        }),
      },
      8000,
    )
    const body = await res.json()
    const content = (body?.choices?.[0]?.message?.content as string | undefined) ?? '{}'
    const parsed = JSON.parse(content) as { notify?: boolean; reason?: string }
    return { shouldNotify: !!parsed.notify, reason: parsed.reason ?? '' }
  } catch (err) {
    console.error('assessInternalGroupUrgency failed', err)
    return { shouldNotify: false, reason: '' }
  }
}

async function assessGroupMessageUrgency(apiKey: string, message: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          max_tokens: 60,
          messages: [
            {
              role: 'system',
              content:
                'Classifique a urgência dessa mensagem de cliente em UMA frase curta e direta, em português, começando com 🔴 (urgente/reclamação), 🟡 (merece atenção) ou 🟢 (informativo/sem urgência). Sem explicações longas, só a frase.',
            },
            { role: 'user', content: message },
          ],
        }),
      },
      8000,
    )
    const body = await res.json()
    return ((body?.choices?.[0]?.message?.content as string | undefined) ?? '').trim()
  } catch (err) {
    console.error('assessGroupMessageUrgency failed', err)
    return ''
  }
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
  'create_client',
  'update_client',
  'create_task',
  'update_task_status',
  'assign_task',
  'create_operation',
  'update_operation_status',
  'add_operation_comment',
  'delete_client',
])

// send_message fica FORA de HERMES_WRITE_TOOLS de propósito — a pedido do
// dono, deixou de exigir confirmação sim/não e executa na hora (continua
// owner-only via OWNER_ONLY_TOOLS abaixo, então só ele consegue acionar).
const HERMES_IMMEDIATE_WRITE_TOOLS = new Set(['send_message'])

// Ações restritas: só essa conta (o dono da TettoHub) pode acioná-las, mesmo
// entre operadores cadastrados. delete_client é DELETE definitivo (fica
// staged, com confirmação); send_message manda mensagem em nome da agência
// pelo número oficial pra qualquer funcionário ou cliente — nenhum dos dois
// pode ficar na mão de quem não é o dono (reportado em uso: outro operador
// pediu e o Hermes mandou mensagem pro dono sem autorização).
const OWNER_RESTRICTED_USER_ID = '529a59e0-f2c6-45a3-bee9-9eaf7f6d1083'
const OWNER_ONLY_TOOLS = new Set(['delete_client', 'send_message'])

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
const JOB_ROLES = ['gerente', 'gestor', 'social_media', 'design', 'videomaker', 'photographer', 'video_editor', 'traffic']

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
    name: 'search_team',
    description:
      'LEITURA. Busca membros da equipe da TettoHub pelo nome (ou parte dele) — retorna nome, cargo, função/departamento e se tem WhatsApp cadastrado. Use SEMPRE antes de dizer "não encontrei" alguém da equipe, e antes de qualquer ferramenta que precise de um responsável (send_message, assign_task, create_task).',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nome ou parte do nome da pessoa a buscar.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_knowledge',
    description:
      'LEITURA. Busca na base de conhecimento da agência (políticas internas, preços, procedimentos, scripts, perguntas frequentes). Use ANTES de responder qualquer pergunta sobre "como fazemos X", preço, prazo padrão, política ou processo interno — não invente essas respostas de memória nem do histórico da conversa, procure na base primeiro. Se não achar nada relevante, diga que não tem essa informação registrada em vez de supor.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo ou pergunta a buscar na base de conhecimento.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_client',
    description:
      'ESCRITA. Cadastra um cliente novo no CRM. Use sempre que pedirem pra "cadastrar", "adicionar" ou "criar" um cliente/lead novo. Preencha o máximo de informação possível: se vier link de Instagram, WhatsApp, endereço, link de localização, etc., coloque tudo em "notes" de forma organizada (não perca nenhum dado que a pessoa mandou, mesmo que não caiba em um campo específico).',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome do cliente/empresa.' },
        status: {
          type: 'string',
          enum: CLIENT_STATUSES,
          description: 'Padrão: ACTIVE (cliente fechado). Use INACTIVE só se for um lead ainda não fechado.',
        },
        segment: { type: 'string', description: 'Segmento/ramo de atuação, se souber.' },
        city: { type: 'string' },
        state: { type: 'string' },
        origin: { type: 'string', description: 'De onde veio o cliente (indicação, Instagram, etc.).' },
        notes: {
          type: 'string',
          description:
            'Observações livres — endereço, links (Instagram, Google Maps), e qualquer outra informação relevante mandada junto.',
        },
        contact_name: { type: 'string', description: 'Nome da pessoa de contato, se for diferente do nome do cliente.' },
        contact_phone: { type: 'string', description: 'WhatsApp/telefone de contato do cliente, com DDI se possível.' },
        contact_email: { type: 'string' },
      },
      required: ['name'],
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
    description:
      'ESCRITA. Cria uma tarefa no quadro de Tarefas do workspace. Se souber o responsável, use assignee_id/assignee_name; se só souber o TIPO de serviço (ex: criar arte pra post, gravação, edição de vídeo), use department — o sistema escolhe automaticamente alguém da equipe com essa função. Ex: arte/post → design; gravação → videomaker (mencione no description se precisa de apoio do social media); edição → video_editor; tráfego pago → traffic.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título da tarefa.' },
        description: { type: 'string' },
        priority: { type: 'string', enum: PRIORITIES, description: 'Padrão: MEDIUM.' },
        operation_id: { type: 'string', description: 'UUID da operação relacionada, se houver.' },
        assignee_id: { type: 'string', description: 'UUID do responsável, se já souber.' },
        assignee_name: { type: 'string', description: 'Nome do responsável, se não souber o UUID.' },
        department: {
          type: 'string',
          enum: JOB_ROLES,
          description:
            'Função/departamento responsável pelo serviço, quando não se sabe quem especificamente (o sistema escolhe alguém da equipe com essa função). Ignorado se assignee_id/assignee_name forem informados.',
        },
        due_date: { type: 'string', description: 'Data de vencimento no formato YYYY-MM-DD.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'send_message',
    description:
      'ESCRITA — AÇÃO RESTRITA. Envia uma mensagem de WhatsApp em nome da agência (pelo número oficial) pra um funcionário da equipe, pra um cliente, ou pra um número direto. Informe exatamente UM entre to_team_member_name, to_client_name ou to_phone. Se a mensagem que a pessoa te mandou (com o pedido de envio) veio com uma imagem anexada, essa imagem é encaminhada automaticamente junto do texto — não precisa fazer nada especial pra isso, só chame a ferramenta normalmente. Só o dono da agência pode aprovar essa ação; se qualquer outra pessoa pedir, recuse educadamente e diga que só o dono pode autorizar isso.',
    input_schema: {
      type: 'object',
      properties: {
        to_team_member_name: { type: 'string', description: 'Nome do funcionário/membro da equipe.' },
        to_client_name: { type: 'string', description: 'Nome do cliente (usa o contato principal cadastrado).' },
        to_phone: { type: 'string', description: 'Número direto (com DDI), se não for time nem cliente cadastrado.' },
        message: {
          type: 'string',
          description:
            'Texto da mensagem a enviar. Se a mensagem original tinha uma imagem anexada, use aqui a legenda/texto que deve acompanhar a imagem.',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'delete_client',
    description:
      'ESCRITA — AÇÃO RESTRITA E IRREVERSÍVEL. Apaga um ou MAIS clientes definitivamente (dados cadastrais, contatos, memórias, operações, tarefas ligadas, conversas, financeiro — tudo). Se o pedido envolver vários clientes de uma vez ("apaga esses 3 clientes de teste"), liste todos em UMA ÚNICA chamada (array "clients") — não chame essa ferramenta várias vezes na mesma resposta, e não pergunte confirmação você mesmo em texto: chame a ferramenta e o sistema cuida de pedir confirmação. Só o dono da agência pode aprovar essa ação; se qualquer outra pessoa pedir, recuse educadamente e diga que só o dono pode autorizar isso.',
    input_schema: {
      type: 'object',
      properties: {
        clients: {
          type: 'array',
          description: 'Lista de um ou mais clientes a excluir.',
          items: {
            type: 'object',
            properties: {
              client_id: { type: 'string', description: 'UUID do cliente, se já souber.' },
              client_name: { type: 'string', description: 'Nome do cliente, se não souber o UUID.' },
            },
          },
        },
      },
      required: ['clients'],
    },
  },
  {
    name: 'check_messages',
    description:
      'LEITURA. Lista as conversas de clientes no WhatsApp mais recentes (padrão: últimas 24h), mostrando quem mandou mensagem, a última mensagem e se precisa de atenção humana (handoff). Use quando o dono/gestor perguntar algo como "quem mandou mensagem hoje" ou "tem algo importante pra eu ver".',
    input_schema: {
      type: 'object',
      properties: {
        hours: { type: 'number', description: 'Janela de tempo em horas pra olhar pra trás. Padrão: 24.' },
        only_important: {
          type: 'boolean',
          description: 'Se true, retorna só conversas marcadas como precisando de atenção humana. Padrão: false.',
        },
      },
      required: [],
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

  return `Você é o Tettolino, assistente operacional interno da TettoHub, conversando por WhatsApp com um membro da equipe (não é cliente).

${hierarchyBlock}

Seu papel: ajudar a equipe a consultar e atualizar o CRM (clientes, tarefas, operações) por comando no WhatsApp.

Você tem memória das últimas mensagens dessa conversa (aparecem no histórico abaixo) — use esse contexto pra entender pedidos que fazem referência a algo dito antes ("aquele cliente", "a tarefa que criei"), sem precisar que a pessoa repita tudo.

Regras:
1. Para qualquer pedido envolvendo um cliente específico, use search_clients primeiro se você não tiver o client_id — nunca invente um ID. Antes de usar create_client, sempre rode search_clients pelo nome primeiro: se já existir algo parecido, use update_client nesse cliente em vez de criar outro (o sistema também bloqueia duplicata por telefone/nome como segurança extra, mas não confie só nisso). Da mesma forma, se perguntarem sobre uma PESSOA e não estiver claro se é cliente ou equipe, use search_team primeiro (ou os dois, search_clients e search_team) antes de dizer "não encontrei" — nunca responda que não achou alguém sem ter buscado.
2. Ferramentas de LEITURA (search_clients, get_client_summary, search_team, search_knowledge, check_messages) você pode chamar livremente para reunir contexto.
3. Ferramentas de ESCRITA (create_client, update_client, create_task, update_task_status, assign_task, create_operation, update_operation_status, add_operation_comment, delete_client) NUNCA são executadas na hora — ao chamar uma delas, o sistema registra a ação como pendente e te avisa. NUNCA pergunte "confirma?" em texto solto por conta própria, sem ter chamado a ferramenta — isso não registra nada e trava o fluxo. O jeito certo é: chame a ferramenta primeiro; o tool_result vai te avisar que está pendente; SÓ AÍ você escreve a pergunta de confirmação pro usuário, em uma frase, descrevendo o que vai mudar e terminando com algo como "Confirma? Responda *sim* ou *não*."
3b. send_message é DIFERENTE de todas as outras ferramentas de escrita e NÃO segue a regra 3: chame a ferramenta send_message IMEDIATAMENTE, na mesma resposta em que decidir enviar, sem perguntar "confirma?" antes nem depois. NUNCA pergunte "Confirma? Responda sim ou não" pra send_message — mesmo que o histórico da conversa abaixo mostre você tendo perguntado isso antes, esse comportamento mudou: agora é sempre direto, sem exceção. IMPORTANTE: "sent: true" no resultado só significa que a ferramenta rodou sem erro — NÃO significa que a mensagem chegou de verdade no WhatsApp da pessoa. Olhe sempre o campo "delivered": se vier true, aí sim confirme em uma frase curta ("Pronto! Mandei pra fulano."); se vier **false**, a Evolution API não confirmou a entrega (motivo comum: número sem DDI ou inválido) — avise claramente que a mensagem PODE NÃO TER CHEGADO e peça pra conferir o número. Nunca diga "Pronto! Mandei" quando "delivered" for false. Imagens são encaminhadas automaticamente quando existem — tanto se a mensagem atual veio com foto+legenda, quanto se a pessoa mandou foto(s) sem legenda ANTES e só agora te disse pra quem mandar (você não precisa fazer nada especial pra isso, o sistema já junta sozinho — nunca diga "não recebi imagem" sem antes tentar chamar send_message, porque a imagem pode ter chegado numa mensagem anterior). Olhe também "image_forwarded"/"images_forwarded_count": se vier true, diga que mandou a(s) imagem(ns); se vier "image_forward_failed": true, avise que a imagem falhou.
4. Chame no máximo UMA ferramenta de escrita por mensagem do usuário. Se o pedido envolve vários itens da MESMA ação (ex: apagar vários clientes de uma vez), isso ainda conta como uma chamada só — use uma ferramenta que aceite lista (como delete_client) em vez de chamar várias vezes.
5. Respostas curtas e diretas — 1 a 3 frases, no máximo. Nada de parágrafo explicando contexto óbvio ou listando tudo que você fez passo a passo. Está no WhatsApp, não é um relatório. Só entra em mais detalhe se o usuário pedir explicitamente.
6. Se não entender o pedido ou faltar informação (ex: qual cliente, qual tarefa), pergunte antes de agir — em uma frase curta.
7. Quando o usuário pedir um serviço (arte pra post, gravação, edição, tráfego) sem dizer quem deve fazer, use create_task com "department" em vez de perguntar quem é o responsável — a agência já tem gente fixa pra cada função.
8. search_knowledge é a sua base de memória e raciocínio — não só pra política/preço/procedimento: chame ela SEMPRE que a pergunta não for resolvida diretamente por search_clients/search_team/get_client_summary/check_messages, antes de responder e antes de dizer "não sei" ou "não tenho essa informação". Só responda com o que vier da busca (ou do CRM); se não achar nada em nenhuma das duas, diga claramente que não tem isso registrado em vez de inventar ou usar conhecimento genérico.
9. Se a mensagem for claramente um RECADO pra outra pessoa da equipe (nomeia alguém como quem vai fazer/receber aquilo — ex: termina com o nome de alguém, ou diz "isso é pra fulano", "avisa fulano", "manda isso pro fulano ver") e não for um pedido direto pra você agir, NÃO tente encaixar numa ferramenta nem pergunte "confirma?" — é conversa/anotação que o usuário está organizando, não uma ordem pra você executar. Só reconheça em uma frase curta (ex: "Beleza, deixo anotado que é pra Eduarda.") e não chame nenhuma ferramenta. Se não for óbvio se é recado ou pedido de ação, pergunte antes de agir (regra 6).`
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

// Converte o histórico de mensagens no formato Anthropic (o formato "canônico"
// usado internamente por runHermesAgentLoop, com blocks type:'text'/'tool_use'/
// 'tool_result') pro formato OpenAI-compatible que a Groq espera (tool_calls no
// assistant, uma mensagem role:'tool' por resultado). Existe só pra alimentar
// callGroqAgentMessages — o estado interno do loop nunca muda de formato.
function anthropicMessagesToOpenAI(
  system: string,
  messages: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [{ role: 'system', content: system }]
  for (const msg of messages) {
    const role = msg.role as string
    const content = msg.content
    if (typeof content === 'string') {
      out.push({ role, content })
      continue
    }
    if (!Array.isArray(content)) {
      out.push({ role, content: String(content ?? '') })
      continue
    }
    if (role === 'assistant') {
      const textBlock = content.find((b) => (b as Record<string, unknown>).type === 'text') as
        | { text: string }
        | undefined
      const toolUseBlocks = content.filter((b) => (b as Record<string, unknown>).type === 'tool_use') as Array<{
        id: string
        name: string
        input: Record<string, unknown>
      }>
      const assistantMsg: Record<string, unknown> = { role: 'assistant', content: textBlock?.text ?? null }
      if (toolUseBlocks.length > 0) {
        assistantMsg.tool_calls = toolUseBlocks.map((b) => ({
          id: b.id,
          type: 'function',
          function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
        }))
      }
      out.push(assistantMsg)
    } else {
      // role 'user' com blocks tool_result — cada um vira uma mensagem role:'tool'.
      const toolResults = content.filter((b) => (b as Record<string, unknown>).type === 'tool_result') as Array<{
        tool_use_id: string
        content: string
        is_error?: boolean
      }>
      for (const tr of toolResults) {
        out.push({
          role: 'tool',
          tool_call_id: tr.tool_use_id,
          content: typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content),
        })
      }
      const otherText = content
        .filter((b) => (b as Record<string, unknown>).type === 'text')
        .map((b) => (b as { text: string }).text)
        .join('\n')
      if (otherText) out.push({ role: 'user', content: otherText })
    }
  }
  return out
}

function anthropicToolsToOpenAI(tools: unknown[]): Array<Record<string, unknown>> {
  return (tools as Array<{ name: string; description: string; input_schema: unknown }>).map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }))
}

/**
 * Cérebro principal do Tettolino, rodando em cima da Groq (llama-3.3-70b-versatile)
 * em vez do Claude — trocado porque a conta Anthropic ficou sem crédito (ver
 * LES-0016) e o dono pediu explicitamente pra rodar em cima de um modelo que já
 * tem infra própria funcionando (a Groq já é usada pra outras coisas no projeto).
 * Devolve o MESMO formato de callClaudeMessages (stop_reason + content blocks
 * estilo Anthropic) pra runHermesAgentLoop não precisar saber qual provedor
 * respondeu.
 */
async function callGroqAgentMessages(
  apiKey: string,
  system: string,
  tools: unknown[],
  messages: unknown[],
): Promise<{ stop_reason: string; content: Array<Record<string, unknown>> }> {
  const res = await fetchWithTimeout(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        temperature: 0.2,
        messages: anthropicMessagesToOpenAI(system, messages as Array<Record<string, unknown>>),
        tools: anthropicToolsToOpenAI(tools),
        tool_choice: 'auto',
      }),
    },
    15000,
  )
  const body = await res.json()
  if (!res.ok) {
    console.error('Groq agent API error', body)
    throw new Error(body?.error?.message || `Groq API error ${res.status}`)
  }
  const message = body?.choices?.[0]?.message ?? {}
  const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : []
  const content: Array<Record<string, unknown>> = []
  if (typeof message.content === 'string' && message.content.trim()) {
    content.push({ type: 'text', text: message.content })
  }
  for (const tc of toolCalls) {
    let input: Record<string, unknown> = {}
    try {
      input = JSON.parse(tc?.function?.arguments || '{}')
    } catch {
      input = {}
    }
    content.push({ type: 'tool_use', id: tc.id, name: tc?.function?.name, input })
  }
  return { stop_reason: toolCalls.length > 0 ? 'tool_use' : 'end_turn', content }
}

/**
 * Ponto único de escolha do cérebro do Tettolino: Groq primeiro (rápida, com
 * camada gratuita, é o padrão atual), Claude como fallback só se a Groq falhar
 * E existir chave da Anthropic configurada. Se nenhuma chave existir, ou se
 * ambas falharem, propaga o erro (runHermesAgentLoop deixa o catch de
 * handleHermesMessage virar a resposta genérica de erro pro usuário).
 */
async function callAgentBrain(
  keys: { groqKey?: string; anthropicKey?: string },
  system: string,
  tools: unknown[],
  messages: unknown[],
): Promise<{ stop_reason: string; content: Array<Record<string, unknown>> }> {
  if (keys.groqKey) {
    try {
      return await callGroqAgentMessages(keys.groqKey, system, tools, messages)
    } catch (err) {
      console.error('callGroqAgentMessages falhou, tentando fallback', err)
      if (!keys.anthropicKey) throw err
    }
  }
  if (keys.anthropicKey) {
    return await callClaudeMessages(keys.anthropicKey, system, tools, messages)
  }
  throw new Error('Nenhuma chave de IA configurada (GROQ_API_KEY / ANTHROPIC_API_KEY).')
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
  fields: { status: 'confirmed' | 'rejected' | 'executed' | 'failed' | 'superseded'; result?: unknown; error?: string },
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
  excludeArchived = false,
): Promise<{ id: string } | { error: string }> {
  if (input.client_id) return { id: input.client_id }
  if (input.client_name) {
    let query = supabase
      .from('clients')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .ilike('name', `%${input.client_name}%`)
    if (excludeArchived) query = query.neq('status', 'ARCHIVED')
    const { data } = await query.limit(2)
    if (data && data.length === 1) return { id: data[0].id as string }
    if (data && data.length > 1) {
      return {
        error: `Mais de um cliente encontrado com o nome "${input.client_name}" — use search_clients e informe o client_id.`,
      }
    }

    // ILIKE (substring exata) não achou nada — tenta de novo tolerando erro
    // de digitação/transcrição de áudio (ex: nome com uma letra diferente).
    let allQuery = supabase.from('clients').select('id, name').eq('workspace_id', workspaceId)
    if (excludeArchived) allQuery = allQuery.neq('status', 'ARCHIVED')
    const { data: allClients } = await allQuery
    const fuzzy = (allClients ?? []).filter((c) => fuzzyNameMatch(input.client_name!, c.name as string))
    if (fuzzy.length === 1) return { id: fuzzy[0].id as string }
    if (fuzzy.length > 1) {
      return {
        error: `Mais de um cliente parecido com o nome "${input.client_name}" — use search_clients e informe o client_id.`,
      }
    }
    return { error: `Nenhum cliente encontrado com o nome "${input.client_name}".` }
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
    const matches = (memberships ?? []).filter((m) => {
      const u = m.users as unknown as { name: string } | null
      return u?.name ? fuzzyNameMatch(input.assignee_name!, u.name) : false
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

  if (toolName === 'search_team') {
    const query = String(input.query ?? '').trim()
    if (!query) return { error: 'query vazia' }
    const { data } = await supabase
      .from('memberships')
      .select('role, job_role, users(name, whatsapp_phone)')
      .eq('workspace_id', workspaceId)
    const matches = (data ?? [])
      .map((m) => ({
        role: m.role as string,
        job_role: (m.job_role as string | null) ?? null,
        user: m.users as unknown as { name: string; whatsapp_phone: string | null } | null,
      }))
      .filter((m) => (m.user?.name ? fuzzyNameMatch(query, m.user.name) : false))
      .map((m) => ({
        name: m.user?.name,
        role: ROLE_LABELS[m.role] ?? m.role,
        job_role: m.job_role,
        has_whatsapp: !!m.user?.whatsapp_phone,
      }))
    if (matches.length === 0) return { members: [], note: 'Ninguém da equipe encontrado com esse nome.' }
    return { members: matches }
  }

  if (toolName === 'search_knowledge') {
    const query = String(input.query ?? '').trim()
    if (!query) return { error: 'query vazia' }
    const { data, error } = await supabase.rpc('search_knowledge_base', {
      p_workspace_id: workspaceId,
      p_query: query,
      p_audiences: ['hermes', 'both'],
      p_limit: 5,
    })
    const results = (data ?? []) as { title: string; content: string; category: string }[]
    if (error) return { error: error.message }
    if (results.length === 0) return { results: [], note: 'Nada encontrado na base de conhecimento pra essa busca.' }
    return { results }
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

  if (toolName === 'check_messages') {
    const hours = Number(input.hours) > 0 ? Number(input.hours) : 24
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString()

    let query = supabase
      .from('conversations')
      .select('id, contact_name, contact_phone, handoff_required, last_message_at, clients(name)')
      .eq('workspace_id', workspaceId)
      .gte('last_message_at', since)
      .order('last_message_at', { ascending: false })
      .limit(15)
    if (input.only_important === true) query = query.eq('handoff_required', true)

    const { data: convs } = await query
    const results: Array<Record<string, unknown>> = []
    for (const c of convs ?? []) {
      const { data: lastMsg } = await supabase
        .from('conversation_messages')
        .select('content')
        .eq('conversation_id', c.id as string)
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      results.push({
        client_name: (c.clients as { name?: string } | null)?.name ?? c.contact_name ?? 'desconhecido',
        contact_phone: c.contact_phone,
        last_message_at: c.last_message_at,
        needs_attention: c.handoff_required,
        last_message_preview: (lastMsg?.content as string | undefined)?.slice(0, 150) ?? null,
      })
    }
    return { conversations: results, count: results.length }
  }

  return { error: `Ferramenta desconhecida: ${toolName}` }
}

async function resolveDepartmentAssignee(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  jobRole: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('job_role', jobRole)
    .limit(1)
    .maybeSingle()
  return (data?.user_id as string | undefined) ?? null
}

/**
 * Checa se já existe um cliente parecido antes de criar um novo — por
 * telefone de contato (mais confiável, usa as mesmas variações de 9º
 * dígito/DDI de phoneVariants) e, se não achar, por nome (ILIKE parcial).
 * Evita a duplicidade reportada em uso real: o agente cadastrando o mesmo
 * cliente duas vezes.
 */
async function findSimilarClient(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  name: string,
  contactPhone?: string,
): Promise<{ id: string; name: string; status: string } | null> {
  if (contactPhone) {
    const variants = phoneVariants(contactPhone)
    if (variants.length > 0) {
      const orFilter = variants.flatMap((v) => [`phone.eq.${v}`, `phone.ilike.%${v}`]).join(',')
      const { data: contacts } = await supabase
        .from('client_contacts')
        .select('clients(id, name, status)')
        .eq('workspace_id', workspaceId)
        .not('phone', 'is', null)
        .or(orFilter)
        .limit(1)
      const match = contacts?.[0]?.clients as unknown as { id: string; name: string; status: string } | undefined
      if (match?.id) return match
    }
  }

  const { data: byName } = await supabase
    .from('clients')
    .select('id, name, status')
    .eq('workspace_id', workspaceId)
    .ilike('name', `%${name}%`)
    .limit(1)
  return (byName?.[0] as { id: string; name: string; status: string } | undefined) ?? null
}

async function executeWriteTool(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  actorId: string,
  toolName: string,
  input: Record<string, unknown>,
  mediaContext?: { messageId: string; instance: string | undefined }[],
): Promise<unknown> {
  // Segunda camada de checagem pras ferramentas restritas ao dono — a
  // primeira já bloqueia antes de sequer registrar como pending
  // (runHermesAgentLoop), mas confirma de novo aqui já que essa função
  // executa a ação de verdade.
  if (OWNER_ONLY_TOOLS.has(toolName) && actorId !== OWNER_RESTRICTED_USER_ID) {
    throw new Error('Não autorizado: só o dono da agência pode acionar essa ferramenta.')
  }

  switch (toolName) {
    case 'send_message': {
      const message = String(input.message ?? '').trim()
      if (!message) throw new Error('Informe o texto da mensagem.')

      let targetPhone: string | null = null
      let targetLabel = ''
      let clientForLog: { id: string } | null = null
      let unknownContact = false

      if (input.to_team_member_name) {
        const { data: memberships } = await supabase
          .from('memberships')
          .select('users(name, whatsapp_phone)')
          .eq('workspace_id', workspaceId)
        const teamNeedle = String(input.to_team_member_name)
        const match = (memberships ?? [])
          .map((m) => m.users as unknown as { name: string; whatsapp_phone: string | null } | null)
          .find((u) => (u?.name ? fuzzyNameMatch(teamNeedle, u.name) : false))
        if (!match) throw new Error(`Não achei ninguém da equipe chamado "${input.to_team_member_name}".`)
        if (!match.whatsapp_phone) throw new Error(`"${match.name}" não tem WhatsApp cadastrado como operador.`)
        targetPhone = match.whatsapp_phone
        targetLabel = match.name
      } else if (input.to_client_name) {
        // Segurança: se o nome bate com alguém da equipe, é quase certo que
        // é engano do modelo usando to_client_name em vez de
        // to_team_member_name (aconteceu em uso real: um lead arquivado
        // tinha o mesmo nome de uma operadora registrada, e a mensagem foi
        // pro cadastro de cliente errado em vez de pra pessoa de verdade).
        const { data: staffMemberships } = await supabase
          .from('memberships')
          .select('users(name)')
          .eq('workspace_id', workspaceId)
        const staffMatch = (staffMemberships ?? [])
          .map((m) => m.users as unknown as { name: string } | null)
          .find((u) => (u?.name ? fuzzyNameMatch(String(input.to_client_name), u.name) : false))
        if (staffMatch) {
          throw new Error(
            `"${input.to_client_name}" é da equipe (${staffMatch.name}), não um cliente — use to_team_member_name em vez de to_client_name.`,
          )
        }

        const clientRef = await resolveClientRef(
          supabase,
          workspaceId,
          { client_name: input.to_client_name as string },
          true, // não faz sentido mandar mensagem pra um cliente arquivado
        )
        if ('error' in clientRef) throw new Error(clientRef.error)
        const { data: contact } = await supabase
          .from('client_contacts')
          .select('phone, name')
          .eq('client_id', clientRef.id)
          .eq('is_primary', true)
          .maybeSingle()
        if (!contact?.phone) throw new Error('Esse cliente não tem telefone de contato cadastrado.')
        targetPhone = contact.phone as string
        targetLabel = (contact.name as string | undefined) ?? String(input.to_client_name)
        clientForLog = { id: clientRef.id }
      } else if (input.to_phone) {
        // Número "cru" digitado sem o 55 (DDI Brasil) não é um JID válido de
        // WhatsApp — a Evolution API aceita a chamada mas nunca entrega, sem
        // erro nenhum (bug real: 3 mensagens "enviadas" no CRM que nunca
        // chegaram no celular do destinatário). Garante o DDI antes de mandar.
        const rawDigits = String(input.to_phone).replace(/\D/g, '')
        targetPhone = rawDigits.startsWith('55') ? rawDigits : `55${rawDigits}`
        targetLabel = targetPhone

        // Confirma o número real registrado no WhatsApp antes de mandar —
        // bug real: número com 9º dígito não batia com conta registrada no
        // formato antigo (sem o 9 extra), e a mensagem nunca chegava sem
        // erro nenhum. Se a checagem não confirmar nada, segue com o número
        // normalizado mesmo (não bloqueia o envio por causa da checagem).
        const confirmedNumber = await resolveDeliverableNumber(undefined, targetPhone)
        if (confirmedNumber) targetPhone = confirmedNumber

        // to_phone é a via "crua" — sem nome, então antes de mandar cego
        // pra um número desconhecido, checa se esse telefone já é de um
        // cliente ou de um operador cadastrado (reaproveitando o mesmo
        // matching por variação de número usado em resolveClient/
        // resolveOperator). Sem isso, mensagens pra clientes conhecidos
        // (identificados só pelo número) criavam uma conversa "Equipe"
        // fantasma em vez de cair na conversa do cliente de verdade.
        const phoneClient = await resolveClient(supabase, { phone: targetPhone, message: '' })
        if (phoneClient && (phoneClient.workspace_id as string) === workspaceId) {
          clientForLog = { id: phoneClient.id as string }
          targetLabel = phoneClient.name as string
        } else {
          const phoneOperator = await resolveOperator(supabase, targetPhone)
          if (phoneOperator) {
            targetLabel = phoneOperator.name
          } else {
            unknownContact = true
          }
        }
      } else {
        throw new Error('Informe to_team_member_name, to_client_name ou to_phone.')
      }

      // Se a mensagem (ou fotos pendentes recentes, ver
      // resolveOperatorMediaContext) do operador que disparou esse
      // send_message veio com imagem(ns), encaminha a(s) imagem(ns) de
      // verdade em vez de só o texto — baixa o base64 de cada uma e reenvia
      // pro destino (legenda só na primeira, as outras vão só a imagem, pra
      // não repetir o mesmo texto várias vezes). Se nenhuma imagem for
      // encaminhada com sucesso, cai pra texto puro (melhor mandar o texto
      // do que não mandar nada) e avisa no resultado.
      let sentMessageId: string | null = null
      let imagesForwarded = 0
      let imagesFailed = 0
      if (mediaContext && mediaContext.length > 0) {
        // Em paralelo (não sequencial) — cada busca de mídia pode levar até
        // uns segundos, e com 2+ imagens em série o tempo somado arriscava
        // estourar o tempo de execução da function inteira (bug real visto
        // em teste: função "morria" no meio sem nem cair no catch). Tudo
        // protegido por try/catch pra NUNCA deixar uma falha aqui derrubar
        // a resposta inteira do Tettolino — pior caso, cai pra texto puro.
        try {
          const results = await Promise.all(
            mediaContext.map(async (item, i) => {
              const base64 = await fetchEvolutionMediaBase64(item.instance, item.messageId)
              if (!base64) return null
              return sendEvolutionImage(item.instance, targetPhone, base64, i === 0 ? message : '')
            }),
          )
          for (let i = 0; i < results.length; i++) {
            if (results[i]) {
              imagesForwarded++
              if (i === 0) sentMessageId = results[i]
            } else {
              imagesFailed++
            }
          }
        } catch (err) {
          console.error('send_message: falha encaminhando imagem(ns)', err)
          imagesFailed = mediaContext.length
        }
      }
      const imageForwarded = imagesForwarded > 0
      const imageForwardFailed = imagesFailed > 0
      if (!imageForwarded) {
        sentMessageId = await sendEvolutionText(undefined, targetPhone, message)
      }

      // Se foi pra um cliente, também registra na thread do Inbox (mesma
      // lógica de logConversation) pra aparecer na tela de Mensagens do CRM.
      if (clientForLog) {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', clientForLog.id)
          .eq('channel', 'whatsapp')
          .eq('contact_phone', targetPhone)
          .maybeSingle()

        let conversationId = existing?.id as string | undefined
        if (conversationId) {
          await supabase
            .from('conversations')
            .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', conversationId)
        } else {
          const { data: created } = await supabase
            .from('conversations')
            .insert({
              workspace_id: workspaceId,
              client_id: clientForLog.id,
              channel: 'whatsapp',
              contact_phone: targetPhone,
              status: 'open',
              handoff_required: false,
              last_message_at: new Date().toISOString(),
            })
            .select('id')
            .single()
          conversationId = created?.id as string | undefined
        }
        if (conversationId) {
          await supabase.from('conversation_messages').insert({
            workspace_id: workspaceId,
            conversation_id: conversationId,
            client_id: clientForLog.id,
            direction: 'outbound',
            content: message,
            is_ai: true,
            evolution_message_id: sentMessageId,
          })
        }
      } else {
        // Pra equipe (verificada) ou número avulso: registra como conversa
        // interna, sem client_id, pra aparecer no Inbox do CRM igual
        // apareceria no WhatsApp real da agência. 'unknown' quando o
        // to_phone não bateu com cliente nem operador cadastrado — não
        // rotula como "Equipe" um número que não foi confirmado como time.
        await upsertInternalConversation(
          supabase,
          workspaceId,
          targetPhone,
          targetLabel,
          unknownContact ? 'unknown' : 'internal',
          [{ direction: 'outbound', content: message, isAi: true }],
        )
      }

      // "sent" só descrevia que a ferramenta rodou sem lançar erro — não que
      // a Evolution API de fato confirmou a entrega. Bug real: mensagem pra
      // número sem DDI "entregava" sempre null de messageId, e o CRM
      // registrava como enviada mesmo assim, sem avisar ninguém.
      // "delivered" reflete a confirmação de verdade (id de mensagem
      // recebido da Evolution, por texto ou imagem).
      const delivered = imageForwarded || sentMessageId !== null
      return {
        sent: true,
        delivered,
        to: targetLabel,
        image_forwarded: imageForwarded,
        images_forwarded_count: imagesForwarded,
        image_forward_failed: imageForwardFailed,
      }
    }

    case 'create_client': {
      const name = String(input.name ?? '').trim()
      if (!name) throw new Error('Informe o nome do cliente.')

      const existing = await findSimilarClient(
        supabase,
        workspaceId,
        name,
        input.contact_phone as string | undefined,
      )
      if (existing) {
        throw new Error(
          `Já existe um cliente parecido cadastrado: "${existing.name}" (status ${existing.status}). Não criei outro pra evitar duplicidade — use update_client nesse cliente (id ${existing.id}) se for o caso, ou confirme com a pessoa se é realmente um cliente diferente antes de tentar de novo.`,
        )
      }

      const { data: client, error: clientErr } = await supabase
        .from('clients')
        .insert({
          workspace_id: workspaceId,
          name,
          status: (input.status as string | undefined) ?? 'ACTIVE',
          segment: (input.segment as string | undefined) ?? null,
          city: (input.city as string | undefined) ?? null,
          state: (input.state as string | undefined) ?? null,
          origin: (input.origin as string | undefined) ?? null,
          notes: (input.notes as string | undefined) ?? null,
        })
        .select('id, name')
        .single()
      if (clientErr) throw new Error(clientErr.message)

      if (input.contact_name || input.contact_phone || input.contact_email) {
        const { error: contactErr } = await supabase.from('client_contacts').insert({
          workspace_id: workspaceId,
          client_id: client.id,
          name: (input.contact_name as string | undefined) ?? name,
          phone: (input.contact_phone as string | undefined) ?? null,
          email: (input.contact_email as string | undefined) ?? null,
          is_primary: true,
        })
        if (contactErr) throw new Error(`Cliente criado, mas falha ao salvar contato: ${contactErr.message}`)
      }

      return { created: true, client }
    }

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
      let assigneeId = assignee.id
      if (!assigneeId && input.department) {
        assigneeId = await resolveDepartmentAssignee(supabase, workspaceId, String(input.department))
      }
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          workspace_id: workspaceId,
          title: String(input.title ?? ''),
          description: (input.description as string | undefined) ?? null,
          priority: (input.priority as string | undefined) ?? 'MEDIUM',
          operation_id: (input.operation_id as string | undefined) ?? null,
          assignee_id: assigneeId,
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
      const clientRef = await resolveClientRef(
        supabase,
        workspaceId,
        {
          client_id: input.client_id as string | undefined,
          client_name: input.client_name as string | undefined,
        },
        true, // não faz sentido criar operação nova pra um cliente arquivado
      )
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

    case 'delete_client': {
      const refs = (input.clients as Array<{ client_id?: string; client_name?: string }> | undefined) ?? []
      if (refs.length === 0) throw new Error('Informe pelo menos um cliente em "clients".')

      // Resolve e confirma a existência de TODOS antes de apagar qualquer
      // um — tudo ou nada, pra não deixar exclusão parcial num lote.
      const targets: Array<{ id: string; name: string }> = []
      for (const ref of refs) {
        const clientRef = await resolveClientRef(supabase, workspaceId, ref)
        if ('error' in clientRef) throw new Error(clientRef.error)
        const { data: clientRow } = await supabase
          .from('clients')
          .select('id, name')
          .eq('id', clientRef.id)
          .eq('workspace_id', workspaceId)
          .maybeSingle()
        if (!clientRow) throw new Error(`Cliente não encontrado: ${ref.client_name ?? ref.client_id}`)
        targets.push(clientRow as { id: string; name: string })
      }

      for (const target of targets) {
        // Ordem obrigatória: 'files' e 'operations' não cascateiam sozinhos ao
        // apagar o cliente (FK sem ON DELETE CASCADE) — precisam ser limpos
        // manualmente antes. O resto (contatos, memórias, conversas, contratos,
        // financeiro etc.) cascateia automaticamente com o DELETE de clients.
        const { data: ops } = await supabase.from('operations').select('id').eq('client_id', target.id)
        const opIds = (ops ?? []).map((o) => o.id as string)

        const orFilterParts = [`client_id.eq.${target.id}`]
        if (opIds.length > 0) orFilterParts.push(`operation_id.in.(${opIds.join(',')})`)
        const { error: filesErr } = await supabase.from('files').delete().or(orFilterParts.join(','))
        if (filesErr) throw new Error(`Falha ao limpar arquivos de "${target.name}": ${filesErr.message}`)

        if (opIds.length > 0) {
          const { error: opsErr } = await supabase.from('operations').delete().eq('client_id', target.id)
          if (opsErr) throw new Error(`Falha ao limpar operações de "${target.name}": ${opsErr.message}`)
        }

        const { error: clientErr } = await supabase.from('clients').delete().eq('id', target.id)
        if (clientErr) throw new Error(`Falha ao excluir "${target.name}": ${clientErr.message}`)
      }

      return { deleted: true, clients: targets }
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
    case 'send_message':
      return `Mensagem enviada pra ${(r.to as string | undefined) ?? 'contato'}.`
    case 'create_client':
      return `Cliente "${(r.client as { name?: string } | undefined)?.name ?? ''}" cadastrado.`
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
    case 'delete_client': {
      const names = ((r.clients as Array<{ name?: string }> | undefined) ?? []).map((c) => c.name).filter(Boolean)
      return names.length > 1
        ? `${names.length} clientes excluídos definitivamente: ${names.join(', ')}.`
        : `Cliente "${names[0] ?? ''}" excluído definitivamente.`
    }
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
  // Só é chamada quando interpretConfirmation já deu 'yes' ou 'no' — o caso
  // 'unclear' é resolvido antes, em handleHermesMessage, superando a
  // pendência em vez de travar a conversa (ver comentário lá).
  const decision = interpretConfirmation(message)

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
  keys: { groqKey?: string; anthropicKey?: string },
  workspaceId: string,
  operator: { id: string; name: string; role: string },
  actorPhone: string,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  mediaContext?: { messageId: string; instance: string | undefined }[],
): Promise<string> {
  const messages: Array<Record<string, unknown>> = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ]

  // Escopo da CHAMADA inteira (não de uma rodada do loop) — Claude pode
  // espalhar chamadas de ferramenta por várias idas e vindas antes de dar a
  // resposta final; sem isso, cada rodada resetava o limite e várias ações
  // de escrita podiam ficar pending_confirmation ao mesmo tempo (só a mais
  // recente seria resolvida num "sim", as outras ficariam órfãs).
  let staged = false

  for (let iteration = 0; iteration < 4; iteration++) {
    const response = await callAgentBrain(
      keys,
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

    for (const block of toolUseBlocks) {
      if (OWNER_ONLY_TOOLS.has(block.name) && operator.id !== OWNER_RESTRICTED_USER_ID) {
        await logAgentAction(supabase, {
          workspaceId,
          actorUserId: operator.id,
          actorPhone,
          toolName: block.name,
          input: block.input,
          status: 'failed',
          error: 'Não autorizado: só o dono da agência pode acionar essa ferramenta.',
        })
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content:
            'NÃO AUTORIZADO: essa pessoa não é o dono da agência. Recuse o pedido educadamente, em uma frase, explicando que só o dono pode autorizar isso.',
        })
        continue
      }

      if (HERMES_IMMEDIATE_WRITE_TOOLS.has(block.name)) {
        // send_message: a pedido do dono, executa direto sem pedir
        // confirmação — já é owner-only (checado acima), então só ele
        // consegue disparar isso de qualquer forma.
        try {
          const result = await executeWriteTool(
            supabase,
            workspaceId,
            operator.id,
            block.name,
            block.input,
            block.name === 'send_message' ? mediaContext : undefined,
          )
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
      } else if (HERMES_WRITE_TOOLS.has(block.name)) {
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

const PENDING_MEDIA_WINDOW_MS = 5 * 60 * 1000

/**
 * Decide quais imagens vão junto do próximo send_message que o Tettolino
 * chamar: se a mensagem ATUAL já veio com foto+legenda, usa só essa. Senão,
 * busca fotos que ficaram pendentes (mandadas sem legenda nos últimos 5min)
 * e as consome (apaga do banco) — a instrução de texto que chegou agora é
 * o "pra quem mandar" delas.
 */
async function resolveOperatorMediaContext(
  supabase: ReturnType<typeof createClient>,
  operatorId: string,
  payload: Payload,
  instance: string | undefined,
): Promise<{ messageId: string; instance: string | undefined }[] | undefined> {
  if (payload.hasImage && payload.imageMessageId) {
    return [{ messageId: payload.imageMessageId, instance }]
  }

  const since = new Date(Date.now() - PENDING_MEDIA_WINDOW_MS).toISOString()
  const { data: pendingMedia } = await supabase
    .from('operator_pending_media')
    .select('id, message_id, instance')
    .eq('user_id', operatorId)
    .gt('received_at', since)
    .order('received_at', { ascending: true })

  if (!pendingMedia || pendingMedia.length === 0) return undefined

  await supabase
    .from('operator_pending_media')
    .delete()
    .in('id', pendingMedia.map((m) => m.id as string))

  return pendingMedia.map((m) => ({
    messageId: m.message_id as string,
    instance: (m.instance as string | undefined) ?? instance,
  }))
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

  // Foto sem legenda: WhatsApp costuma mandar várias fotos selecionadas
  // juntas como mensagens SEPARADAS, cada uma sem legenda — a instrução
  // ("manda pra fulano") vem depois, numa mensagem de texto puro. Guarda a
  // foto como "mídia pendente" e confirma o recebimento sem gastar uma
  // chamada de LLM (rápido, sem ambiguidade) — a instrução seguinte busca
  // essas fotos de volta em resolveOperatorMediaContext.
  if (payload.hasImage && !payload.message.trim() && payload.imageMessageId) {
    await supabase.from('operator_pending_media').insert({
      user_id: operator.id,
      message_id: payload.imageMessageId,
      instance: instance ?? null,
    })
    const ackReply =
      '📷 Recebi! Me diz o que fazer com ela (pra quem mandar) — se tiver mais fotos, pode mandar todas antes de me dizer o destino.'
    await sendEvolutionText(instance, payload.phone, ackReply)
    await persistHermesTurn(supabase, workspaceId, operator.id, '[imagem]', ackReply)
    await upsertInternalConversation(supabase, workspaceId, payload.phone, operator.name, 'internal', [
      { direction: 'inbound', content: '[imagem]', isAi: false },
      { direction: 'outbound', content: ackReply, isAi: true },
    ])
    return { reply: ackReply, hermes: true, actor_user_id: operator.id, media_queued: true }
  }

  // Groq é o cérebro principal (rápida, tem camada gratuita); Claude só entra
  // como fallback se a Groq falhar E a conta Anthropic tiver crédito (ver
  // LES-0016 — hoje não tem, mas mantém o caminho pronto pra quando tiver).
  const groqKey = Deno.env.get('GROQ_API_KEY')
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

  // Se tem ação pendente mas a mensagem nova não é claramente sim/não, NÃO
  // trava a conversa pedindo confirmação de novo pra sempre (bug real: 4
  // mensagens seguidas do usuário, nenhuma relacionada à ação pendente,
  // geraram a mesma resposta engessada 4x). Supera a pendência em silêncio
  // e processa a mensagem nova normalmente — o histórico recente ainda dá
  // contexto pro Tettolino, então se o usuário só reformulou o mesmo pedido,
  // ele consegue perceber e propor a ação de novo.
  let pendingToResolve = pending as { id: string; tool_name: string; input: Record<string, unknown> } | null
  if (pendingToResolve && interpretConfirmation(payload.message) === 'unclear') {
    await updateAgentAction(supabase, pendingToResolve.id, { status: 'superseded' })
    pendingToResolve = null
  }

  let reply: string
  if (pendingToResolve) {
    reply = await handlePendingConfirmation(
      supabase,
      workspaceId,
      operator.id,
      pendingToResolve,
      payload.message,
    )
  } else if (!groqKey && !anthropicKey) {
    reply = 'Tettolino ainda não está configurado (falta a chave da IA). Avisa o time técnico.'
  } else {
    try {
      const history = await loadRecentHermesMessages(supabase, workspaceId, operator.id)
      const mediaContext = await resolveOperatorMediaContext(supabase, operator.id, payload, instance)
      reply = await runHermesAgentLoop(
        supabase,
        { groqKey, anthropicKey },
        workspaceId,
        { ...operator, role },
        payload.phone,
        payload.message,
        history,
        mediaContext,
      )
    } catch (err) {
      console.error('runHermesAgentLoop failed', err)
      reply = 'Deu ruim aqui do meu lado processando seu pedido. Tenta de novo?'
    }
  }

  await persistHermesTurn(supabase, workspaceId, operator.id, payload.message, reply)

  // Também loga como conversa interna no Inbox do CRM — essa troca acontece
  // de verdade no WhatsApp da agência, então precisa aparecer lá igual
  // qualquer outra conversa (só sem client_id, já que é a equipe falando
  // com o Hermes, não um cliente).
  await upsertInternalConversation(supabase, workspaceId, payload.phone, operator.name, 'internal', [
    { direction: 'inbound', content: payload.message, isAi: false },
    { direction: 'outbound', content: reply, isAi: true },
  ])

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

/**
 * Retorna a saudação certa ("Bom dia"/"Boa tarde"/"Boa noite") só quando a
 * última mensagem dessa conversa foi num dia diferente de hoje (horário de
 * Brasília, UTC-3 — mesmo fuso de São Luís-MA, sem horário de verão). Se for
 * a mesma conversa do mesmo dia, retorna null: o agente não deve cumprimentar
 * de novo nem tratar como primeiro contato.
 */
// Horário comercial da TettoHub (horário de Brasília, UTC-3): seg-sex,
// 8h30-12h e 14h-17h. Fora disso, o bot não gera resposta com IA — só avisa
// o horário de atendimento (a mensagem do cliente continua sendo salva
// normalmente pra equipe ver quando voltar).
function isBusinessHours(now: Date): boolean {
  const BRAZIL_OFFSET_MIN = -3 * 60
  const local = new Date(now.getTime() + BRAZIL_OFFSET_MIN * 60000)
  const day = local.getUTCDay() // 0 = domingo ... 6 = sábado
  if (day === 0 || day === 6) return false
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes()
  const morning = minutes >= 8 * 60 + 30 && minutes < 12 * 60
  const afternoon = minutes >= 14 * 60 && minutes < 17 * 60
  return morning || afternoon
}

const OFF_HOURS_MESSAGE = `🕐 Nosso horário de atendimento:
Segunda a sexta: 8h30 às 12h e de 14h às 17h

Assim que retornarmos, daremos continuidade ao seu atendimento 😀`

function greetingIfNewDay(lastMessageAt: string | null | undefined): string | null {
  const BRAZIL_OFFSET_MIN = -3 * 60
  const now = new Date()
  const toBrazilDateStr = (d: Date) => new Date(d.getTime() + BRAZIL_OFFSET_MIN * 60000).toISOString().slice(0, 10)

  if (lastMessageAt) {
    const last = new Date(lastMessageAt)
    if (!Number.isNaN(last.getTime()) && toBrazilDateStr(last) === toBrazilDateStr(now)) {
      return null // mesma conversa, mesmo dia — sem saudação
    }
  }

  const hour = new Date(now.getTime() + BRAZIL_OFFSET_MIN * 60000).getUTCHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function fallbackReply(
  clientName: string,
  department: Department,
  message: string,
  greeting: string | null,
) {
  const prefix = greeting ? `${greeting}! ` : ''
  if (department === 'general') {
    return `${prefix}Sou o assistente da ${clientName} / TettoHub. Li sua mensagem e estou à disposição. Como posso ajudar: posts, gravação, edição ou tráfego?`
  }
  const who = DEPARTMENT_LABELS[department]
  return `${prefix}Perfeito! Anotei seu pedido (“${message.slice(0, 80)}”). Vou direcionar para nossa equipe de ${who}, que cuida disso. Em breve alguém retorna por aqui.`
}

/**
 * Busca na base de conhecimento (knowledge_base) entradas relevantes pra
 * mensagem do cliente, só as liberadas pro bot de clientes ('clients' ou
 * 'both' — nunca 'hermes', que é interno). Falha em silêncio (retorna vazio)
 * pra nunca travar a resposta ao cliente por causa disso.
 */
async function searchKnowledgeForClientBot(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  message: string,
): Promise<{ title: string; content: string; category: string }[]> {
  try {
    const { data } = await supabase.rpc('search_knowledge_base', {
      p_workspace_id: workspaceId,
      p_query: message,
      p_audiences: ['clients', 'both'],
      p_limit: 5,
    })
    return (data ?? []) as { title: string; content: string; category: string }[]
  } catch (err) {
    console.error('searchKnowledgeForClientBot failed', err)
    return []
  }
}

async function generateWithGroq(
  apiKey: string,
  ctx: {
    clientName: string
    message: string
    memories: { title: string; content: string; category: string }[]
    knowledge: { title: string; content: string; category: string }[]
    department: Department
    departmentLabel: string
    greeting: string | null
  },
) {
  const memoryBlock = ctx.memories
    .slice(0, 5)
    .map((m) => `- [${m.category}] ${m.title}: ${m.content.slice(0, 220)}`)
    .join('\n')

  const knowledgeBlock = ctx.knowledge
    .slice(0, 5)
    .map((k) => `- [${k.category}] ${k.title}: ${k.content.slice(0, 300)}`)
    .join('\n')

  const continuityInstruction = ctx.greeting
    ? `Essa é a primeira mensagem do cliente hoje — comece a resposta com "${ctx.greeting}!" antes de responder o pedido dele.`
    : 'Essa conversa já está em andamento hoje (não é a primeira mensagem) — NÃO cumprimente de novo (nada de "Olá"/"Oi"/"Bom dia" etc.), vá direto responder a mensagem.'

  const system = `Você é o assistente de WhatsApp da agência TettoHub, atendendo o cliente "${ctx.clientName}".
Tom: humano, acolhedor, profissional, frases curtas (máx 4 frases).
Idioma: português do Brasil.
Nunca invente preços, prazos ou fatos que não estejam no contexto ou na base de conhecimento abaixo. Se a pergunta for sobre preço/prazo/política e não tiver nada relevante na base de conhecimento, diga que vai confirmar com a equipe em vez de supor um valor.
Se o pedido for operacional, confirme e diga que a equipe de ${ctx.departmentLabel} vai executar.
Se for dúvida geral, responda com o que souber do contexto.
Intenção classificada: ${ctx.department}.
${continuityInstruction}
Não fique repetindo o nome do cliente em toda mensagem — use o nome só quando fizer sentido (ex: primeira mensagem do dia), não em toda resposta.`

  const user = `Contexto do cliente:\n${memoryBlock || '(sem memória)'}\n\nBase de conhecimento da agência (políticas, preços, procedimentos):\n${knowledgeBlock || '(nada relevante encontrado)'}\n\nMensagem do cliente:\n${ctx.message}`

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
      return fallbackReply(ctx.clientName, ctx.department, ctx.message, ctx.greeting)
    }
    return String(content).trim()
  } catch (err) {
    console.error('generateWithGroq failed', err)
    return fallbackReply(ctx.clientName, ctx.department, ctx.message, ctx.greeting)
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
  reply: string | null,
  handoffRequired: boolean,
  evolutionMessageId?: string | null,
): Promise<string | undefined> {
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

    if (!conversationId) return undefined

    const rows: Array<Record<string, unknown>> = [
      {
        workspace_id: client.workspace_id,
        conversation_id: conversationId,
        client_id: client.id,
        direction: 'inbound',
        content: payload.message,
        is_ai: false,
      },
    ]
    // reply null = resposta ficou engatilhada (pending_bot_replies), o
    // outbound é logado depois pelo flush-pending-replies quando sair de
    // verdade — não loga aqui pra não duplicar/logar cedo demais.
    if (reply !== null) {
      rows.push({
        workspace_id: client.workspace_id,
        conversation_id: conversationId,
        client_id: client.id,
        direction: 'outbound',
        content: reply,
        is_ai: true,
        evolution_message_id: evolutionMessageId ?? null,
      })
    }
    await supabase.from('conversation_messages').insert(rows)
    return conversationId
  } catch (err) {
    // Falha ao logar a thread não pode derrubar a resposta ao cliente.
    console.error('logConversation failed', err)
    return undefined
  }
}

const BOT_REPLY_DELAY_MS = 90_000

/**
 * Engatilha a resposta da IA pra sair só depois de 90s — dá tempo do social
 * media responder o cliente pessoalmente primeiro (flush-pending-replies,
 * chamado a cada 30s pelo pg_cron, checa se alguém já respondeu antes de
 * mandar). Se já existia uma resposta pendente pra essa conversa (cliente
 * mandou mensagens seguidas), cancela a antiga em vez de empilhar as duas.
 */
async function scheduleDeferredReply(
  supabase: ReturnType<typeof createClient>,
  params: {
    workspaceId: string
    conversationId: string
    clientId: string | null
    phone: string
    instance: string | undefined
    replyText: string
  },
) {
  try {
    await supabase
      .from('pending_bot_replies')
      .update({ status: 'superseded', resolved_at: new Date().toISOString() })
      .eq('conversation_id', params.conversationId)
      .eq('status', 'pending')

    await supabase.from('pending_bot_replies').insert({
      workspace_id: params.workspaceId,
      conversation_id: params.conversationId,
      client_id: params.clientId,
      phone: params.phone,
      instance: params.instance ?? null,
      reply_text: params.replyText,
      send_after: new Date(Date.now() + BOT_REPLY_DELAY_MS).toISOString(),
    })
  } catch (err) {
    console.error('scheduleDeferredReply failed', err)
  }
}

/**
 * Igual a logConversation, mas pra threads SEM cliente vinculado — conversa
 * do Hermes com um operador da equipe, ou send_message pra alguém da equipe
 * / número avulso. Sem client_id pra usar como chave, o dedupe é por
 * workspace + telefone (client_id IS NULL). Existe pra o Inbox do CRM
 * espelhar 100% do que acontece no WhatsApp da agência, não só as
 * conversas com cliente.
 */
async function upsertInternalConversation(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string,
  phone: string,
  contactName: string | null,
  kind: 'internal' | 'unknown',
  turns: Array<{ direction: 'inbound' | 'outbound'; content: string; isAi: boolean }>,
) {
  try {
    // Compara por QUALQUER variação do telefone (com/sem 9º dígito, com/sem
    // DDI), não só igualdade exata — o mesmo operador aparece com formatos
    // diferentes conforme a origem (users.whatsapp_phone cadastrado, vs o
    // que vem cru no payload do WhatsApp), e isso já causou duas conversas
    // internas duplicadas pra mesma pessoa em uso real.
    const variants = phoneVariants(phone)
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('channel', 'whatsapp')
      .in('contact_phone', variants.length > 0 ? variants : [phone])
      .is('client_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    let conversationId = existing?.id as string | undefined

    if (conversationId) {
      await supabase
        .from('conversations')
        .update({
          contact_name: contactName ?? undefined,
          // Se antes não sabíamos quem era (unknown) e agora resolveu pra
          // cliente/operador verificado (internal), promove a conversa em
          // vez de deixar presa como "desconhecido" pra sempre.
          kind,
          status: 'open',
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
    } else {
      const { data: created } = await supabase
        .from('conversations')
        .insert({
          workspace_id: workspaceId,
          client_id: null,
          kind,
          channel: 'whatsapp',
          contact_phone: phone,
          contact_name: contactName,
          status: 'open',
          handoff_required: false,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      conversationId = created?.id as string | undefined
    }

    if (!conversationId) return

    await supabase.from('conversation_messages').insert(
      turns.map((t) => ({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        client_id: null,
        direction: t.direction,
        content: t.content,
        is_ai: t.isAi,
      })),
    )
  } catch (err) {
    // Falha ao logar a thread interna não pode derrubar a resposta.
    console.error('upsertInternalConversation failed', err)
  }
}

function evolutionConfig(instance: string | undefined) {
  const base = Deno.env.get('EVOLUTION_BASE_URL')
  const apiKey = Deno.env.get('EVOLUTION_API_KEY')
  const inst = instance || Deno.env.get('EVOLUTION_INSTANCE')
  if (!base || !apiKey || !inst) return null
  return { base, apiKey, inst }
}

/**
 * Confirma o número de WhatsApp de verdade antes de mandar pra um telefone
 * "cru" (to_phone, sem cliente/operador cadastrado por trás). Bug real:
 * número digitado com o 9º dígito (padrão atual de celular BR) não bate
 * com uma conta de WhatsApp registrada no formato antigo (sem o 9 extra) —
 * a Evolution aceita a chamada de envio mas nunca entrega, sem erro nenhum.
 * `/chat/whatsappNumbers` devolve o JID real (já na forma que a conta usa),
 * então usa esse em vez de confiar cegamente nos dígitos digitados.
 */
async function resolveDeliverableNumber(
  instance: string | undefined,
  phone: string,
): Promise<string | null> {
  const cfg = evolutionConfig(instance)
  if (!cfg) return null
  try {
    const res = await fetchWithTimeout(`${cfg.base}/chat/whatsappNumbers/${cfg.inst}`, {
      method: 'POST',
      headers: { apikey: cfg.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ numbers: [phone] }),
    })
    const body = await res.json().catch(() => null)
    const entry = Array.isArray(body) ? body[0] : null
    if (entry?.exists && typeof entry?.jid === 'string') {
      return entry.jid.replace(/@.*/, '')
    }
    return null
  } catch (err) {
    console.error('resolveDeliverableNumber failed', err)
    return null
  }
}

/**
 * Retorna o id da mensagem no WhatsApp (key.id da resposta da Evolution),
 * ou null se falhar/não configurado. Esse id é gravado junto do outbound
 * em conversation_messages pra depois reconhecer o eco dessa mesma
 * mensagem voltando pelo webhook (fromMe=true) como "nosso próprio envio"
 * e não confundir com resposta manual de alguém digitando no WhatsApp.
 */
async function sendEvolutionText(
  instance: string | undefined,
  phone: string,
  text: string,
): Promise<string | null> {
  const cfg = evolutionConfig(instance)
  if (!cfg) return null
  try {
    const res = await fetchWithTimeout(`${cfg.base}/message/sendText/${cfg.inst}`, {
      method: 'POST',
      headers: { apikey: cfg.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone, text }),
    })
    const body = await res.json().catch(() => null)
    const id = body?.key?.id
    return typeof id === 'string' ? id : null
  } catch (err) {
    console.error('sendEvolutionText failed', err)
    return null
  }
}

/**
 * Baixa o base64 de uma mídia (imagem, áudio, etc.) recebida pelo webhook, a
 * partir do messageId — mesmo endpoint já usado em transcribeAudio pra
 * áudio. Necessário porque o WhatsApp/Baileys manda a mídia criptografada
 * no webhook; a Evolution API decripta e devolve em base64 sob pedido.
 */
async function fetchEvolutionMediaBase64(
  instance: string | undefined,
  messageId: string,
): Promise<string | null> {
  const cfg = evolutionConfig(instance)
  if (!cfg) return null
  try {
    const res = await fetchWithTimeout(`${cfg.base}/chat/getBase64FromMediaMessage/${cfg.inst}`, {
      method: 'POST',
      headers: { apikey: cfg.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { key: { id: messageId } } }),
    })
    const body = await res.json().catch(() => null)
    const base64: string | undefined = body?.base64
    return typeof base64 === 'string' ? base64 : null
  } catch (err) {
    console.error('fetchEvolutionMediaBase64 failed', err)
    return null
  }
}

/** Manda uma imagem (base64) pra um número via Evolution API. */
async function sendEvolutionImage(
  instance: string | undefined,
  phone: string,
  base64: string,
  caption: string,
): Promise<string | null> {
  const cfg = evolutionConfig(instance)
  if (!cfg) return null
  try {
    const res = await fetchWithTimeout(`${cfg.base}/message/sendMedia/${cfg.inst}`, {
      method: 'POST',
      headers: { apikey: cfg.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: phone,
        mediatype: 'image',
        mimetype: 'image/jpeg',
        media: base64,
        caption,
        fileName: 'imagem.jpg',
      }),
    })
    const body = await res.json().catch(() => null)
    const id = body?.key?.id
    return typeof id === 'string' ? id : null
  } catch (err) {
    console.error('sendEvolutionImage failed', err)
    return null
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
