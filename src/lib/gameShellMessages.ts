/** postMessage protocol: lobby shell asks embedded Unity page to Quit before iframe teardown. */
export const GAME_SHELL_POST_MESSAGE_SOURCE = 'game-shell' as const

export const GAME_SHELL_REQUEST_QUIT_TYPE = 'ffgt-shell-request-quit' as const

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
