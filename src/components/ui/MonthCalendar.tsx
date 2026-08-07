import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

interface MonthCalendarProps<T> {
  items: T[]
  getKey: (item: T) => string
  /** Data no formato 'YYYY-MM-DD...' (ou null/undefined pra ignorar o item). */
  getDate: (item: T) => string | null | undefined
  renderItem: (item: T) => ReactNode
  maxPerDay?: number
  legend?: ReactNode
  emptyHint?: string
}

/** Calendário mensal genérico — usado tanto no Dashboard (posts
 * aprovados/publicados) quanto em Operações (todos os conteúdos). */
export function MonthCalendar<T>({
  items,
  getKey,
  getDate,
  renderItem,
  maxPerDay = 2,
  legend,
}: MonthCalendarProps<T>) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const byDay = useMemo(() => {
    const map = new Map<string, T[]>()
    for (const item of items) {
      const date = getDate(item)
      if (!date) continue
      const key = date.slice(0, 10)
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

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
    <div>
      <div className="mb-3 flex items-center justify-between">
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
        {legend}
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
          const dayItems = byDay.get(key) ?? []
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
                {dayItems.slice(0, maxPerDay).map((item) => (
                  <div key={getKey(item)}>{renderItem(item)}</div>
                ))}
                {dayItems.length > maxPerDay && (
                  <p className="text-[10px] text-slate-500">+{dayItems.length - maxPerDay}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
