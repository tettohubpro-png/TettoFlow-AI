import { useState } from 'react'

const REFERRAL_LINK = 'https://tettoflow-ai.vercel.app/?ref=tettohub'

export function ReferralPage() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(REFERRAL_LINK)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <header className="mb-6">
        <h2 className="tf-title text-xl sm:text-2xl">Indique</h2>
        <p className="tf-subtitle mt-1">Compartilhe o TettoFlow e acompanhe indicações</p>
      </header>

      <div className="tf-panel p-5">
        <p className="text-sm" style={{ color: 'var(--color-text2)' }}>
          Seu link de indicação (mock até existir programa de afiliados):
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input className="tf-input flex-1 font-mono text-xs" readOnly value={REFERRAL_LINK} />
          <button type="button" className="tf-btn tf-btn-primary shrink-0" onClick={copy}>
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
        <p className="mt-4 text-xs" style={{ color: 'var(--color-text3)' }}>
          Em breve: créditos por indicação convertida e painel de acompanhamentos.
        </p>
      </div>
    </div>
  )
}
