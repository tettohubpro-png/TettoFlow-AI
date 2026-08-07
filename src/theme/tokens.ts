export type ThemeId = 'tettohub' | 'yelu' | 'midnight' | 'ocean' | 'light'

export interface ThemeTokens {
  id: ThemeId
  name: string
  description: string
  favorite?: boolean
  preview: {
    bg: string
    accent: string
    card: string
    text: string
  }
  colors: {
    bg: string
    bg2: string
    bg3: string
    bg4: string
    border: string
    border2: string
    text: string
    text2: string
    text3: string
    accent: string
    accentDim: string
    accentGlow: string
    accentSoft: string
    accentDark: string
    success: string
    successDim: string
    warning: string
    warningDim: string
    danger: string
    dangerDim: string
    info: string
    infoDim: string
    white: string
    btnPrimaryBg: string
    btnPrimaryText: string
    btnPrimaryHover: string
    btnPrimaryBorder: string
    cursorDot: string
    cursorRing: string
    gradientBrand: string
    brandPink: string
    brandOrange: string
    brandYellow: string
  }
  radii: {
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
    full: string
  }
  space: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
  }
  sizes: {
    controlSm: string
    controlMd: string
    controlLg: string
    sidebar: string
    iconSm: string
    iconMd: string
    iconLg: string
  }
  fonts: {
    sans: string
    mono: string
    display: string
  }
  fontSizes: {
    '2xs': string
    xs: string
    sm: string
    base: string
    md: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
    '4xl': string
  }
  shadows: {
    sm: string
    md: string
    lg: string
    glow: string
  }
  motion: {
    fast: string
    normal: string
    slow: string
    ease: string
    easeOut: string
  }
}

const sharedRadiiSizes = {
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    full: '9999px',
  },
  space: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
    '2xl': '1.5rem',
  },
  sizes: {
    controlSm: '36px',
    controlMd: '44px',
    controlLg: '52px',
    sidebar: '15rem',
    iconSm: '14px',
    iconMd: '18px',
    iconLg: '24px',
  },
  fontSizes: {
    '2xs': '0.625rem',
    xs: '0.75rem',
    sm: '0.8125rem',
    base: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
} as const

