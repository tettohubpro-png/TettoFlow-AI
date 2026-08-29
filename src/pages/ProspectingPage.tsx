import { useMemo, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useProspects } from '@/hooks/useProspects'
import type { Client, ClientLostReason, ClientPipelineStage } from '@/types/database'
import {
  LOST_REASON_LABELS,
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
} from '@/utils/permissions'

const CAN_OPERATE_ROLES = ['OWNER', 'ADMIN', 'MANAGER']

function daysUntil(dateStr: string): number {
  const today = new Date().toISOString().slice(0, 10)
  const a = new Date(today).getTime()
  const b = new Date(dateStr).getTime()
  return Math.round((b - a) / 86_400_000)
}

function FollowUpBadge({ date }: { date: string }) {
  const diff = daysUntil(date)
  const label = new Date(date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  const overdue = diff < 0
  const soon = diff >= 0 && diff <= 2
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
        overdue
          ? 'bg-red-500/15 text-red-300'
          : soon
            ? 'bg-amber-500/15 text-amber-300'
            : 'bg-slate-800 text-slate-400'
      }`}
    >
      🔔 {overdue ? 'Atrasado' : 'Follow-up'} {label}
    </span>
  )
}

function NewProspectModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (payload: {
    name: string
    segment?: string
    city?: string
    state?: string
    origin?: string
    notes?: string
  }) => Promise<{ error: string | null }>
}) {
  const [name, setName] = useState('')
  const [segment, setSegment] = useState('')
  const [city, setCity] = useState('')
  const [origin, setOrigin] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const reset = () => {
    setName('')
    setSegment('')
    setCity('')
    setOrigin('')
    setNotes('')
    setError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { error: err } = await onCreate({
      name: name.trim(),
      segment: segment.trim() || undefined,
      city: city.trim() || undefined,
      origin: origin.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    setSaving(false)
    if (err) {
      setError(err)
      return
    }
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-950 p-5">
        <h3 className="mb-4 font-semibold text-emerald-300">Novo prospect</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Nome / empresa *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Ramo de atividade</label>
            <input
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Cidade</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Como chegou até nós (indicação, Instagram, etc.)
            </label>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                reset()
                onClose()
              }}
              className="min-h-11 rounded-lg border border-slate-700 px-4 text-sm text-slate-300 hover:bg-slate-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? 'Criando...' : 'Criar prospect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LostReasonModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (reason: ClientLostReason) => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-950 p-5">
        <h3 className="mb-3 font-semibold text-red-300">Por que foi perdido?</h3>
        <div className="space-y-2">
          {Object.entries(LOST_REASON_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onConfirm(key as ClientLostReason)}
              className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-left text-sm hover:border-red-600/50"
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-10 w-full rounded-lg border border-slate-700 px-4 text-sm text-slate-400 hover:bg-slate-900"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function ProspectCard({
  prospect,
  onDragStart,
  onWon,
  onLost,
  isDragging,
}: {
  prospect: Client
  onDragStart: () => void
  onWon: () => void
  onLost: () => void
  isDragging?: boolean
}) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', prospect.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      className={`group cursor-grab rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm active:cursor-grabbing ${
        isDragging ? 'opacity-40 ring-2 ring-emerald-500/40' : ''
      }`}
    >
      <p className="font-medium break-words">{prospect.name}</p>
      {prospect.segment && <p className="mt-1 text-xs text-slate-500">{prospect.segment}</p>}
      {prospect.city && <p className="text-xs text-slate-600">{prospect.city}</p>}
      {prospect.next_follow_up_date && (
        <div className="mt-2">
          <FollowUpBadge date={prospect.next_follow_up_date} />
        </div>
      )}
      <div className="mt-2 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onWon}
          className="min-h-7 rounded border border-emerald-700/50 bg-emerald-600/15 px-2 text-[11px] text-emerald-300 hover:bg-emerald-600/25"
        >
          ✓ Converteu
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onLost}
          className="min-h-7 rounded border border-red-700/50 bg-red-600/10 px-2 text-[11px] text-red-300 hover:bg-red-600/20"
        >
          ✗ Perdido
        </button>
      </div>
    </li>
  )
}

export function ProspectingPage() {
  const { membership } = useAuth()
  const { prospects, loading, createProspect, moveStage, markLost } = useProspects()
  const [createOpen, setCreateOpen] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [lostTargetId, setLostTargetId] = useState<string | null>(null)

  const canOperate = CAN_OPERATE_ROLES.includes(membership?.role ?? '')

  const columns = useMemo(
    () => [
      ...PIPELINE_STAGE_ORDER.map((stage) => ({
        stage: stage as ClientPipelineStage,
        items: prospects.filter((p) => p.pipeline_stage === stage),
      })),
      { stage: 'LOST' as ClientPipelineStage, items: prospects.filter((p) => p.pipeline_stage === 'LOST') },
    ],
    [prospects],
  )

  const handleDrop = async (e: DragEvent<HTMLDivElement>, stage: ClientPipelineStage) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setDraggingId(null)
    if (!id || !canOperate) return
    if (stage === 'LOST') {
      setLostTargetId(id)
      return
    }
    await moveStage(id, stage)
  }

  return (
    <div>
      <header className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Prospecção</h2>
          <p className="text-sm text-slate-400">
            Funil de novos clientes — do primeiro contato até fechar contrato
          </p>
        </div>
        {canOperate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500 sm:w-auto"
          >
            + Novo prospect
          </button>
        )}
      </header>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div
          className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5"
          onDragEnd={() => setDraggingId(null)}
        >
          {columns.map(({ stage, items }) => (
            <div
              key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, stage)}
              className={`w-[78vw] max-w-xs shrink-0 rounded-xl border p-3 sm:w-auto sm:max-w-none ${
                stage === 'LOST'
                  ? 'border-red-900/40 bg-red-950/10'
                  : 'border-slate-800 bg-slate-900/30'
              }`}
            >
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {PIPELINE_STAGE_LABELS[stage]} ({items.length})
              </h3>
              <ul className="min-h-16 space-y-2">
                {items.length === 0 && (
                  <li className="rounded-lg border border-dashed border-slate-700 px-3 py-6 text-center text-xs text-slate-600">
                    Vazio
                  </li>
                )}
                {items.map((p) => (
                  <ProspectCard
                    key={p.id}
                    prospect={p}
                    isDragging={draggingId === p.id}
                    onDragStart={() => setDraggingId(p.id)}
                    onWon={() => moveStage(p.id, 'WON')}
                    onLost={() => setLostTargetId(p.id)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <NewProspectModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createProspect} />
      <LostReasonModal
        open={!!lostTargetId}
        onClose={() => setLostTargetId(null)}
        onConfirm={(reason) => {
          if (lostTargetId) markLost(lostTargetId, reason)
          setLostTargetId(null)
        }}
      />
    </div>
  )
}
