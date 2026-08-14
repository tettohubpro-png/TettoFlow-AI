import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER'
type AccessStatus = 'pending' | 'active' | 'blocked'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? '')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Sessão inválida' }, 401)

    const { data: membership } = await admin
      .from('memberships')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .in('role', ['OWNER', 'ADMIN'])
      .limit(1)
      .maybeSingle()

    if (!membership) {
      return json({ error: 'Somente o Master pode gerenciar a equipe' }, 403)
    }

    const workspaceId = membership.workspace_id as string

    if (action === 'create_member') {
      const email = String(body.email ?? '').trim().toLowerCase()
      const name = String(body.name ?? '').trim() || email.split('@')[0]
      const password = String(body.password ?? '').trim()
      const role = String(body.role ?? 'MEMBER').toUpperCase() as Role
      const jobRole = body.job_role ? String(body.job_role) : null

      if (!email || !password || password.length < 6) {
        return json({ error: 'Informe e-mail e senha (mín. 6 caracteres)' }, 400)
      }
      if (role !== 'MANAGER' && role !== 'MEMBER') {
        return json({ error: 'Papel inválido. Use Gerente ou Funcionário.' }, 400)
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      })
      if (createErr || !created.user) {
        return json({ error: createErr?.message ?? 'Falha ao criar usuário' }, 400)
      }

      const userId = created.user.id
      const { error: userErr } = await admin.from('users').upsert({
        id: userId,
        name,
        email,
        must_change_password: true,
        access_status: 'active',
        auth_provider: 'email',
        updated_at: new Date().toISOString(),
      })
      if (userErr) return json({ error: userErr.message }, 400)

      const { error: memErr } = await admin.from('memberships').insert({
        workspace_id: workspaceId,
        user_id: userId,
        role,
        job_role: jobRole,
      })
      if (memErr) return json({ error: memErr.message }, 400)

      return json({ ok: true, user_id: userId })
    }

    if (action === 'invite_member') {
      const email = String(body.email ?? '').trim().toLowerCase()
      const name = String(body.name ?? '').trim() || email.split('@')[0]
      const role = String(body.role ?? 'MEMBER').toUpperCase() as Role
      const jobRole = body.job_role ? String(body.job_role) : null

      if (!email) return json({ error: 'Informe o e-mail do convidado' }, 400)
      if (role !== 'MANAGER' && role !== 'MEMBER') {
        return json({ error: 'Papel inválido. Use Gerente ou Funcionário.' }, 400)
      }

      const origin = req.headers.get('origin') || 'https://crm.agenciatettohub.com.br'

      let userId: string | null = null
      const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { name },
        redirectTo: `${origin}/`,
      })

      if (inviteErr || !invited?.user) {
        // Já existe conta com esse e-mail (ex.: tentou logar com Google antes) —
        // não é um convite novo, é liberar acesso pra quem já apareceu no painel.
        const { data: existing } = await admin
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle()
        if (!existing) {
          return json({ error: inviteErr?.message ?? 'Falha ao enviar convite' }, 400)
        }
        userId = existing.id
      } else {
        userId = invited.user.id
      }

      const { error: userErr } = await admin.from('users').upsert({
        id: userId,
        name,
        email,
        access_status: 'active',
        updated_at: new Date().toISOString(),
      })
      if (userErr) return json({ error: userErr.message }, 400)

      const { data: existingMembership } = await admin
        .from('memberships')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle()

      if (existingMembership) {
        const { error } = await admin
          .from('memberships')
          .update({ role, job_role: jobRole, updated_at: new Date().toISOString() })
          .eq('id', existingMembership.id)
        if (error) return json({ error: error.message }, 400)
      } else {
        const { error } = await admin.from('memberships').insert({
          workspace_id: workspaceId,
          user_id: userId,
          role,
          job_role: jobRole,
        })
        if (error) return json({ error: error.message }, 400)
      }

      return json({ ok: true, user_id: userId, reused_existing_account: !invited?.user })
    }

    if (action === 'delete_member') {
      const userId = String(body.user_id ?? '')
      if (!userId) return json({ error: 'user_id obrigatório' }, 400)
      if (userId === user.id) return json({ error: 'Você não pode remover a si mesmo' }, 400)

      const { data: target } = await admin
        .from('memberships')
        .select('id, role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle()

      if (!target) return json({ error: 'Membro não encontrado' }, 404)
      if (target.role === 'OWNER') return json({ error: 'Não é possível remover o Master' }, 400)

      await admin.from('memberships').delete().eq('id', target.id)
      const { error: delErr } = await admin.auth.admin.deleteUser(userId)
      if (delErr) return json({ error: delErr.message }, 400)
      await admin.from('users').delete().eq('id', userId)

      return json({ ok: true })
    }

    if (action === 'update_member_role') {
      const userId = String(body.user_id ?? '')
      const role = String(body.role ?? '').toUpperCase() as Role
      const jobRole = body.job_role === undefined ? undefined : body.job_role ? String(body.job_role) : null

      if (!userId) return json({ error: 'user_id obrigatório' }, 400)
      if (role !== 'MANAGER' && role !== 'MEMBER') {
        return json({ error: 'Papel inválido' }, 400)
      }

      const patch: Record<string, unknown> = {
        role,
        updated_at: new Date().toISOString(),
      }
      if (jobRole !== undefined) patch.job_role = jobRole

      const { error } = await admin
        .from('memberships')
        .update(patch)
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .neq('role', 'OWNER')

      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    // ── Controle de acesso ──────────────────────────────────────────────────

    if (action === 'list_access') {
      const { data: users, error: usersErr } = await admin
        .from('users')
        .select('id, name, email, avatar_url, access_status, auth_provider, created_at')
        .order('created_at', { ascending: false })

      if (usersErr) return json({ error: usersErr.message }, 400)

      const { data: memberships, error: memErr } = await admin
        .from('memberships')
        .select('user_id, role, job_role')
        .eq('workspace_id', workspaceId)

      if (memErr) return json({ error: memErr.message }, 400)

      const memByUser = Object.fromEntries((memberships ?? []).map((m) => [m.user_id, m]))
      const result = (users ?? []).map((u) => ({
        ...u,
        role: memByUser[u.id]?.role ?? null,
        job_role: memByUser[u.id]?.job_role ?? null,
        is_self: u.id === user.id,
      }))

      return json({ ok: true, users: result })
    }

    if (action === 'approve_access') {
      const userId = String(body.user_id ?? '')
      const role = String(body.role ?? 'MEMBER').toUpperCase() as Role
      const jobRole = body.job_role ? String(body.job_role) : null

      if (!userId) return json({ error: 'user_id obrigatório' }, 400)
      if (role !== 'MANAGER' && role !== 'MEMBER') {
        return json({ error: 'Papel inválido. Use Gerente ou Funcionário.' }, 400)
      }

      const { data: existing } = await admin
        .from('memberships')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        const { error } = await admin
          .from('memberships')
          .update({ role, job_role: jobRole, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) return json({ error: error.message }, 400)
      } else {
        const { error } = await admin.from('memberships').insert({
          workspace_id: workspaceId,
          user_id: userId,
          role,
          job_role: jobRole,
        })
        if (error) return json({ error: error.message }, 400)
      }

      const { error: statusErr } = await admin
        .from('users')
        .update({ access_status: 'active' as AccessStatus, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (statusErr) return json({ error: statusErr.message }, 400)

      return json({ ok: true })
    }

    if (action === 'block_access') {
      const userId = String(body.user_id ?? '')
      if (!userId) return json({ error: 'user_id obrigatório' }, 400)
      if (userId === user.id) return json({ error: 'Você não pode bloquear a si mesmo' }, 400)

      const { data: target } = await admin
        .from('memberships')
        .select('id, role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle()

      if (target?.role === 'OWNER') return json({ error: 'Não é possível bloquear o Master' }, 400)
      if (target) await admin.from('memberships').delete().eq('id', target.id)

      const { error } = await admin
        .from('users')
        .update({ access_status: 'blocked' as AccessStatus, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (error) return json({ error: error.message }, 400)

      return json({ ok: true })
    }

    return json({ error: 'Ação inválida' }, 400)
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
