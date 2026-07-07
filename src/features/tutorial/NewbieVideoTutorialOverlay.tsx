import "./NewbieVideoTutorialOverlay.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getTutorialBgmDuckLevelForClip,
  LOBBY_BGM_NORMAL_VOLUME,
  setLobbyBannerMuted,
  setLobbyBgmDuckLevel,
} from "../../lib/lobbySound";
import { NEWBIE_VIDEO_TUTORIAL_SOURCES } from "./newbieVideoTutorialSources";

type Props = {
  open: boolean;
  onComplete: () => void;
};

function releaseVideos(videos: readonly (HTMLVideoElement | null)[]) {
  for (const video of videos) {
    if (!video) continue;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

async function waitForVideoCanPlay(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
    const onCanPlay = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("[newbie-tutorial] video load failed"));
    };
    video.addEventListener("canplay", onCanPlay, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function waitForFirstVideoFrame(video: HTMLVideoElement): Promise<void> {
  if (typeof video.requestVideoFrameCallback === "function") {
    await new Promise<void>((resolve) => {
      video.requestVideoFrameCallback(() => resolve());
    });
    return;
  }
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
  await new Promise<void>((resolve) => {
    video.addEventListener("loadeddata", () => resolve(), { once: true });
  });
}

export function NewbieVideoTutorialOverlay({ open, onComplete }: Props) {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const resumePlayOnTapRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [activeVideoReady, setActiveVideoReady] = useState(false);

  const lastClip = index >= NEWBIE_VIDEO_TUTORIAL_SOURCES.length - 1;

  useEffect(() => {
    if (!open) {
      releaseVideos(videoRefs.current);
    }
    setIndex(0);
    setActiveVideoReady(false);
    resumePlayOnTapRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) {
      setLobbyBannerMuted(false);
      setLobbyBgmDuckLevel(LOBBY_BGM_NORMAL_VOLUME);
      return;
    }
    setLobbyBannerMuted(true);
    setLobbyBgmDuckLevel(getTutorialBgmDuckLevelForClip(index));
    return () => {
      setLobbyBannerMuted(false);
      setLobbyBgmDuckLevel(LOBBY_BGM_NORMAL_VOLUME);
    };
  }, [open, index]);

  const pauseAllExcept = useCallback((activeIndex: number) => {
    videoRefs.current.forEach((video, i) => {
      if (!video || i === activeIndex) return;
      video.pause();
    });
  }, []);

  const tryPlayActive = useCallback(async () => {
    const video = videoRefs.current[index];
    if (!video) return true;
    setActiveVideoReady(false);
    try {
      await waitForVideoCanPlay(video);
      await video.play();
      await waitForFirstVideoFrame(video);
      setActiveVideoReady(true);
      resumePlayOnTapRef.current = false;
      return true;
    } catch {
      resumePlayOnTapRef.current = true;
      return false;
    }
  }, [index]);

  useEffect(() => {
    if (!open) return;
    pauseAllExcept(index);
    void tryPlayActive();
  }, [open, index, pauseAllExcept, tryPlayActive]);

  const finish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const advance = useCallback(() => {
    if (lastClip) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
  }, [lastClip, finish]);

  const onTap = useCallback(() => {
    if (resumePlayOnTapRef.current) {
      resumePlayOnTapRef.current = false;
      void tryPlayActive();
      return;
    }
    advance();
  }, [tryPlayActive, advance]);

  if (!open) return null;

  return createPortal(
    <div
      className="newbie-video-tutorial"
      role="dialog"
      aria-modal="true"
      aria-label="New player tutorial"
      onClick={onTap}
      onContextMenu={(e) => e.preventDefault()}>
      <div className="newbie-video-tutorial__stack">
        {NEWBIE_VIDEO_TUTORIAL_SOURCES.map((src, i) => {
          const active = i === index;
          const visible = active && activeVideoReady;
          return (
            <video
              key={src}
              ref={(el) => {
                videoRefs.current[i] = el;
              }}
              className={
                visible
                  ? "newbie-video-tutorial__video"
                  : "newbie-video-tutorial__video newbie-video-tutorial__video--hidden"
              }
              src={src}
              playsInline
              preload={i === index || i === index + 1 ? "auto" : "none"}
              draggable={false}
              controlsList="nodownload nofullscreen noremoteplayback"
              aria-hidden={!visible}
            />
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
