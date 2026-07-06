import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import {
  applyLobbyBgmVolume,
  assignLobbyBgm,
  LOBBY_BGM_DUCK_EVENT,
  LOBBY_BGM_SUPPRESS_EVENT,
  LOBBY_SOUND_PREF_EVENT,
  isLobbyBgmSuppressed,
  isLobbySoundEnabled,
  resumeLobbyBgm,
  retryPendingLobbyWelcomeVoice,
} from "../lib/lobbySound";
import { useGameShell } from "./useGameShell";

/**
 * 全域大廳 BGM（不綁定特定路由）：
 * 1. 初次載入 SPA 開始循環 BGM
 * 2. 歡迎語由 LobbyLoginWelcomeOrchestrator 在登入成功後播放（男女交替）
 * BGM 循環直到靜音／遊戲殼開啟／overlay suppress／分頁隱藏（暫停）；
 * 新手教學期間 BGM 持續播放，clip 7 透過 duck level 降低音量。
 */
export function LobbyBgmOrchestrator() {
  const { ready } = useAuth();
  const { isOpen: gameShellOpen } = useGameShell();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firstVisitPlayedRef = useRef(false);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.loop = true;
      a.preload = "auto";
      audioRef.current = a;
    }
    return audioRef.current;
  }, []);

  const applyVolume = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    applyLobbyBgmVolume(audio);
  }, []);

  const syncPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!isLobbySoundEnabled() || gameShellOpen || isLobbyBgmSuppressed()) {
      audio.pause();
      return;
    }
    void resumeLobbyBgm(audio);
  }, [gameShellOpen]);

  useEffect(() => {
    if (firstVisitPlayedRef.current) return;
    firstVisitPlayedRef.current = true;
    assignLobbyBgm(getAudio());
  }, [getAudio]);

  useEffect(() => {
    syncPlayback();
    window.addEventListener(LOBBY_SOUND_PREF_EVENT, syncPlayback);
    window.addEventListener(LOBBY_BGM_SUPPRESS_EVENT, syncPlayback);
    window.addEventListener(LOBBY_BGM_DUCK_EVENT, applyVolume);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      window.removeEventListener(LOBBY_SOUND_PREF_EVENT, syncPlayback);
      window.removeEventListener(LOBBY_BGM_SUPPRESS_EVENT, syncPlayback);
      window.removeEventListener(LOBBY_BGM_DUCK_EVENT, applyVolume);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [syncPlayback, applyVolume]);

  /** Auth bootstrap 完成後重試（startup refresh 期間 ready=false，初次 autoplay 常失敗）。 */
  useEffect(() => {
    if (!ready) return;
    syncPlayback();
  }, [ready, syncPlayback]);

  /** 行動裝置 autoplay 政策：首次使用者手勢後再試播 BGM 與 pending 歡迎語。 */
  useEffect(() => {
    const unlock = () => {
      syncPlayback();
      retryPendingLobbyWelcomeVoice();
    };
    document.addEventListener("pointerdown", unlock, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", unlock, { capture: true });
    };
  }, [syncPlayback]);

  return null;
}
