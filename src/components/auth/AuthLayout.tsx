import type { ReactNode } from 'react'

const FEATURES: [string, string][] = [
  ['Clientes', 'Gestão centralizada'],
  ['Conteúdo', 'Kanban de aprovação'],
  ['Financeiro', 'Controle de receitas'],
]

const AUTH_COVER = '/brand/auth-cover.png'

/**
 * Layout compartilhado das telas de autenticação (login, recuperar senha,
 * redefinir senha): capa de marca + elementos 3D à esquerda, formulário à direita.
 */
export function AuthLayout({
  eyebrow = 'TettoFlow AI OS',
  subtitle,
  children,
}: {
  eyebrow?: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row" style={{ background: 'var(--color-bg)' }}>
      {/* Banner mobile — capa no topo */}
      <div className="auth-cover-banner relative h-36 w-full overflow-hidden sm:h-44 lg:hidden">
        <img
          src={AUTH_COVER}
          alt="TettoHub — estratégia, conteúdo e conexão"
          className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
        />
        <div className="auth-cover-scrim absolute inset-0" />
        <div className="relative z-10 flex h-full flex-col justify-end p-4">
          <p className="tf-eyebrow text-white/90">TettoHub</p>
          <p className="mt-1 text-[13px] font-semibold text-white">Da estratégia à entrega.</p>
        </div>
      </div>

      {/* Painel desktop — capa full-bleed atrás dos elementos 3D */}
      <div className="auth-cover-stage relative hidden flex-1 flex-col justify-between overflow-hidden p-10 xl:p-12 lg:flex">
        <img
          src={AUTH_COVER}
          alt=""
          aria-hidden
          className="auth-cover-bg absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="auth-cover-scrim absolute inset-0" />
        <div className="auth-cover-vignette absolute inset-0" />

        {/* Camada 3D flutuando na frente da capa */}
        <div className="auth-cover-3d pointer-events-none absolute inset-0" aria-hidden>
          <div className="auth-float auth-float-a" />
          <div className="auth-float auth-float-b" />
          <div className="auth-float auth-float-c" />
          <div className="auth-float auth-float-orb" />
        </div>

        <div className="relative z-10">
          <p className="tf-eyebrow text-white/90">TettoHub</p>
          <p
            className="mt-2 font-mono text-[8px] uppercase tracking-[0.2em]"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            Social Media OS
          </p>
        </div>

        <div className="relative z-10 max-w-md">
          <h1
            className="mb-5 font-extrabold leading-[1.08] text-white drop-shadow-[0_8px_24px_rgba(20,11,46,0.55)]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.4vw, 3rem)',
              letterSpacing: '-0.04em',
            }}
          >
            Da estratégia à entrega.
            <br />
            Controle total da sua operação.
          </h1>
          <p
            className="max-w-sm text-[15px] leading-relaxed text-white/80"
            style={{ textShadow: '0 2px 12px rgba(20,11,46,0.65)' }}
          >
            Clientes, conteúdo, finanças e equipe — tudo em um único lugar.
          </p>
        </div>

        <div className="relative z-10">
          <div className="mb-6 h-px" style={{ background: 'rgba(255,255,255,0.14)' }} />
          <div className="flex gap-8">
            {FEATURES.map(([title, sub]) => (
              <div key={title}>
                <div className="text-[13px] font-bold text-white/90">{title}</div>
                <div className="mt-0.5 text-[11px] text-white/45">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="relative z-10 flex w-full max-w-lg flex-shrink-0 flex-col items-center justify-center px-6 py-10 safe-pt safe-pb sm:px-8 lg:min-h-dvh"
        style={{
          background: 'var(--color-bg2)',
          borderLeft: '1px solid color-mix(in srgb, var(--color-text) 5%, transparent)',
        }}
      >
        <div className="tf-window tf-slide-up w-full max-w-sm p-8">
          <p className="tf-eyebrow text-center">{eyebrow}</p>
          {subtitle && (
            <p className="mb-7 mt-2 text-center text-[13px]" style={{ color: 'var(--color-text3)' }}>
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
