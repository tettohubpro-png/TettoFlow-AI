import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { AppUser, Membership, MembershipRole, Workspace } from '@/types/database'
import { normalizeLoginIdentifier, isEmployee } from '@/utils/permissions'
import { punchOutUser } from '@/utils/punchClock'

interface AuthContextValue {
  user: User | null
  session: Session | null
  appUser: AppUser | null
  membership: Membership | null
  workspace: Workspace | null
  role: MembershipRole | null
  loading: boolean
  mustChangePassword: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
  clearMustChangePassword: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAppContext = useCallback(async (userId: string) => {
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (userErr) {
      console.error('Erro ao carregar users:', userErr.message)
      setAppUser(null)
      setMembership(null)
      setWorkspace(null)
      return
    }

    if (!userRow) {
      // Só cria OWNER na instalação inicial (zero workspaces). Depois disso,
      // usuários sem membership precisam ser convidados pelo Master.
      const { error: bootErr } = await supabase.rpc('bootstrap_my_workspace', {
        p_name: 'TettoHub',
      })
      if (bootErr) {
        console.error('bootstrap_my_workspace:', bootErr.message)
        setAppUser(null)
        setMembership(null)
        setWorkspace(null)
        return
      }
      const { data: retryUser } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
      if (!retryUser) {
        setAppUser(null)
        setMembership(null)
        setWorkspace(null)
        return
      }
      setAppUser(retryUser as AppUser)
    } else {
      setAppUser(userRow as AppUser)
    }

    const { data: membershipRow, error: memErr } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (memErr || !membershipRow) {
      console.error(
        'Erro ao carregar membership:',
        memErr?.message ?? 'Sem membership — peça ao Master para adicionar na equipe.',
      )
      setMembership(null)
      setWorkspace(null)
      return
    }

    setMembership(membershipRow as Membership)

    const { data: workspaceRow, error: wsErr } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', membershipRow.workspace_id)
      .single()

    if (wsErr) {
      console.error('Erro ao carregar workspace:', wsErr.message)
      setWorkspace(null)
      return
    }

    setWorkspace(workspaceRow as Workspace)
  }, [])

  const refreshSession = useCallback(async () => {
    if (user) await loadAppContext(user.id)
  }, [user, loadAppContext])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) {
        loadAppContext(data.session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setUser(next?.user ?? null)
      if (next?.user) {
        loadAppContext(next.user.id)
      } else {
        setAppUser(null)
        setMembership(null)
        setWorkspace(null)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [loadAppContext])

  const signIn = useCallback(async (identifier: string, password: string) => {
    const email = normalizeLoginIdentifier(identifier)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    if (membership?.role && isEmployee(membership.role) && membership.workspace_id && user?.id) {
      try {
        await punchOutUser(membership.workspace_id, user.id)
      } catch {
        /* ignore punch-out errors on logout */
      }
    }
    await supabase.auth.signOut()
    setAppUser(null)
    setMembership(null)
    setWorkspace(null)
  }, [membership?.role, membership?.workspace_id, user?.id])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeLoginIdentifier(email), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    return { error: error?.message ?? null }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error?.message ?? null }
  }, [])

  const clearMustChangePassword = useCallback(async () => {
    if (!user) return { error: 'Sessão inválida' }
    const { error } = await supabase
      .from('users')
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (!error) {
      setAppUser((prev) => (prev ? { ...prev, must_change_password: false } : prev))
    }
    return { error: error?.message ?? null }
  }, [user])

  const role = membership?.role ?? null
  const mustChangePassword = Boolean(appUser?.must_change_password)

  const value = useMemo(
    () => ({
      user,
      session,
      appUser,
      membership,
      workspace,
      role,
      loading,
      mustChangePassword,
      signIn,
      signInWithGoogle,
      signOut,
      refreshSession,
      resetPassword,
      updatePassword,
      clearMustChangePassword,
    }),
    [
      user,
      session,
      appUser,
      membership,
      workspace,
      role,
      loading,
      mustChangePassword,
      signIn,
      signInWithGoogle,
      signOut,
      refreshSession,
      resetPassword,
      updatePassword,
      clearMustChangePassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
