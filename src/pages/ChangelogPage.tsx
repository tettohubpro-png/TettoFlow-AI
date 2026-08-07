const RELEASES = [
  {
    version: '0.3.0',
    date: '2026-08-06',
    items: [
      'Menu estilo Yelu: Principal, Operação Tetto e Conta',
      'Novas seções: Conteúdo, Agenda, Equipe e Assinatura',
      'Design system Tettohub com temas trocáveis',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-08-04',
    items: [
      'Solicitações no estilo Trello com checklist e anexos',
      'Hierarquia de papéis e departamentos',
      'Relatórios de tempo e alertas de cliente',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-07-30',
    items: ['Lançamento inicial do TettoFlow AI OS', 'CRM, operações, WhatsApp IA e dashboard'],
  },
]

export function ChangelogPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h2 className="tf-title text-xl sm:text-2xl">Novidades</h2>
        <p className="tf-subtitle mt-1">O que mudou no TettoFlow</p>
      </header>

      <ol className="space-y-4">
        {RELEASES.map((r) => (
          <li key={r.version} className="tf-panel p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">v{r.version}</h3>
              <time className="text-xs" style={{ color: 'var(--color-text3)' }}>
                {r.date}
              </time>
            </div>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm" style={{ color: 'var(--color-text2)' }}>
              {r.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
