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

const LEGAL = [/processo/i, /advogad/i, /jurídic/i, /posso processar/i]
const HEALTH = [/garante resultado/i, /cura /i, /emagrecer/i]
const ELECTORAL = [/votem/i, /candidat/i, /elei[çc]/i]

interface Payload {
  phone: string
  message: string
  contact_name?: string
  client_id?: string
  instance?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = (await req.json()) as Payload
    if (!payload.phone || !payload.message?.trim()) {
      return json({ error: 'phone e message obrigatórios' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const groqKey = Deno.env.get('GROQ_API_KEY')

    const client = await resolveClient(supabase, payload)
    if (!client) {
      return json({
        reply:
          'Olá! Sou o assistente da TettoHub. Não encontrei seu cadastro pelo WhatsApp. Pode me dizer o nome da empresa?',
        department: 'commercial',
        handoff: true,
        handoff_reason: 'Cliente não identificado',
        create_operation: false,
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

  const phoneDigits = payload.phone.replace(/\D/g, '')
  const variants = [
    phoneDigits,
    phoneDigits.replace(/^55/, ''),
    `+${phoneDigits}`,
  ]

  const { data: contacts } = await supabase
    .from('client_contacts')
    .select('client_id, phone, clients(id, name, workspace_id, status)')
    .not('phone', 'is', null)
    .limit(50)

  for (const c of contacts ?? []) {
    const p = String(c.phone ?? '').replace(/\D/g, '')
    if (variants.some((v) => p.endsWith(v) || v.endsWith(p))) {
      const client = c.clients as unknown as {
        id: string
        name: string
        workspace_id: string
        status: string
      }
      if (client?.id) return client
    }
  }

  return null
}

function routeIntent(message: string) {
  const rules: {
    department: Department
    intent: string
    patterns: RegExp[]
    needsHuman?: boolean
  }[] = [
    {
      department: 'social_media',
      intent: 'content_request',
      patterns: [/post/i, /storie?s?/i, /reels?/i, /legenda/i, /calend[aá]rio/i, /instagram/i],
    },
    {
      department: 'videomaker',
      intent: 'recording_schedule',
      patterns: [/grava[cç][aã]o/i, /filmar/i, /filmagem/i, /agendar\s+grava/i],
    },
    {
      department: 'video_editor',
      intent: 'editing_request',
      patterns: [/edi[cç][aã]o/i, /editar\s+.*v[ií]deo/i, /corte/i, /capcut/i],
    },
    {
      department: 'traffic',
      intent: 'ads_request',
      patterns: [/tr[aá]fego/i, /an[uú]ncio/i, /ads/i, /campanha/i, /impulsionar/i],
    },
    {
      department: 'commercial',
      intent: 'commercial',
      patterns: [/proposta/i, /or[cç]amento/i, /quanto\s+custa/i, /contrato/i],
      needsHuman: true,
    },
    {
      department: 'manager',
      intent: 'escalation',
      patterns: [/reclama/i, /urgente/i, /atrasad/i, /aprov/i],
      needsHuman: true,
    },
  ]

  for (const rule of rules) {
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
  if (segment === 'legal' && LEGAL.some((p) => p.test(text))) {
    return { handoff: true, reason: 'Aconselhamento jurídico — OAB' }
  }
  if (segment === 'health_aesthetics' && HEALTH.some((p) => p.test(text))) {
    return { handoff: true, reason: 'Promessa de resultado — ANVISA' }
  }
  if (segment === 'electoral' && ELECTORAL.some((p) => p.test(text))) {
    return { handoff: true, reason: 'Propaganda eleitoral — TSE' }
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

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
  })

  const body = await res.json()
  const content = body?.choices?.[0]?.message?.content
  if (!content) {
    return fallbackReply(ctx.clientName, ctx.department, ctx.message)
  }
  return String(content).trim()
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
