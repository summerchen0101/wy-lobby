import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth/useAuth";
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

/** Muted autoplay first (refresh-safe), then try unmute when prefs allow. */
function playBannerVideo(video: HTMLVideoElement): void {
  const wantSound =
    isLobbySoundEnabled() && !isLobbyBannerMuted();
  video.muted = true;
  void video
    .play()
    .then(() => {
      if (!wantSound) return;
      video.muted = false;
      void video.play().catch(() => {
        video.muted = true;
      });
    })
    .catch(() => {
      void video.play().catch(() => {});
    });
}

export function LobbyHeroBanner({ videoSrc, posterSrc, children }: Props) {
  const { ready: authReady } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [bannerMuteVersion, setBannerMuteVersion] = useState(0);

  const tryUnmuteAfterUserActivation = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      playBannerVideo(video);
      return;
    }
    if (!isLobbySoundEnabled() || isLobbyBannerMuted()) return;
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
      playBannerVideo(video);
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

  /** Auth bootstrap 完成後重試（startup refresh 期間 ready=false，初次 autoplay 常失敗）。 */
  useEffect(() => {
    if (!authReady) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) playBannerVideo(video);
  }, [authReady, videoSrc, bannerMuteVersion]);

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
    <div
      className="lobby-hero-banner__art-wrap"
      onContextMenu={(e) => e.preventDefault()}>
      {posterSrc ? (
        <img
          className="lobby-hero-banner__img--base"
          src={posterSrc}
          alt=""
          decoding="async"
          draggable={false}
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
        draggable={false}
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        aria-hidden
      />
      {children}
    </div>
  );
}
