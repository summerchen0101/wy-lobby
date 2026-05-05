import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  agentDebugLog,
  agentDebugUrlPreview,
} from '../debug/agentDebugIngest'
import {
  buildGamePopoutPathQuery,
  shouldOpenInNewWindow,
} from '../lib/gameShell'
import { GAME_SHELL_POPOUT_CLOSED_TYPE } from '../lib/gameShellMessages'
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

  useEffect(() => {
    const origin = window.location.origin
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin) return
      const d = event.data
      if (
        d &&
        typeof d === 'object' &&
        (d as { type?: string }).type === GAME_SHELL_POPOUT_CLOSED_TYPE
      ) {
        void refreshLobbyGet()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [refreshLobbyGet])

  const open = useCallback((o: OpenShellOptions) => {
    if (!o.url) {
      console.warn('[GameShell] empty url')
      return
    }
    if (shouldOpenInNewWindow(o.openInNewWindow)) {
      const trimmed = o.url.trim()
      // #region agent log
      agentDebugLog({
        hypothesisId: 'A',
        location: 'GameShellProvider.tsx:open',
        message: 'shell_open_new_tab',
        data: { path: agentDebugUrlPreview(trimmed) },
      })
      // #endregion
      logGameOpenedNewTab(trimmed)
      const q = buildGamePopoutPathQuery(trimmed)
      if (!q) {
        console.warn('[GameShell] invalid or unsupported game URL for popout')
        return
      }
      const shellUrl = new URL(
        `/game-popout?${q}`,
        window.location.href,
      ).toString()
      const w = window.open(shellUrl, '_blank')
      if (!w) console.warn('[GameShell] window.open blocked')
      return
    }
    // #region agent log
    agentDebugLog({
      hypothesisId: 'A',
      location: 'GameShellProvider.tsx:open',
      message: 'shell_overlay_open',
      data: {
        path: agentDebugUrlPreview(o.url.trim()),
        isPayment: !!o.isPayment,
      },
    })
    // #endregion
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
    // #region agent log
    agentDebugLog({
      hypothesisId: 'A',
      location: 'GameShellProvider.tsx:close',
      message: 'shell_close_clicked',
      data: {},
    })
    // #endregion
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
