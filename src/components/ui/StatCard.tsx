interface StatCardProps {
  label: string
  value: number | string
  accent?: string
}

export function StatCard({ label, value, accent = 'text-emerald-400' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
      <p className="text-xs text-slate-400 sm:text-sm">{label}</p>
      <p className={`mt-2 text-2xl font-bold sm:text-3xl ${accent}`}>{value}</p>
    </div>
  )
}
