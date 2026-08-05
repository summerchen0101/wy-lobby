import './realtime/ensureProtobufLong'
import './lib/zendeskPrefetch'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import '@fontsource-variable/outfit/wght.css'
import './styles/theme-palette.css'
import './styles/theme-seasonal.css'
import './styles/crown-theme.css'
import './components/AppModal.css'
import './index.css'
import { initSitePatternTileCssVar } from './lib/publicImageUrl'
initSitePatternTileCssVar()
import './styles/site-background.css'
import './styles/ios-safari-fixes.css'
import { applyThemeFromEnv } from './theme/applyTheme'
import i18n from './i18n/i18n'
import App from './App.tsx'
import { agentDebugLog } from './debug/agentDebugIngest'
import { registerChunkLoadRecoveryHandlers } from './lib/chunkLoadRecovery'
import { registerIosOrientationChangeMarker } from './lib/iosOrientationStabilizer'
import { registerMediaProtection } from './lib/mediaProtection'
import { registerSpaServiceWorkerOnLoad } from './lib/spaServiceWorker'

applyThemeFromEnv()
registerChunkLoadRecoveryHandlers()
registerIosOrientationChangeMarker()

function preventNativeDrag(): void {
  if (typeof document === 'undefined') return
  document.addEventListener(
    'dragstart',
    (event) => {
      event.preventDefault()
    },
    { capture: true },
  )
}
preventNativeDrag()
registerMediaProtection()

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

registerSpaServiceWorkerOnLoad()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>,
)
