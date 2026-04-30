import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { shouldOpenInNewWindow } from '../lib/gameShell'
import {
  logGameOpenedNewTab,
  logGameOverlayClosed,
  logGameOverlayOpened,
  logPerfMemorySnapshot,
} from '../lib/gameShellTelemetry'
import { useGatewayLobby } from '../realtime/useGatewayLobby'
import { GameOverlay } from './GameOverlay'
import { GameShellContext, type OpenShellOptions } from './game-shell-context'

export function GameShellProvider({ children }: { children: ReactNode }) {
  const { refreshLobbyGet } = useGatewayLobby()
  const [overlay, setOverlay] = useState<{
    url: string
    widthPercent: number
    heightPercent: number
    isPayment: boolean
  } | null>(null)

  const open = useCallback((o: OpenShellOptions) => {
    if (!o.url) {
      console.warn('[GameShell] empty url')
      return
    }
    if (shouldOpenInNewWindow(o.openInNewWindow)) {
      logGameOpenedNewTab(o.url)
      const w = window.open(o.url, '_blank', 'noopener,noreferrer')
      if (!w) console.warn('[GameShell] window.open blocked')
      return
    }
    logGameOverlayOpened(o.url.trim())
    logPerfMemorySnapshot('[game-shell][dev] heap on overlay_open')
    setOverlay({
      url: o.url,
      widthPercent: o.widthPercent ?? 90,
      heightPercent: o.heightPercent ?? 90,
      isPayment: !!o.isPayment,
    })
  }, [])

  const close = useCallback(() => {
    logGameOverlayClosed()
    logPerfMemorySnapshot(
      '[game-shell][dev] heap on overlay_close (iframe still mounted)',
    )
    setOverlay((prev) => {
      if (prev && !prev.isPayment) {
        void refreshLobbyGet()
      }
      return null
    })
  }, [refreshLobbyGet])

  const value = useMemo(
    () => ({
      open,
      close,
      isOpen: overlay !== null,
    }),
    [open, close, overlay],
  )

  return (
    <GameShellContext.Provider value={value}>
      {children}
      {overlay ? (
        <GameOverlay
          key={overlay.url}
          url={overlay.url}
          widthPercent={overlay.widthPercent}
          heightPercent={overlay.heightPercent}
          isPayment={overlay.isPayment}
          onClose={close}
        />
      ) : null}
    </GameShellContext.Provider>
  )
}
