import { useTheme } from '@/contexts/ThemeContext'
import { THEME_ORDER, THEMES, type ThemeId } from '@/theme/tokens'
import { useAuth } from '@/contexts/AuthContext'
import { JOB_ROLE_LABELS, ROLE_LABELS } from '@/utils/permissions'
import type { JobRole } from '@/types/database'

export function SettingsPage() {
  const { themeId, setThemeId, theme } = useTheme()
  const { appUser, role, membership, workspace } = useAuth()

  return (
    <div className="tf-fade-in mx-auto max-w-3xl space-y-8">
      <header>
        <p className="tf-eyebrow">Sistema</p>
        <h2 className="tf-title mt-1">Configurações</h2>
        <p className="tf-subtitle mt-1">
          Temas, tipografia e tokens visuais do TettoFlow AI OS
        </p>
      </header>

      <section className="tf-window p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              Temas
            </h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text3)' }}>
              Selecione a aparência. O tema <strong>Tettohub</strong> é o principal
              (design system v1 — violeta + ciano interativo).
            </p>
          </div>
          <span className="tf-chip">{theme.name}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {THEME_ORDER.map((id) => {
            const t = THEMES[id]
            const active = themeId === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setThemeId(id as ThemeId)}
                className="tf-slide-up text-left"
                style={{
                  borderRadius: 'var(--radius-2xl)',
                  border: active
                    ? '2px solid var(--color-accent)'
                    : '1px solid var(--color-border)',
                  background: 'var(--color-bg2)',
                  padding: '1rem',
                  boxShadow: active ? 'var(--shadow-glow)' : 'none',
                }}
              >
                <div
                  className="mb-3 overflow-hidden rounded-xl"
                  style={{
                    border: '1px solid var(--color-border)',
                    background: t.preview.bg,
                  }}
                >
                  <div
                    className="flex h-16 items-end gap-2 p-3"
                    style={{ background: t.preview.bg }}
                  >
                    <div
                      className="h-8 flex-1 rounded-lg"
                      style={{ background: t.preview.card }}
                    />
                    <div
                      className="h-8 w-16 rounded-lg"
                      style={{ background: t.preview.accent }}
                    />
                  </div>
                </div>
                <p className="font-semibold" style={{ color: t.preview.text }}>
                  {t.name}
                  {t.favorite ? ' ★' : ''}
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-text3)' }}>
                  {t.description}
                </p>
                {t.favorite && (
                  <p
                    className="mt-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Favorito · Principal
                  </p>
                )}
                {active && (
                  <p
                    className="mt-2 text-xs font-semibold"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Em uso
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="tf-window p-5 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold">Tokens ativos</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <TokenRow label="Accent" value={theme.colors.accent} swatch={theme.colors.accent} />
          <TokenRow label="Background" value={theme.colors.bg} swatch={theme.colors.bg} />
          <TokenRow label="Card / Surface" value={theme.colors.bg3} swatch={theme.colors.bg3} />
          <TokenRow label="Border" value={theme.colors.border} swatch={theme.colors.border} />
          <TokenRow label="Fonte UI" value="Poppins" />
          <TokenRow label="Fonte Mono" value="DM Mono" />
          <TokenRow label="Controle (altura)" value={theme.sizes.controlMd} />
          <TokenRow label="Raio card" value={theme.radii['2xl']} />
          <TokenRow label="Motion" value={theme.motion.normal} />
          <TokenRow label="Sombra glow" value="accent glow" />
        </div>
      </section>

      <section className="tf-window p-5 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold">Tipografia</h3>
        <div className="space-y-3">
          <p className="tf-eyebrow">Label mono 8–10px</p>
          <p style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Display 4xl
          </p>
          <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Título 2xl</p>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text2)' }}>
            Corpo base — botões, formulários e cards usam tamanhos padronizados.
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text3)' }}>
            Auxiliar xs — metadados e legendas
          </p>
        </div>
      </section>

      <section className="tf-window p-5 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold">Prévia de componentes</h3>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="tf-btn tf-btn-primary">
            Botão primário
          </button>
          <button type="button" className="tf-btn tf-btn-ghost">
            Botão ghost
          </button>
          <button type="button" className="tf-btn tf-btn-soft">
            Soft
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="tf-label">Campo de texto</span>
            <input className="tf-input" placeholder="Digite algo…" />
          </label>
          <label>
            <span className="tf-label">Select</span>
            <select className="tf-select">
              <option>Opção A</option>
              <option>Opção B</option>
            </select>
          </label>
        </div>
      </section>

      <section className="tf-window p-5 sm:p-6">
        <h3 className="mb-3 text-lg font-semibold">Conta</h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="tf-label">Usuário</dt>
            <dd>{appUser?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="tf-label">E-mail</dt>
            <dd>{appUser?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="tf-label">Papel</dt>
            <dd>{role ? ROLE_LABELS[role] : '—'}</dd>
          </div>
          <div>
            <dt className="tf-label">Função</dt>
            <dd>
              {membership?.job_role
                ? JOB_ROLE_LABELS[membership.job_role as JobRole] ?? membership.job_role
                : '—'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="tf-label">Workspace</dt>
            <dd>{workspace?.name ?? '—'}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

function TokenRow({
  label,
  value,
  swatch,
}: {
  label: string
  value: string
  swatch?: string
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
    >
      <div className="min-w-0">
        <p className="text-xs" style={{ color: 'var(--color-text3)' }}>
          {label}
        </p>
        <p className="truncate font-mono text-xs" style={{ color: 'var(--color-text2)' }}>
          {value}
        </p>
      </div>
      {swatch && (
        <span
          className="h-8 w-8 shrink-0 rounded-lg border"
          style={{ background: swatch, borderColor: 'var(--color-border)' }}
          title={swatch}
        />
      )}
    </div>
  )
}
