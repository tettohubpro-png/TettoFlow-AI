interface StatCardProps {
  label: string
  value: number | string
  accent?: string
}

export function StatCard({ label, value, accent = 'text-emerald-400' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}
