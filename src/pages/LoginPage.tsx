import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError(err)
    else navigate('/')
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error: err } = await signInWithGoogle()
    if (err) {
      setError(err)
      setGoogleLoading(false)
    }
  }

  return (
    <AuthLayout subtitle="Entre com suas credenciais">
      <form onSubmit={handleSubmit}>
        {error && (
          <p
            className="mb-4 rounded-[10px] px-3 py-2 text-sm"
            style={{ background: 'var(--color-danger-dim)', color: 'var(--color-danger)' }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="tf-btn tf-btn-ghost w-full"
        >
          {googleLoading ? 'Redirecionando...' : 'Continuar com Google'}
        </button>

        <div className="my-5 flex items-center gap-3 text-xs" style={{ color: 'var(--color-text3)' }}>
          <span className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
          ou e-mail
          <span className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
        </div>

        <label className="mb-3.5 block">
          <span className="tf-label">E-mail ou usuário</span>
          <input
            type="text"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin ou seu@email.com"
            className="tf-input"
          />
        </label>

        <label className="mb-3.5 block">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="tf-label" style={{ marginBottom: 0 }}>
              Senha
            </span>
            <Link
              to="/recuperar-senha"
              className="text-xs font-medium"
              style={{ color: 'var(--color-accent)' }}
            >
              Esqueci minha senha
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="tf-input"
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute top-1/2 flex -translate-y-1/2 items-center"
              style={{ right: 12, color: 'var(--color-text3)', background: 'none', border: 'none' }}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        <button type="submit" disabled={loading} className="tf-btn tf-btn-primary mt-1 w-full">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </AuthLayout>
  )
}
