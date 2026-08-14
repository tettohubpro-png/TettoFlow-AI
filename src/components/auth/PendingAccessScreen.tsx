import { Hourglass, ShieldX } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Tela mostrada quando o login foi bem-sucedido (Google, senha, etc.) mas o
 * usuário ainda não tem acesso liberado pelo Master — seja porque é a
 * primeira vez que aparece (pendente) ou porque foi bloqueado explicitamente.
 */
export function PendingAccessScreen({ status }: { status: 'pending' | 'blocked' }) {
  const { user, signOut } = useAuth()
  const blocked = status === 'blocked'

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="tf-window w-full max-w-md p-6 text-center" style={{ background: 'var(--color-bg2)' }}>
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: blocked ? 'var(--color-danger-dim)' : 'var(--color-warning-dim)',
            color: blocked ? 'var(--color-danger)' : 'var(--color-warning)',
          }}
        >
          {blocked ? <ShieldX size={22} /> : <Hourglass size={22} />}
        </div>

        <h1 className="text-lg font-bold">
          {blocked ? 'Acesso bloqueado' : 'Aguardando aprovação'}
        </h1>

        <p className="mt-2 text-sm" style={{ color: 'var(--color-text3)' }}>
          {blocked
            ? 'O administrador bloqueou o acesso desta conta ao sistema.'
            : 'Seu login foi reconhecido, mas ainda não foi autorizado pelo administrador.'}
        </p>

        {user?.email && (
          <p className="mt-3 truncate text-xs" style={{ color: 'var(--color-text3)' }}>
            Conta: {user.email}
          </p>
        )}

        {!blocked && (
          <p className="mt-3 text-xs" style={{ color: 'var(--color-text3)' }}>
            Peça para o Master abrir Equipe → Controle de acesso e liberar o seu usuário.
          </p>
        )}

        <button type="button" onClick={() => signOut()} className="tf-btn tf-btn-ghost mt-5 w-full">
          Sair
        </button>
      </div>
    </div>
  )
}
