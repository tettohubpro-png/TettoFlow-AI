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
      .select('id, name, segment')
      .eq('id', payload.client_id)
      .single()

    if (!client) {
      return new Response(JSON.stringify({ error: 'Cliente não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { handoff, reason } = needsHandoff(client.segment, payload.message)

    let conversationId: string | null = null
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('client_id', payload.client_id)
      .eq('contact_phone', payload.phone)
      .eq('channel', 'whatsapp')
      .maybeSingle()

    if (conv) {
      conversationId = conv.id
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          client_id: payload.client_id,
          channel: 'whatsapp',
          contact_phone: payload.phone,
          contact_name: payload.contact_name,
          handoff_required: handoff,
        })
        .select('id')
        .single()
      conversationId = newConv?.id ?? null
    }

    await supabase.from('conversation_messages').insert({
      conversation_id: conversationId,
      client_id: payload.client_id,
      direction: 'inbound',
      content: payload.message,
      is_ai: false,
    })

    let reply = ''
    if (handoff) {
      reply =
        'Recebi sua mensagem. Um atendente da equipe TettoHub vai continuar o atendimento em breve.'
      await supabase
        .from('conversations')
        .update({ handoff_required: true, status: 'handoff' })
        .eq('id', conversationId)
    } else {
      reply = `Olá! Sou o assistente da ${client.name}. Como posso ajudar?`
    }

    await supabase.from('conversation_messages').insert({
      conversation_id: conversationId,
      client_id: payload.client_id,
      direction: 'outbound',
      content: reply,
      is_ai: true,
    })

    await supabase.from('ai_interaction_logs').insert({
      client_id: payload.client_id,
      channel: 'whatsapp',
      conversation_id: conversationId,
      segment: client.segment,
      handoff,
      handoff_reason: reason,
      model_used: handoff ? null : 'claude-placeholder',
    })

    return new Response(
      JSON.stringify({ reply, handoff, handoff_reason: reason }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
