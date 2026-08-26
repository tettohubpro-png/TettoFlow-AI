import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Envia uma mensagem de WhatsApp a partir da tela de Mensagens do CRM
 * (resposta manual, não gerada por IA) — contraparte de agent-whatsapp, que
 * só lida com mensagens recebidas. Exige sessão autenticada (verify_jwt
 * padrão, ao contrário de agent-whatsapp que é público + token de webhook).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Sessão inválida' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => ({}))
    const conversationId = String(body.conversation_id ?? '')
    const content = String(body.content ?? '').trim()
    if (!conversationId || !content) {
      return json({ error: 'conversation_id e content são obrigatórios' }, 400)
    }

    const { data: conversation } = await admin
      .from('conversations')
      .select('id, workspace_id, client_id, contact_phone')
      .eq('id', conversationId)
      .maybeSingle()
    if (!conversation) return json({ error: 'Conversa não encontrada' }, 404)

    const { data: membership } = await admin
      .from('memberships')
      .select('id')
      .eq('workspace_id', conversation.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) return json({ error: 'Você não tem acesso a esse workspace' }, 403)

    const base = Deno.env.get('EVOLUTION_BASE_URL')
    const apiKey = Deno.env.get('EVOLUTION_API_KEY')
    const instance = Deno.env.get('EVOLUTION_INSTANCE')
    if (base && apiKey && instance && conversation.contact_phone) {
      try {
        await fetch(`${base}/message/sendText/${instance}`, {
          method: 'POST',
          headers: { apikey: apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: conversation.contact_phone, text: content }),
        })
      } catch (err) {
        console.error('sendText failed', err)
        return json({ error: 'Falha ao enviar pelo WhatsApp — nada foi salvo.' }, 502)
      }
    }

    const { error: insertErr } = await admin.from('conversation_messages').insert({
      workspace_id: conversation.workspace_id,
      conversation_id: conversation.id,
      client_id: conversation.client_id,
      direction: 'outbound',
      content,
      is_ai: false,
    })
    if (insertErr) return json({ error: insertErr.message }, 500)

    await admin
      .from('conversations')
      .update({
        status: 'open',
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id)

    return json({ ok: true })
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
