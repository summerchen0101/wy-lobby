import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  isLobbyBannerMuted,
  isLobbySoundEnabled,
  LOBBY_BANNER_MUTE_EVENT,
  LOBBY_SOUND_PREF_EVENT,
} from "../lib/lobbySound";
import "./LobbyHeroBanner.css";

type Props = {
  videoSrc: string;
  posterSrc?: string;
  children?: ReactNode;
};

function syncBannerVideoSound(video: HTMLVideoElement): void {
  if (!isLobbySoundEnabled() || isLobbyBannerMuted()) {
    video.muted = true;
    return;
  }
  video.muted = false;
  void video.play().catch(() => {
    video.muted = true;
  });
}

export function LobbyHeroBanner({ videoSrc, posterSrc, children }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [bannerMuteVersion, setBannerMuteVersion] = useState(0);

  const tryUnmuteAfterUserActivation = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isLobbySoundEnabled() || isLobbyBannerMuted()) return;
    syncBannerVideoSound(video);
  }, []);

  useEffect(() => {
    const sync = () => setBannerMuteVersion((v) => v + 1);
    window.addEventListener(LOBBY_BANNER_MUTE_EVENT, sync);
    return () => window.removeEventListener(LOBBY_BANNER_MUTE_EVENT, sync);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playWhenReady = () => {
      syncBannerVideoSound(video);
      void video.play().catch(() => {
        if (!video.muted) {
          video.muted = true;
          void video.play().catch(() => {});
        }
      });
    };

    video.addEventListener("canplay", playWhenReady);
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      playWhenReady();
    } else {
      video.load();
    }

    return () => {
      video.removeEventListener("canplay", playWhenReady);
      video.pause();
    };
  }, [videoSrc, bannerMuteVersion]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onSoundPref = () => syncBannerVideoSound(video);
    const unlock = () => tryUnmuteAfterUserActivation();

    window.addEventListener(LOBBY_SOUND_PREF_EVENT, onSoundPref);
    document.addEventListener("pointerdown", unlock, { capture: true });
    return () => {
      window.removeEventListener(LOBBY_SOUND_PREF_EVENT, onSoundPref);
      document.removeEventListener("pointerdown", unlock, { capture: true });
    };
  }, [tryUnmuteAfterUserActivation, bannerMuteVersion]);

  return (
    <div className="lobby-hero-banner__art-wrap">
      {posterSrc ? (
        <img
          className="lobby-hero-banner__img--base"
          src={posterSrc}
          alt=""
          decoding="async"
          aria-hidden
        />
      ) : null}
      <video
        ref={videoRef}
        className="lobby-hero-banner__video"
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
      />
      {children}
    </div>
  );
}
