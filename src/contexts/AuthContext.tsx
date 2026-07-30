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

interface AuthContextValue {
  user: User | null
  session: Session | null
  appUser: AppUser | null
  membership: Membership | null
  workspace: Workspace | null
  role: MembershipRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
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
      setAppUser(null)
      setMembership(null)
      setWorkspace(null)
      return
    }

    setAppUser(userRow as AppUser)

    const { data: membershipRow, error: memErr } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (memErr || !membershipRow) {
      console.error('Erro ao carregar membership:', memErr?.message)
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

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setAppUser(null)
    setMembership(null)
    setWorkspace(null)
  }, [])

  const role = membership?.role ?? null

  const value = useMemo(
    () => ({
      user,
      session,
      appUser,
      membership,
      workspace,
      role,
      loading,
      signIn,
      signOut,
      refreshSession,
    }),
    [user, session, appUser, membership, workspace, role, loading, signIn, signOut, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
