import { useMemo } from 'react'
import { MonthCalendar } from '@/components/ui/MonthCalendar'
import type { Operation } from '@/types/database'

/**
 * Calendário mensal de postagens aprovadas/publicadas — usa `operations`
 * (deadline + status). Clique abre o painel de edição/download no Conteúdo.
 */
export function PostCalendar({
  operations,
  onSelect,
  selectedId,
}: {
  operations: Operation[]
  onSelect?: (op: Operation) => void
  selectedId?: string | null
}) {
  const scheduled = useMemo(
    () =>
      operations.filter(
        (op) =>
          op.deadline &&
          (op.status === 'APPROVED' ||
            op.status === 'PUBLISHED' ||
            op.status === 'REVIEW' ||
            op.status === 'CLIENT'),
      ),
    [operations],
  )

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <h3 className="mb-3 font-semibold text-sky-300">Calendário de publicações</h3>
      <MonthCalendar
        items={scheduled}
        getKey={(op) => op.id}
        getDate={(op) => op.deadline}
        renderItem={(op) => (
          <button
            type="button"
            onClick={() => onSelect?.(op)}
            title={`${op.title} — ${op.clients?.name ?? ''} · clique para editar/baixar`}
            className={`flex w-full truncate rounded px-1 text-left text-[10px] transition ${
              selectedId === op.id
                ? 'ring-1 ring-emerald-400/60 bg-emerald-500/25 text-emerald-200'
                : op.status === 'PUBLISHED'
                  ? 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                  : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
            }`}
          >
            {op.clients?.name ?? op.title}
          </button>
        )}
        legend={
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Aprovado / em revisão
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Publicado
            </span>
            <span>Clique no item para editar data ou baixar o post</span>
          </div>
        }
      />
    </section>
  )
}