const tettohubMotion = {
  fast: '200ms',
  normal: '400ms',
  slow: '600ms',
  ease: 'ease-in-out',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const

const defaultMotion = {
  fast: '120ms',
  normal: '180ms',
  slow: '280ms',
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const

/** Design System v1 — Tettohub (principal / favorito) */
export const tettohubTheme: ThemeTokens = {
  id: 'tettohub',
  name: 'Tettohub',
  description:
    'Violeta profunda + ciano só em interação — design system oficial Tettohub v1',
  favorite: true,
  preview: { bg: '#1E1039', accent: '#3FD9CE', card: '#2E1A5C', text: '#FFFFFF' },
  colors: {
    bg: '#1E1039',
    bg2: '#140B2E',
    bg3: '#2E1A5C',
    bg4: '#452A85',
    border: '#452A85',
    border2: '#6B3FA0',
    text: '#FFFFFF',
    text2: '#C9BEE8',
    text3: '#8778B0',
    accent: '#3FD9CE',
    accentDim: 'rgba(63, 217, 206, 0.2)',
    accentGlow: 'rgba(63, 217, 206, 0.45)',
    accentSoft: '#7FE9E1',
    accentDark: '#2BB5AC',
    success: '#4ade80',
    successDim: 'rgba(74, 222, 128, 0.15)',
    warning: '#F2994A',
    warningDim: 'rgba(242, 153, 74, 0.15)',
    danger: '#E14B84',
    dangerDim: 'rgba(225, 75, 132, 0.15)',
    info: '#3FD9CE',
    infoDim: 'rgba(63, 217, 206, 0.15)',
    white: '#FFFFFF',
    btnPrimaryBg: '#2E1A5C',
    btnPrimaryText: '#FFFFFF',
    btnPrimaryHover: '#2E1A5C',
    btnPrimaryBorder: '#6B3FA0',
    cursorDot: '#3FD9CE',
    cursorRing: 'rgba(63, 217, 206, 0.45)',
    gradientBrand: 'linear-gradient(135deg, #140B2E 0%, #2E1A5C 45%, #452A85 100%)',
    brandPink: '#E14B84',
    brandOrange: '#F2994A',
    brandYellow: '#F2C94C',
  },
  fonts: {
    sans: '"Inter", "Manrope", system-ui, sans-serif',
    mono: '"DM Mono", ui-monospace, monospace',
    display: '"Sora", "Poppins", "Space Grotesk", sans-serif',
  },
  shadows: {
    sm: '0 1px 2px rgba(20, 11, 46, 0.45)',
    md: '0 8px 24px rgba(20, 11, 46, 0.5)',
    lg: '0 16px 48px rgba(20, 11, 46, 0.6)',
    glow: '0 0 24px rgba(63, 217, 206, 0.45)',
  },
  motion: tettohubMotion,
  ...sharedRadiiSizes,
}

export const yeluTheme: ThemeTokens = {
  id: 'yelu',
  name: 'Yelu Gold',
  description: 'Dark premium com accent dourado — igual ao app de referência',
  preview: { bg: '#0a0a0a', accent: '#f5c518', card: '#18181c', text: '#f8f8f8' },
  colors: {
    bg: '#0a0a0a',
    bg2: '#111114',
    bg3: '#18181c',
    bg4: '#1c1c1c',
    border: '#2e2e2e',
    border2: '#404040',
    text: '#f8f8f8',
    text2: '#d4d4d4',
    text3: '#888888',
    accent: '#f5c518',
    accentDim: '#f5c5181f',
    accentGlow: '#f5c51847',
    accentSoft: '#ffd93d',
    accentDark: '#d4a800',
    success: '#4ade80',
    successDim: '#4ade801a',
    warning: '#f97316',
    warningDim: '#f973161a',
    danger: '#ff4d4d',
    dangerDim: '#ff4d4d1a',
    info: '#5aa0f0',
    infoDim: '#5aa0f01a',
    white: '#ffffff',
    btnPrimaryBg: '#f5c518',
    btnPrimaryText: '#0a0a0a',
    btnPrimaryHover: '#ffd93d',
    btnPrimaryBorder: '#f5c518',
    cursorDot: '#f8f8f8',
    cursorRing: '#f8f8f866',
    gradientBrand: 'linear-gradient(135deg, #d4a800 0%, #f5c518 60%, #ffd93d 100%)',
    brandPink: '#E14B84',
    brandOrange: '#F2994A',
    brandYellow: '#F2C94C',
  },
  fonts: {
    sans: '"Poppins", "Segoe UI", system-ui, sans-serif',
    mono: '"DM Mono", ui-monospace, monospace',
    display: '"Poppins", "Segoe UI", system-ui, sans-serif',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.4)',
    md: '0 8px 24px rgba(0,0,0,0.45)',
    lg: '0 16px 48px rgba(0,0,0,0.55)',
    glow: '0 4px 20px rgba(245,197,24,0.25)',
  },
  motion: defaultMotion,
  ...sharedRadiiSizes,
}

export const midnightTheme: ThemeTokens = {
  id: 'midnight',
  name: 'Tetto Midnight',
  description: 'Dark slate com accent esmeralda — tema clássico do TettoFlow',
  preview: { bg: '#020617', accent: '#10b981', card: '#0f172a', text: '#f1f5f9' },
  colors: {
    bg: '#020617',
    bg2: '#0f172a',
    bg3: '#111827',
    bg4: '#1e293b',
    border: '#1e293b',
    border2: '#334155',
    text: '#f1f5f9',
    text2: '#cbd5e1',
    text3: '#64748b',
    accent: '#10b981',
    accentDim: '#10b98133',
    accentGlow: '#10b98155',
    accentSoft: '#34d399',
    accentDark: '#059669',
    success: '#34d399',
    successDim: '#34d3991a',
    warning: '#fbbf24',
    warningDim: '#fbbf241a',
    danger: '#f87171',
    dangerDim: '#f871711a',
    info: '#38bdf8',
    infoDim: '#38bdf81a',
    white: '#ffffff',
    btnPrimaryBg: '#059669',
    btnPrimaryText: '#ffffff',
    btnPrimaryHover: '#10b981',
    btnPrimaryBorder: '#059669',
    cursorDot: '#e2e8f0',
    cursorRing: '#94a3b866',
    gradientBrand: 'linear-gradient(135deg, #059669 0%, #10b981 60%, #34d399 100%)',
    brandPink: '#E14B84',
    brandOrange: '#F2994A',
    brandYellow: '#F2C94C',
  },
  fonts: {
    sans: '"Inter", "Segoe UI", system-ui, sans-serif',
    mono: '"DM Mono", ui-monospace, monospace',
    display: '"Sora", "Poppins", sans-serif',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.35)',
    md: '0 8px 24px rgba(2,6,23,0.55)',
    lg: '0 16px 48px rgba(2,6,23,0.65)',
    glow: '0 4px 20px rgba(16,185,129,0.28)',
  },
  motion: defaultMotion,
  ...sharedRadiiSizes,
}

