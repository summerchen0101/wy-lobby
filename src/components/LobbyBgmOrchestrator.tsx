import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import type { User } from "../lib/api/types";
import {
  LOBBY_BGM_SRC,
  LOBBY_SOUND_PREF_EVENT,
  isLobbySoundEnabled,
} from "../lib/lobbySound";
import { useGameShell } from "./useGameShell";

/**
 * 全域大廳 BGM（不綁定特定路由）：
 * 1. 初次載入 SPA 播一次
 * 2. 訪客登入成功（null → user）再播一次；還原既有 session 不做「登入成功」
 * refocus／已播完不重播；與 Profile 靜音、遊戲殼層、分頁可見度同步。
 */
export function LobbyBgmOrchestrator() {
  const { user, ready } = useAuth();
  const { isOpen: gameShellOpen } = useGameShell();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firstVisitPlayedRef = useRef(false);
  const prevUserRef = useRef<User | null | undefined>(undefined);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio(LOBBY_BGM_SRC);
      a.loop = false;
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
    audio.currentTime = 0;
    if (
      !isLobbySoundEnabled() ||
      gameShellOpen ||
      document.visibilityState !== "visible"
    ) {
      audio.pause();
    } else {
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
      audio.currentTime = 0;
      if (
        !isLobbySoundEnabled() ||
        gameShellOpen ||
        document.visibilityState !== "visible"
      ) {
        audio.pause();
      } else {
        void audio.play().catch(() => {
          /* autoplay policy */
        });
      }
    }
    prevUserRef.current = user;
  }, [ready, user, gameShellOpen, getAudio]);

  return null;
}
