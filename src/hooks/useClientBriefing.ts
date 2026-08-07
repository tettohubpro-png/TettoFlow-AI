import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  BriefingFormData,
  Client,
  ClientBrand,
  ClientProduct,
} from '@/types/database'
import { BRIEFING_MEMORY_TITLES, ONBOARDING_MARKER_TITLE } from '@/types/database'

const EMPTY: BriefingFormData = {
  logo_url: '',
  primary_color: '',
  secondary_color: '',
  fonts: '',
  tone_of_voice: '',
  guidelines: '',
  history: '',
  objectives: '',
  persona: '',
  constraints: '',
  productsText: '',
}

function memoryContent(
  memories: { title: string; content: string }[],
  title: string,
): string {
  return memories.find((m) => m.title === title)?.content ?? ''
}

export function useClientBriefing(clientId: string | undefined) {
  const { workspace, user } = useAuth()
  const [client, setClient] = useState<Client | null>(null)
  const [brandId, setBrandId] = useState<string | null>(null)
  const [form, setForm] = useState<BriefingFormData>(EMPTY)
  const [onboarded, setOnboarded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!clientId || !workspace?.id) {
      setLoading(false)
      return
    }

    if (!opts?.silent) setLoading(true)
    setError(null)

    const [clientRes, brandRes, productsRes, memoryRes, markerRes] =
      await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).single(),
        supabase
          .from('client_brand')
          .select('*')
          .eq('client_id', clientId)
          .maybeSingle(),
        supabase
          .from('client_products')
          .select('*')
          .eq('client_id', clientId)
          .eq('active', true)
          .order('name'),
        supabase
          .from('client_ai_memory')
          .select('title, content')
          .eq('client_id', clientId)
          .eq('active', true)
          .in('title', Object.values(BRIEFING_MEMORY_TITLES)),
        supabase
          .from('client_ai_memory')
          .select('id')
          .eq('client_id', clientId)
          .eq('title', ONBOARDING_MARKER_TITLE)
          .maybeSingle(),
      ])

    if (clientRes.error || !clientRes.data) {
      setError(clientRes.error?.message ?? 'Cliente não encontrado')
      setLoading(false)
      return
    }

    setClient(clientRes.data as Client)
    setOnboarded(!!markerRes.data)

    const brand = brandRes.data as ClientBrand | null
    setBrandId(brand?.id ?? null)

    const products = (productsRes.data ?? []) as ClientProduct[]
    const memories = memoryRes.data ?? []

    setForm({
      logo_url: brand?.logo_url ?? '',
      primary_color: brand?.primary_color ?? '',
      secondary_color: brand?.secondary_color ?? '',
      fonts: brand?.fonts ?? '',
      tone_of_voice: brand?.tone_of_voice ?? '',
      guidelines: brand?.guidelines ?? '',
      history: memoryContent(memories, BRIEFING_MEMORY_TITLES.history),
      objectives: memoryContent(memories, BRIEFING_MEMORY_TITLES.objectives),
      persona: memoryContent(memories, BRIEFING_MEMORY_TITLES.persona),
      constraints: memoryContent(memories, BRIEFING_MEMORY_TITLES.constraints),
      productsText: products
        .map((p) => (p.description ? `${p.name}: ${p.description}` : p.name))
        .join('\n'),
    })

    setLoading(false)
  }, [clientId, workspace?.id])

  useEffect(() => {
    load()
  }, [load])

  const upsertMemory = async (
    title: string,
    content: string,
    category: 'BRIEFING' | 'BRAND' | 'CONSTRAINTS',
  ) => {
    if (!clientId || !workspace?.id) return

    const { data: existing } = await supabase
      .from('client_ai_memory')
      .select('id')
      .eq('client_id', clientId)
      .eq('title', title)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('client_ai_memory')
        .update({ content, category, active: true, importance: 8 })
        .eq('id', existing.id)
    } else if (content.trim()) {
      await supabase.from('client_ai_memory').insert({
        workspace_id: workspace.id,
        client_id: clientId,
        title,
        content,
        category,
        importance: 8,
        active: true,
        created_by: user?.id ?? null,
      })
    }
  }

  const saveBriefing = async () => {
    if (!clientId || !workspace?.id) return { error: 'Sessão inválida' }

    setSaving(true)
    setError(null)

    try {
      const brandPayload = {
        workspace_id: workspace.id,
        client_id: clientId,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color || null,
        secondary_color: form.secondary_color || null,
        fonts: form.fonts || null,
        tone_of_voice: form.tone_of_voice || null,
        guidelines: form.guidelines || null,
      }

      if (brandId) {
        const { error: brandErr } = await supabase
          .from('client_brand')
          .update(brandPayload)
          .eq('id', brandId)
        if (brandErr) throw new Error(brandErr.message)
      } else {
        const { data: created, error: brandErr } = await supabase
          .from('client_brand')
          .insert(brandPayload)
          .select('id')
          .single()
        if (brandErr) throw new Error(brandErr.message)
        setBrandId(created.id)
      }

      await upsertMemory(BRIEFING_MEMORY_TITLES.history, form.history, 'BRIEFING')
      await upsertMemory(
        BRIEFING_MEMORY_TITLES.objectives,
        form.objectives,
        'BRIEFING',
      )
      await upsertMemory(BRIEFING_MEMORY_TITLES.persona, form.persona, 'BRAND')
      await upsertMemory(
        BRIEFING_MEMORY_TITLES.constraints,
        form.constraints,
        'CONSTRAINTS',
      )

      const productLines = form.productsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)

      await supabase
        .from('client_products')
        .update({ active: false })
        .eq('client_id', clientId)

      if (productLines.length > 0) {
        const rows = productLines.map((line) => {
          const [name, ...rest] = line.split(':')
          return {
            workspace_id: workspace.id,
            client_id: clientId,
            name: name.trim(),
            description: rest.join(':').trim() || null,
            active: true,
          }
        })
        const { error: prodErr } = await supabase.from('client_products').insert(rows)
        if (prodErr) throw new Error(prodErr.message)
      }

      await load({ silent: true })
      setSaving(false)
      return { error: null }
    } catch (err) {
      const msg = String(err)
      setError(msg)
      setSaving(false)
      return { error: msg }
    }
  }

  const refresh = useCallback(() => load({ silent: true }), [load])

  return {
    client,
    form,
    setForm,
    onboarded,
    loading,
    saving,
    error,
    saveBriefing,
    refresh,
  }
}
