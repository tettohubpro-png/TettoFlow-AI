import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/**
 * Disparado a cada 30s pelo pg_cron (ver migration 20260812040000). Processa
 * pending_bot_replies: respostas da IA que ficaram "engatilhadas" por 90s
 * esperando o social media responder o cliente primeiro. Pra cada uma que já
 * passou do send_after:
 *   - se alguém da equipe já mandou mensagem outbound (humana) nessa
 *     conversa depois que a resposta foi engatilhada -> cancela (skipped),
 *     não manda nada (evita duplicidade)
 *   - senão -> manda pelo WhatsApp e loga como outbound da IA
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PendingReply {
  id: string
  workspace_id: string
  conversation_id: string
  client_id: string | null
  phone: string
  instance: string | null
  reply_text: string
  created_at: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: due, error: fetchErr } = await supabase
      .from('pending_bot_replies')
      .select('id, workspace_id, conversation_id, client_id, phone, instance, reply_text, created_at')
      .eq('status', 'pending')
      .lte('send_after', new Date().toISOString())
      .order('send_after', { ascending: true })
      .limit(25)

    if (fetchErr) return json({ error: fetchErr.message }, 500)

    const rows = (due ?? []) as PendingReply[]
    let sent = 0
    let skipped = 0
    let failed = 0

    for (const row of rows) {
      try {
        // Alguém da equipe (humano, não IA) já respondeu essa conversa
        // depois que a resposta da IA foi engatilhada? Se sim, cancela.
        const { data: humanReply } = await supabase
          .from('conversation_messages')
          .select('id')
          .eq('conversation_id', row.conversation_id)
          .eq('direction', 'outbound')
          .eq('is_ai', false)
          .gt('created_at', row.created_at)
          .limit(1)
          .maybeSingle()

        if (humanReply) {
          await supabase
            .from('pending_bot_replies')
            .update({ status: 'skipped', resolved_at: new Date().toISOString() })
            .eq('id', row.id)
          skipped++
          continue
        }

        await sendEvolutionText(row.instance ?? undefined, row.phone, row.reply_text)

        await supabase.from('conversation_messages').insert({
          workspace_id: row.workspace_id,
          conversation_id: row.conversation_id,
          client_id: row.client_id,
          direction: 'outbound',
          content: row.reply_text,
          is_ai: true,
        })
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', row.conversation_id)

        await supabase
          .from('pending_bot_replies')
          .update({ status: 'sent', resolved_at: new Date().toISOString() })
          .eq('id', row.id)
        sent++
      } catch (err) {
        console.error('flush-pending-replies: falha processando', row.id, err)
        await supabase
          .from('pending_bot_replies')
          .update({ status: 'failed', resolved_at: new Date().toISOString() })
          .eq('id', row.id)
        failed++
      }
    }

    return json({ ok: true, processed: rows.length, sent, skipped, failed })
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
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    await fetch(`${cfg.base}/message/sendText/${cfg.inst}`, {
      method: 'POST',
      headers: { apikey: cfg.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone, text }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}
