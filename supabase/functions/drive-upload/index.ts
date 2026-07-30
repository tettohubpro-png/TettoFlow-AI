import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { encode as base64url } from 'https://deno.land/std@0.224.0/encoding/base64url.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MANAGER_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Não autenticado' }, 401)

  const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
  const parentFolderId = Deno.env.get('GOOGLE_DRIVE_PARENT_FOLDER_ID')

  if (!saJson || !parentFolderId) {
    return json(
      {
        error: 'Google Drive não configurado',
        code: 'DRIVE_NOT_CONFIGURED',
      },
      503,
    )
  }

  try {
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
    if (authErr || !user) return json({ error: 'Sessão inválida' }, 401)

    const form = await req.formData()
    const file = form.get('file')
    const clientId = String(form.get('client_id') ?? '')
    const workspaceId = String(form.get('workspace_id') ?? '')
    const folderName = String(form.get('folder_name') ?? '')
    const videomakerName = String(form.get('videomaker_name') ?? '')
    const createdBy = String(form.get('created_by') ?? user.id)

    if (!(file instanceof File) || !clientId || !workspaceId || !folderName) {
      return json({ error: 'Payload inválido' }, 400)
    }

    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership || !MANAGER_ROLES.includes(membership.role)) {
      return json({ error: 'Sem permissão para upload' }, 403)
    }

    const accessToken = await getGoogleAccessToken(JSON.parse(saJson))
    const folderId = await ensureFolder(accessToken, parentFolderId, folderName)
    const uploaded = await uploadToDrive(accessToken, folderId, file)

    const note = videomakerName ? ` · ${videomakerName}` : ''
    await admin.from('files').insert({
      workspace_id: workspaceId,
      client_id: clientId,
      name: `[${folderName}${note}] ${file.name}`,
      storage_path: uploaded.webViewLink ?? `https://drive.google.com/file/d/${uploaded.id}/view`,
      mime_type: file.type || null,
      created_by: createdBy,
    })

    return json({
      id: uploaded.id,
      webViewLink: uploaded.webViewLink,
      folderId,
      folderName,
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

async function getGoogleAccessToken(sa: {
  client_email: string
  private_key: string
  token_uri?: string
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: sa.token_uri ?? 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const enc = new TextEncoder()
  const unsigned =
    base64url(enc.encode(JSON.stringify(header))) +
    '.' +
    base64url(enc.encode(JSON.stringify(claim)))

  const key = await importPrivateKey(sa.private_key)
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    enc.encode(unsigned),
  )
  const jwt = unsigned + '.' + base64url(new Uint8Array(signature))

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const tokenBody = await tokenRes.json()
  if (!tokenBody.access_token) {
    throw new Error(`Google token: ${JSON.stringify(tokenBody)}`)
  }
  return tokenBody.access_token as string
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')
  const binary = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

async function ensureFolder(
  accessToken: string,
  parentId: string,
  folderName: string,
): Promise<string> {
  const q = encodeURIComponent(
    `name='${folderName.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  )
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const searchBody = await search.json()
  if (searchBody.files?.[0]?.id) return searchBody.files[0].id as string

  const create = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })
  const created = await create.json()
  if (!created.id) throw new Error(`Criar pasta: ${JSON.stringify(created)}`)
  return created.id as string
}

async function uploadToDrive(
  accessToken: string,
  folderId: string,
  file: File,
): Promise<{ id: string; webViewLink?: string }> {
  const metadata = {
    name: file.name,
    parents: [folderId],
  }
  const boundary = 'tettoflow_boundary_' + crypto.randomUUID()
  const metaPart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    '\r\n'
  const fileHeader =
    `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`
  const closing = `\r\n--${boundary}--`

  const fileBuf = new Uint8Array(await file.arrayBuffer())
  const enc = new TextEncoder()
  const head = enc.encode(metaPart + fileHeader)
  const tail = enc.encode(closing)
  const body = new Uint8Array(head.length + fileBuf.length + tail.length)
  body.set(head, 0)
  body.set(fileBuf, head.length)
  body.set(tail, head.length + fileBuf.length)

  const upload = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  )
  const uploaded = await upload.json()
  if (!uploaded.id) throw new Error(`Upload Drive: ${JSON.stringify(uploaded)}`)
  return uploaded
}