export const oceanTheme: ThemeTokens = {
  id: 'ocean',
  name: 'Yelu Ocean',
  description: 'Dark indigo com accent azul — variante do app de referência',
  preview: { bg: '#0d0f1a', accent: '#7aa2f7', card: '#131629', text: '#e8eaf6' },
  colors: {
    bg: '#0d0f1a',
    bg2: '#131629',
    bg3: '#1a1d32',
    bg4: '#222540',
    border: '#252840',
    border2: '#30345a',
    text: '#e8eaf6',
    text2: '#b0b8d8',
    text3: '#5a6080',
    accent: '#7aa2f7',
    accentDim: '#7aa2f71a',
    accentGlow: '#7aa2f747',
    accentSoft: '#a5b4fc',
    accentDark: '#5aa0f0',
    success: '#4ade80',
    successDim: '#4ade801a',
    warning: '#f5c518',
    warningDim: '#f5c5181a',
    danger: '#ff4d4d',
    dangerDim: '#ff4d4d1a',
    info: '#5aa0f0',
    infoDim: '#5aa0f01a',
    white: '#ffffff',
    btnPrimaryBg: '#7aa2f7',
    btnPrimaryText: '#0d0f1a',
    btnPrimaryHover: '#9bb8ff',
    btnPrimaryBorder: '#7aa2f7',
    cursorDot: '#b4bee6',
    cursorRing: '#b4bee659',
    gradientBrand: 'linear-gradient(135deg, #5aa0f0 0%, #7aa2f7 60%, #a5b4fc 100%)',
    brandPink: '#E14B84',
    brandOrange: '#F2994A',
    brandYellow: '#F2C94C',
  },
  fonts: {
    sans: '"Inter", system-ui, sans-serif',
    mono: '"DM Mono", ui-monospace, monospace',
    display: '"Sora", "Poppins", sans-serif',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.4)',
    md: '0 8px 24px rgba(0,0,0,0.5)',
    lg: '0 16px 48px rgba(0,0,0,0.6)',
    glow: '0 4px 20px rgba(122,162,247,0.28)',
  },
  motion: defaultMotion,
  ...sharedRadiiSizes,
}

export const lightTheme: ThemeTokens = {
  id: 'light',
  name: 'Yelu Light',
  description: 'Claro minimalista com accent dourado',
  preview: { bg: '#ffffff', accent: '#d4a800', card: '#f8f8f8', text: '#0a0a0a' },
  colors: {
    bg: '#ffffff',
    bg2: '#f8f8f8',
    bg3: '#f0f0f0',
    bg4: '#e8e8e8',
    border: '#e0e0e0',
    border2: '#cccccc',
    text: '#0a0a0a',
    text2: '#333333',
    text3: '#777777',
    accent: '#d4a800',
    accentDim: '#d4a8001a',
    accentGlow: '#d4a80040',
    accentSoft: '#f5c518',
    accentDark: '#b38f00',
    success: '#16a34a',
    successDim: '#16a34a1a',
    warning: '#f97316',
    warningDim: '#f973161a',
    danger: '#dc2626',
    dangerDim: '#dc26261a',
    info: '#1d4ed8',
    infoDim: '#1d4ed81a',
    white: '#ffffff',
    btnPrimaryBg: '#0a0a0a',
    btnPrimaryText: '#ffffff',
    btnPrimaryHover: '#222222',
    btnPrimaryBorder: '#0a0a0a',
    cursorDot: '#0a0a0a',
    cursorRing: '#0a0a0a40',
    gradientBrand: 'linear-gradient(135deg, #b38f00 0%, #d4a800 60%, #f5c518 100%)',
    brandPink: '#E14B84',
    brandOrange: '#F2994A',
    brandYellow: '#F2C94C',
  },
  fonts: {
    sans: '"Inter", system-ui, sans-serif',
    mono: '"DM Mono", ui-monospace, monospace',
    display: '"Sora", "Poppins", sans-serif',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.06)',
    md: '0 8px 24px rgba(0,0,0,0.08)',
    lg: '0 16px 48px rgba(0,0,0,0.12)',
    glow: '0 4px 20px rgba(212,168,0,0.22)',
  },
  motion: defaultMotion,
  ...sharedRadiiSizes,
}

export const DEFAULT_THEME_ID: ThemeId = 'tettohub'

export const THEMES: Record<ThemeId, ThemeTokens> = {
  tettohub: tettohubTheme,
  yelu: yeluTheme,
  midnight: midnightTheme,
  ocean: oceanTheme,
  light: lightTheme,
}

