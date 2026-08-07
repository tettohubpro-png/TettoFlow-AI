export function SupportPage() {
  return (
    <div className="mx-auto max-w-lg">
      <header className="mb-6">
        <h2 className="tf-title text-xl sm:text-2xl">Suporte</h2>
        <p className="tf-subtitle mt-1">Canais para tirar dúvidas e reportar problemas</p>
      </header>

      <div className="space-y-3">
        <a
          href="https://wa.me/5500000000000"
          target="_blank"
          rel="noreferrer"
          className="tf-panel block p-4 no-underline"
          style={{ color: 'inherit' }}
        >
          <p className="font-semibold">WhatsApp</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text3)' }}>
            Atendimento rápido da equipe TettoHub (configure o número real em produção)
          </p>
        </a>
        <a
          href="mailto:tettohub@gmail.com"
          className="tf-panel block p-4 no-underline"
          style={{ color: 'inherit' }}
        >
          <p className="font-semibold">E-mail</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text3)' }}>
            tettohub@gmail.com
          </p>
        </a>
        <div className="tf-panel p-4">
          <p className="font-semibold">Documentação</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text3)' }}>
            Consulte a pasta DOCUMENTATION do repositório para ADRs, módulos e roadmap.
          </p>
        </div>
      </div>
    </div>
  )
}
