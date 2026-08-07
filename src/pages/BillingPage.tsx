import { Link } from 'react-router-dom'

const BENEFITS = [
  'Clientes, conteúdo, tarefas e financeiro ilimitados',
  'WhatsApp IA e agente operacional',
  'Departamentos, aprovações e relatórios',
  'Temas e personalização da interface',
  'Suporte prioritário TettoHub',
]

export function BillingPage() {
  return (
    <div className="mx-auto max-w-lg">
      <header className="mb-6">
        <h2 className="tf-title text-xl sm:text-2xl">Assinatura</h2>
        <p className="tf-subtitle mt-1">Plano atual e benefícios (billing mock)</p>
      </header>

      <div className="tf-panel p-5">
        <p className="tf-eyebrow">Plano atual</p>
        <h3 className="mt-2 text-2xl font-bold">Max</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text3)' }}>
          Renova em 27 dias · R$ 0,00 (ambiente de demonstração)
        </p>

        <ul className="mt-5 space-y-2">
          {BENEFITS.map((b) => (
            <li key={b} className="flex gap-2 text-sm" style={{ color: 'var(--color-text2)' }}>
              <span style={{ color: 'var(--color-accent)' }}>✓</span>
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="tf-btn tf-btn-primary" disabled>
            Gerenciar cobrança
          </button>
          <Link to="/suporte" className="tf-btn tf-btn-ghost">
            Falar com suporte
          </Link>
        </div>
      </div>
    </div>
  )
}
