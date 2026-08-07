import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { CustomCursor } from '@/components/ui/CustomCursor'
import { applyThemeToDocument, THEMES, DEFAULT_THEME_ID, readStoredThemeId } from '@/theme/tokens'
import './index.css'

const bootTheme =
  typeof window !== 'undefined' && localStorage.getItem('tettoflow.theme.ds') === 'v1'
    ? readStoredThemeId()
    : DEFAULT_THEME_ID
applyThemeToDocument(THEMES[bootTheme])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CustomCursor />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
