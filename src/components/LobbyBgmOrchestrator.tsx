import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import type { User } from "../lib/api/types";
import {
  assignLobbyBgm,
  LOBBY_SOUND_PREF_EVENT,
  playLobbyWelcomeVoice,
  resumeLobbyBgm,
} from "../lib/lobbySound";
import { useGameShell } from "./useGameShell";

/**
 * 全域大廳 BGM（不綁定特定路由）：
 * 1. 初次載入 SPA 開始循環 BGM，並隨機播一次欢迎语音（F1/F3）
 * 2. 訪客登入成功（null → user）再播欢迎语音；還原既有 session 不做「登入成功」
 * BGM 循環直到靜音／遊戲殼開啟／分頁隱藏（暫停）；與 Profile 靜音、遊戲殼層、分頁可見度同步。
 */
export function LobbyBgmOrchestrator() {
  const { user, ready } = useAuth();
  const { isOpen: gameShellOpen } = useGameShell();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firstVisitPlayedRef = useRef(false);
  const prevUserRef = useRef<User | null | undefined>(undefined);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.loop = true;
      a.preload = "auto";
      audioRef.current = a;
    }
    return audioRef.current;
  }, []);

  const syncPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (gameShellOpen) {
      audio.pause();
      return;
    }
    void resumeLobbyBgm(audio);
  }, [gameShellOpen]);

  useEffect(() => {
    if (firstVisitPlayedRef.current) return;
    firstVisitPlayedRef.current = true;
    assignLobbyBgm(getAudio());
    playLobbyWelcomeVoice();
  }, [getAudio]);

  useEffect(() => {
    syncPlayback();
    window.addEventListener(LOBBY_SOUND_PREF_EVENT, syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      window.removeEventListener(LOBBY_SOUND_PREF_EVENT, syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [syncPlayback]);

  /** Auth bootstrap 完成後重試（startup refresh 期間 ready=false，初次 autoplay 常失敗）。 */
  useEffect(() => {
    if (!ready) return;
    syncPlayback();
  }, [ready, syncPlayback]);

  /** 行動裝置 autoplay 政策：首次使用者手勢後再試播 BGM。 */
  useEffect(() => {
    const unlock = () => {
      syncPlayback();
    };
    document.addEventListener("pointerdown", unlock, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", unlock, { capture: true });
    };
  }, [syncPlayback]);

  useEffect(() => {
    if (!ready) return;
    if (prevUserRef.current === undefined) {
      prevUserRef.current = user;
      return;
    }
    if (prevUserRef.current === null && user !== null) {
      playLobbyWelcomeVoice();
      syncPlayback();
    }
    prevUserRef.current = user;
  }, [ready, user, syncPlayback]);

  return null;
}
