import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  THEMES,
  THEME_STORAGE_KEY,
  applyThemeToDocument,
  DEFAULT_THEME_ID,
  type ThemeId,
  type ThemeTokens,
} from '@/theme/tokens'

interface ThemeContextValue {
  themeId: ThemeId
  theme: ThemeTokens
  setThemeId: (id: ThemeId) => void
  themes: ThemeTokens[]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID
  try {
    const migrated = localStorage.getItem('tettoflow.theme.ds')
    if (migrated !== 'v1') {
      localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME_ID)
      localStorage.setItem('tettoflow.theme.ds', 'v1')
      return DEFAULT_THEME_ID
    }
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw && raw in THEMES) return raw as ThemeId
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_ID
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(() => resolveInitialTheme())

  useEffect(() => {
    applyThemeToDocument(THEMES[themeId])
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId)
      localStorage.setItem('tettoflow.theme.ds', 'v1')
    } catch {
      /* ignore */
    }
  }, [themeId])

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id)
  }, [])

  const value = useMemo(
    () => ({
      themeId,
      theme: THEMES[themeId],
      setThemeId,
      themes: Object.values(THEMES),
    }),
    [themeId, setThemeId],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  return ctx
}