export const THEME_ORDER: ThemeId[] = ['tettohub', 'yelu', 'midnight', 'ocean', 'light']

export const THEME_STORAGE_KEY = 'tettoflow.theme'

export function applyThemeToDocument(theme: ThemeTokens) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme.id)
  root.style.colorScheme = theme.id === 'light' ? 'light' : 'dark'

  const set = (key: string, value: string) => root.style.setProperty(key, value)

  set('--color-bg', theme.colors.bg)
  set('--color-bg2', theme.colors.bg2)
  set('--color-bg3', theme.colors.bg3)
  set('--color-bg4', theme.colors.bg4)
  set('--color-border', theme.colors.border)
  set('--color-border2', theme.colors.border2)
  set('--color-text', theme.colors.text)
  set('--color-text2', theme.colors.text2)
  set('--color-text3', theme.colors.text3)
  set('--color-accent', theme.colors.accent)
  set('--color-accent-dim', theme.colors.accentDim)
  set('--color-accent-glow', theme.colors.accentGlow)
  set('--color-accent-soft', theme.colors.accentSoft)
  set('--color-accent-dark', theme.colors.accentDark)
  set('--color-success', theme.colors.success)
  set('--color-success-dim', theme.colors.successDim)
  set('--color-warning', theme.colors.warning)
  set('--color-warning-dim', theme.colors.warningDim)
  set('--color-danger', theme.colors.danger)
  set('--color-danger-dim', theme.colors.dangerDim)
  set('--color-info', theme.colors.info)
  set('--color-info-dim', theme.colors.infoDim)
  set('--color-white', theme.colors.white)
  set('--color-btn-primary-bg', theme.colors.btnPrimaryBg)
  set('--color-btn-primary-text', theme.colors.btnPrimaryText)
  set('--color-btn-primary-hover', theme.colors.btnPrimaryHover)
  set('--color-btn-primary-border', theme.colors.btnPrimaryBorder)
  set('--cursor-dot', theme.colors.cursorDot)
  set('--cursor-ring', theme.colors.cursorRing)
  set('--gradient-brand', theme.colors.gradientBrand)
  set('--color-brand-pink', theme.colors.brandPink)
  set('--color-brand-orange', theme.colors.brandOrange)
  set('--color-brand-yellow', theme.colors.brandYellow)

  set('--radius-sm', theme.radii.sm)
  set('--radius-md', theme.radii.md)
  set('--radius-lg', theme.radii.lg)
  set('--radius-xl', theme.radii.xl)
  set('--radius-2xl', theme.radii['2xl'])
  set('--radius-full', theme.radii.full)

  set('--space-xs', theme.space.xs)
  set('--space-sm', theme.space.sm)
  set('--space-md', theme.space.md)
  set('--space-lg', theme.space.lg)
  set('--space-xl', theme.space.xl)
  set('--space-2xl', theme.space['2xl'])

  set('--size-control-sm', theme.sizes.controlSm)
  set('--size-control-md', theme.sizes.controlMd)
  set('--size-control-lg', theme.sizes.controlLg)
  set('--size-sidebar', theme.sizes.sidebar)
  set('--size-icon-sm', theme.sizes.iconSm)
  set('--size-icon-md', theme.sizes.iconMd)
  set('--size-icon-lg', theme.sizes.iconLg)

  set('--font-sans', theme.fonts.sans)
  set('--font-mono', theme.fonts.mono)
  set('--font-display', theme.fonts.display)

  set('--text-2xs', theme.fontSizes['2xs'])
  set('--text-xs', theme.fontSizes.xs)
  set('--text-sm', theme.fontSizes.sm)
  set('--text-base', theme.fontSizes.base)
  set('--text-md', theme.fontSizes.md)
  set('--text-lg', theme.fontSizes.lg)
  set('--text-xl', theme.fontSizes.xl)
  set('--text-2xl', theme.fontSizes['2xl'])
  set('--text-3xl', theme.fontSizes['3xl'])
  set('--text-4xl', theme.fontSizes['4xl'])

  set('--shadow-sm', theme.shadows.sm)
  set('--shadow-md', theme.shadows.md)
  set('--shadow-lg', theme.shadows.lg)
  set('--shadow-glow', theme.shadows.glow)

  set('--motion-fast', theme.motion.fast)
  set('--motion-normal', theme.motion.normal)
  set('--motion-slow', theme.motion.slow)
  set('--ease-standard', theme.motion.ease)
  set('--ease-out', theme.motion.easeOut)

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme.colors.bg)
}

export function readStoredThemeId(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw && raw in THEMES) return raw as ThemeId
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_ID
}
