import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Operation } from '@/types/database'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

/**
 * Calendário mensal de postagens aprovadas/publicadas — usa `operations`
 * (deadline + status) que já existe no sistema. Não depende de nenhuma API
 * externa; é a fonte de verdade interna enquanto a integração real com a API
 * do Meta não é aprovada (App Review + verificação de negócio, fora do
 * controle do TettoFlow).
 */
export function PostCalendar({ operations }: { operations: Operation[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const scheduled = useMemo(
    () => operations.filter((op) => op.deadline && (op.status === 'APPROVED' || op.status === 'PUBLISHED')),
    [operations],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, Operation[]>()
    for (const op of scheduled) {
      const key = op.deadline!.slice(0, 10)
      const list = map.get(key) ?? []
      list.push(op)
      map.set(key, list)
    }
    return map
  }, [scheduled])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = new Date().toISOString().slice(0, 10)

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-sky-300">Calendário de publicações</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-32 text-center text-sm text-slate-300">
            {MONTH_LABELS[month]} {year}
          </span>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const ops = byDay.get(key) ?? []
          const isToday = key === todayKey
          return (
            <div
              key={key}
              className={`min-h-16 rounded-lg border p-1 text-left ${
                isToday ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800'
              }`}
            >
              <p className={`text-[11px] ${isToday ? 'text-emerald-300' : 'text-slate-500'}`}>
                {day}
              </p>
              <div className="mt-0.5 space-y-0.5">
                {ops.slice(0, 2).map((op) => (
                  <p
                    key={op.id}
                    title={`${op.title} — ${op.clients?.name ?? ''}`}
                    className={`truncate rounded px-1 text-[10px] ${
                      op.status === 'PUBLISHED'
                        ? 'bg-sky-500/15 text-sky-300'
                        : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    {op.clients?.name ?? op.title}
                  </p>
                ))}
                {ops.length > 2 && (
                  <p className="text-[10px] text-slate-500">+{ops.length - 2}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Aprovado
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-400" /> Publicado
        </span>
      </div>
    </section>
  )
}
