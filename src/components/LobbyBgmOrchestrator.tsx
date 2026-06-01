import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import type { User } from "../lib/api/types";
import {
  assignRandomLobbyBgm,
  LOBBY_BGM_SUPPRESS_EVENT,
  LOBBY_SOUND_PREF_EVENT,
  isLobbyBgmSuppressed,
  isLobbySoundEnabled,
} from "../lib/lobbySound";
import { useGameShell } from "./useGameShell";

/**
 * 全域大廳 BGM（不綁定特定路由）：
 * 1. 初次載入 SPA 開始循環播放
 * 2. 訪客登入成功（null → user）再載入並播；還原既有 session 不做「登入成功」
 * 循環直到靜音／遊戲殼開啟／新手教學／分頁隱藏（暫停）；與 Profile 靜音、遊戲殼層、教學 overlay、分頁可見度同步。
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
    if (!isLobbySoundEnabled() || gameShellOpen || isLobbyBgmSuppressed()) {
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
    assignRandomLobbyBgm(audio);
    if (
      !isLobbySoundEnabled() ||
      gameShellOpen ||
      isLobbyBgmSuppressed() ||
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
    window.addEventListener(LOBBY_BGM_SUPPRESS_EVENT, syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      window.removeEventListener(LOBBY_SOUND_PREF_EVENT, syncPlayback);
      window.removeEventListener(LOBBY_BGM_SUPPRESS_EVENT, syncPlayback);
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
      assignRandomLobbyBgm(audio);
      if (
        !isLobbySoundEnabled() ||
        gameShellOpen ||
        isLobbyBgmSuppressed() ||
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
