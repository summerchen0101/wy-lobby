/** postMessage protocol: lobby shell asks embedded Unity page to Quit before iframe teardown. */
export const GAME_SHELL_POST_MESSAGE_SOURCE = 'game-shell' as const

export const GAME_SHELL_REQUEST_QUIT_TYPE = 'ffgt-shell-request-quit' as const

/** 遊戲新分頁關閉後通知 opener 刷新大廳（與 overlay 關閉行為一致）。 */
export const GAME_SHELL_POPOUT_CLOSED_TYPE =
  'ffgt-game-shell-popout-closed' as const

export type GameShellToUnityMessage = {
  type: typeof GAME_SHELL_REQUEST_QUIT_TYPE
  source: typeof GAME_SHELL_POST_MESSAGE_SOURCE
}

export function createShellQuitMessage(): GameShellToUnityMessage {
  return {
    type: GAME_SHELL_REQUEST_QUIT_TYPE,
    source: GAME_SHELL_POST_MESSAGE_SOURCE,
  }
}
