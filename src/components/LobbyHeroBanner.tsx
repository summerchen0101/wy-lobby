import { useEffect, useRef, type ReactNode } from "react";
import "./LobbyHeroBanner.css";

type Props = {
  videoSrc: string;
  posterSrc?: string;
  children?: ReactNode;
};

export function LobbyHeroBanner({ videoSrc, posterSrc, children }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playWhenReady = () => {
      void video.play().catch(() => {});
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
  }, [videoSrc]);

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
