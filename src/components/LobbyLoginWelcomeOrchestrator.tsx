import { useEffect, useLayoutEffect, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import type { User } from "../lib/api/types";
import {
  isLobbyWelcomeVoiceAlreadyComplete,
  isLobbyWelcomeVoiceStarted,
  playLobbyWelcomeVoice,
  waitForLobbyWelcomeVoiceEnd,
} from "../lib/lobbySound";
import { promiseWithTimeout } from "../lib/promiseWithTimeout";
import {
  reopenWelcomeVoiceGateIfIdle,
  setWelcomeVoiceGateOpen,
} from "../lib/lobbyWelcomeVoiceGate";

const WELCOME_VOICE_TUTORIAL_GATE_TIMEOUT_MS = 8_000;

/**
 * 訪客登入成功（null → user）後於 loading 階段播歡迎語（F1/F3 或 M1/M3 隨機擇一，男女交替），
 * 播完才開啟新手教學 gate（教學 video 1–19）。
 * 還原既有 session 不播歡迎語、不擋教學。
 */
export function LobbyLoginWelcomeOrchestrator() {
  const { user, ready } = useAuth();
  const prevUserRef = useRef<User | null | undefined>(undefined);
  const freshLoginPendingRef = useRef(false);
  const playingRef = useRef(false);

  useLayoutEffect(() => {
    if (!ready) return;
    if (prevUserRef.current === undefined) {
      prevUserRef.current = user;
      setWelcomeVoiceGateOpen(true);
      return;
    }
    if (prevUserRef.current === null && user !== null) {
      freshLoginPendingRef.current = true;
      setWelcomeVoiceGateOpen(false);
    }
    prevUserRef.current = user;
  }, [ready, user]);

  useEffect(() => {
    if (!ready || !user) return;
    if (!freshLoginPendingRef.current) return;
    if (playingRef.current) return;

    freshLoginPendingRef.current = false;
    playingRef.current = true;
    setWelcomeVoiceGateOpen(false);

    void (async () => {
      try {
        await promiseWithTimeout(
          (async () => {
            if (isLobbyWelcomeVoiceStarted()) {
              await waitForLobbyWelcomeVoiceEnd();
            } else if (!isLobbyWelcomeVoiceAlreadyComplete()) {
              await playLobbyWelcomeVoice();
            }
          })(),
          WELCOME_VOICE_TUTORIAL_GATE_TIMEOUT_MS,
          "[lobby-welcome] voice gate timeout",
        );
      } catch {
        // Autoplay blocked / hang (common on iOS) — open tutorial gate immediately.
      } finally {
        playingRef.current = false;
        setWelcomeVoiceGateOpen(true);
      }
    })();
  }, [ready, user]);

  useEffect(() => {
    if (!ready || !user) return;
    if (freshLoginPendingRef.current || playingRef.current) return;
    if (isLobbyWelcomeVoiceStarted()) return;
    reopenWelcomeVoiceGateIfIdle();
  }, [ready, user]);

  useEffect(() => {
    const recoverGate = () => {
      if (playingRef.current || isLobbyWelcomeVoiceStarted()) return;
      reopenWelcomeVoiceGateIfIdle();
    };
    window.addEventListener("pageshow", recoverGate);
    const onVisibility = () => {
      if (document.visibilityState === "visible") recoverGate();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", recoverGate);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
