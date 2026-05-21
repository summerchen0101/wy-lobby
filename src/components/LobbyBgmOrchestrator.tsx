import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import type { User } from "../lib/api/types";
import {
  assignLobbyBgm,
  LOBBY_SOUND_PREF_EVENT,
  isLobbySoundEnabled,
  playLobbyWelcomeVoice,
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
    if (!isLobbySoundEnabled() || gameShellOpen) {
      audio.pause();
      return;
    }
    if (document.visibilityState !== "visible") {
      audio.pause();
      return;
    }
    if (audio.ended) return;
    void audio.play().catch(() => {
      /* autoplay policy */
    });
  }, [gameShellOpen]);

  useEffect(() => {
    if (firstVisitPlayedRef.current) return;
    firstVisitPlayedRef.current = true;
    const audio = getAudio();
    assignLobbyBgm(audio);
    if (
      !isLobbySoundEnabled() ||
      gameShellOpen ||
      document.visibilityState !== "visible"
    ) {
      audio.pause();
    } else {
      playLobbyWelcomeVoice();
      void audio.play().catch(() => {
        /* autoplay policy */
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 僅首次掛載觸發入站 BGM
  }, []);

  useEffect(() => {
    syncPlayback();
    window.addEventListener(LOBBY_SOUND_PREF_EVENT, syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      window.removeEventListener(LOBBY_SOUND_PREF_EVENT, syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [syncPlayback]);

  useEffect(() => {
    if (!ready) return;
    if (prevUserRef.current === undefined) {
      prevUserRef.current = user;
      return;
    }
    if (prevUserRef.current === null && user !== null) {
      const audio = getAudio();
      if (
        !isLobbySoundEnabled() ||
        gameShellOpen ||
        document.visibilityState !== "visible"
      ) {
        audio.pause();
      } else {
        playLobbyWelcomeVoice();
        void audio.play().catch(() => {
          /* autoplay policy */
        });
      }
    }
    prevUserRef.current = user;
  }, [ready, user, gameShellOpen, getAudio]);

  return null;
}
