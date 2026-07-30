import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  client_id: string
  phone: string
  message: string
  contact_name?: string
}

const LEGAL = [/processo/i, /advogad/i, /jurídic/i, /posso processar/i]
const HEALTH = [/garante resultado/i, /cura /i, /emagrecer/i]
const ELECTORAL = [/votem/i, /candidat/i, /elei[çc]/i]

function inferSegment(memories: { content: string; title: string }[]): string {
  const text = memories.map((m) => `${m.title} ${m.content}`).join(' ').toLowerCase()
  if (/oab|jurídic|advogad/.test(text)) return 'legal'
  if (/anvisa|estética|saúde|clínica/.test(text)) return 'health_aesthetics'
  if (/eleição|tse|candidat/.test(text)) return 'electoral'
  return 'general'
}

function needsHandoff(segment: string, text: string): { handoff: boolean; reason: string | null } {
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

function buildReply(
  clientName: string,
  message: string,
  memories: { title: string; content: string; category: string }[],
): string {
  const terms = message.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
  const relevant = memories
    .map((m) => {
      const text = `${m.title} ${m.content}`.toLowerCase()
      const score = terms.reduce((s, t) => s + (text.includes(t) ? 1 : 0), 0)
      return { m, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)

  if (relevant[0]?.score > 0) {
    const excerpt = relevant[0].m.content.slice(0, 200)
    return `Olá! Sou o assistente da ${clientName}. ${excerpt}${excerpt.length >= 200 ? '...' : ''} Como posso ajudar?`
  }

  return `Olá! Sou o assistente da ${clientName}. Como posso ajudar você hoje?`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = (await req.json()) as WebhookPayload
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: client } = await supabase
      .from('clients')
      .select('id, name, workspace_id')
      .eq('id', payload.client_id)
      .single()

    if (!client) {
      return new Response(JSON.stringify({ error: 'Cliente não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: memories } = await supabase
      .from('client_ai_memory')
      .select('title, content, category')
      .eq('client_id', payload.client_id)
      .eq('active', true)
      .order('importance', { ascending: false })
      .limit(10)

    const segment = inferSegment(memories ?? [])
    const { handoff, reason } = needsHandoff(segment, payload.message)

    let reply = ''
    if (handoff) {
      reply =
        'Recebi sua mensagem. Um atendente da equipe TettoHub vai continuar o atendimento em breve.'
    } else {
      reply = buildReply(client.name, payload.message, memories ?? [])
    }

    await supabase.from('client_ai_memory').insert({
      workspace_id: client.workspace_id,
      client_id: payload.client_id,
      category: 'HISTORY',
      title: `WhatsApp ${payload.phone} — ${new Date().toISOString()}`,
      content: `De: ${payload.contact_name ?? payload.phone}\nMensagem: ${payload.message}\nResposta: ${reply}${handoff ? `\nHandoff: ${reason}` : ''}`,
      importance: 2,
      active: true,
    })

    return new Response(
      JSON.stringify({ reply, handoff, handoff_reason: reason, segment }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
