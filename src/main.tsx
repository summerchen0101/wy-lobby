import './realtime/ensureProtobufLong'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import '@fontsource-variable/outfit/wght.css'
import './styles/theme-palette.css'
import './styles/theme-seasonal.css'
import './styles/crown-theme.css'
import './components/AppModal.css'
import './index.css'
import './styles/site-background.css'
import { applyThemeFromEnv } from './theme/applyTheme'
import i18n from './i18n/i18n'
import App from './App.tsx'
import { agentDebugLog } from './debug/agentDebugIngest'

applyThemeFromEnv()

// #region agent log
function registerAgentDebugLifecycle(): void {
  if (typeof window === 'undefined') return
  const nav = typeof performance !== 'undefined' ? performance.navigation : null
  agentDebugLog({
    hypothesisId: 'B',
    location: 'main.tsx:registerAgentDebugLifecycle',
    message: 'bootstrap',
    data: {
      visibility: document.visibilityState,
      navType: nav?.type,
    },
  })
  window.addEventListener('pagehide', (ev) => {
    agentDebugLog({
      hypothesisId: 'E',
      location: 'main.tsx:pagehide',
      message: 'pagehide',
      data: { persisted: (ev as PageTransitionEvent).persisted === true },
    })
  })
  window.addEventListener('pageshow', (ev) => {
    agentDebugLog({
      hypothesisId: 'E',
      location: 'main.tsx:pageshow',
      message: 'pageshow',
      data: { persisted: (ev as PageTransitionEvent).persisted === true },
    })
  })
  document.addEventListener('visibilitychange', () => {
    agentDebugLog({
      hypothesisId: 'B',
      location: 'main.tsx:visibilitychange',
      message: 'visibility',
      data: { state: document.visibilityState },
    })
  })
}
registerAgentDebugLifecycle()
// #endregion

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>,
)
