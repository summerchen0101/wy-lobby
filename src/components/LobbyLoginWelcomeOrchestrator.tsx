import { useEffect, useLayoutEffect, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import type { User } from "../lib/api/types";
import {
  isLobbyWelcomeVoiceStarted,
  playLobbyWelcomeVoice,
  waitForLobbyWelcomeVoiceEnd,
  waitForPendingWelcomeVoiceEnd,
} from "../lib/lobbySound";
import { setWelcomeVoiceGateOpen } from "../lib/lobbyWelcomeVoiceGate";

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
        if (isLobbyWelcomeVoiceStarted()) {
          await waitForLobbyWelcomeVoiceEnd();
        } else {
          await playLobbyWelcomeVoice();
        }
      } catch {
        await waitForPendingWelcomeVoiceEnd();
      } finally {
        playingRef.current = false;
        setWelcomeVoiceGateOpen(true);
      }
    })();
  }, [ready, user]);

  return null;
}
