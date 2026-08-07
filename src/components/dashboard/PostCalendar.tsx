import { useMemo } from 'react'
import { MonthCalendar } from '@/components/ui/MonthCalendar'
import type { Operation } from '@/types/database'

/**
 * Calendário mensal de postagens aprovadas/publicadas — usa `operations`
 * (deadline + status) que já existe no sistema. Não depende de nenhuma API
 * externa; é a fonte de verdade interna enquanto a integração real com a API
 * do Meta não é aprovada (App Review + verificação de negócio, fora do
 * controle do TettoFlow).
 */
export function PostCalendar({ operations }: { operations: Operation[] }) {
  const scheduled = useMemo(
    () =>
      operations.filter(
        (op) => op.deadline && (op.status === 'APPROVED' || op.status === 'PUBLISHED'),
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
          <p
            title={`${op.title} — ${op.clients?.name ?? ''}`}
            className={`truncate rounded px-1 text-[10px] ${
              op.status === 'PUBLISHED'
                ? 'bg-sky-500/15 text-sky-300'
                : 'bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {op.clients?.name ?? op.title}
          </p>
        )}
        legend={
          <div className="flex gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Aprovado
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Publicado
            </span>
          </div>
        }
      />
    </section>
  )
}
