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
import './styles/site-background.css'
import { applyThemeFromEnv } from './theme/applyTheme'
import i18n from './i18n/i18n'
import App from './App.tsx'

applyThemeFromEnv()

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
