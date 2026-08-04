import "./NewbieVideoTutorialOverlay.css";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getTutorialBgmDuckLevelForClip,
  isLobbySoundEnabled,
  LOBBY_BGM_NORMAL_VOLUME,
  LOBBY_SOUND_PREF_EVENT,
  setLobbyBannerMuted,
  setLobbyBgmDuckLevel,
} from "../../lib/lobbySound";
import { NEWBIE_VIDEO_TUTORIAL_CLIPS } from "./newbieVideoTutorialSources";

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

async function waitForVideoCanPlay(
  video: HTMLVideoElement,
  timeoutMs = 12_000,
): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return;
  await Promise.race([
    new Promise<void>((resolve, reject) => {
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
    }),
    new Promise<void>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("[newbie-tutorial] video load timeout")),
        timeoutMs,
      );
    }),
  ]);
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

function hasTutorialSoundActivation(soundUnlocked: boolean): boolean {
  if (soundUnlocked) return true;
  if (typeof navigator === "undefined") return false;
  return navigator.userActivation?.isActive === true;
}

/** Muted autoplay when needed (refresh-safe), then unmute when sound is allowed. */
async function playTutorialVideo(
  video: HTMLVideoElement,
  soundUnlocked: boolean,
): Promise<{ ok: true; soundUnlocked: boolean } | { ok: false }> {
  const wantSound = isLobbySoundEnabled();
  try {
    await waitForVideoCanPlay(video);
  } catch {
    return { ok: false };
  }

  const tryUnmuted = async (): Promise<boolean> => {
    if (!wantSound) {
      video.muted = true;
      return false;
    }
    video.muted = false;
    if (!video.paused) return true;
    try {
      await video.play();
      return true;
    } catch {
      video.muted = true;
      return false;
    }
  };

  if (wantSound && hasTutorialSoundActivation(soundUnlocked)) {
    if (await tryUnmuted()) {
      await waitForFirstVideoFrame(video);
      return { ok: true, soundUnlocked: true };
    }
  }

  video.muted = true;
  try {
    await video.play();
    await waitForFirstVideoFrame(video);
  } catch {
    return { ok: false };
  }

  if (wantSound && hasTutorialSoundActivation(soundUnlocked)) {
    const unmuted = await tryUnmuted();
    return { ok: true, soundUnlocked: unmuted || soundUnlocked };
  }

  return { ok: true, soundUnlocked };
}

export function NewbieVideoTutorialOverlay({ open, onComplete }: Props) {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const resumePlayOnTapRef = useRef(false);
  const soundUnlockedRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [activeVideoReady, setActiveVideoReady] = useState(false);
  const [awaitingClick, setAwaitingClick] = useState(false);
  const [needsTapToResume, setNeedsTapToResume] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const activeClip = NEWBIE_VIDEO_TUTORIAL_CLIPS[index];
  const lastClip = index >= NEWBIE_VIDEO_TUTORIAL_CLIPS.length - 1;

  useEffect(() => {
    if (!open) {
      releaseVideos(videoRefs.current);
    }
    setIndex(0);
    setActiveVideoReady(false);
    setAwaitingClick(false);
    setNeedsTapToResume(false);
    setLoadFailed(false);
    resumePlayOnTapRef.current = false;
    soundUnlockedRef.current = false;
  }, [open]);

  useEffect(() => {
    setAwaitingClick(false);
  }, [index]);

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

  const tryPlayActive = useCallback(async (fromUserGesture = false) => {
    const video = videoRefs.current[index];
    if (!video) return false;
    if (fromUserGesture) soundUnlockedRef.current = true;
    setActiveVideoReady(false);
    setAwaitingClick(false);
    setLoadFailed(false);
    const result = await playTutorialVideo(video, soundUnlockedRef.current);
    if (!result.ok) {
      resumePlayOnTapRef.current = true;
      setNeedsTapToResume(true);
      setLoadFailed(true);
      return false;
    }
    soundUnlockedRef.current = result.soundUnlocked;
    setActiveVideoReady(true);
    resumePlayOnTapRef.current = false;
    setNeedsTapToResume(false);
    return true;
  }, [index]);

  useLayoutEffect(() => {
    if (!open) return;
    pauseAllExcept(index);
    void tryPlayActive();
  }, [open, index, pauseAllExcept, tryPlayActive]);

  useEffect(() => {
    if (!open) return;
    const syncSound = () => {
      const video = videoRefs.current[index];
      if (!video) return;
      video.muted = !isLobbySoundEnabled() || !soundUnlockedRef.current;
    };
    window.addEventListener(LOBBY_SOUND_PREF_EVENT, syncSound);
    return () => window.removeEventListener(LOBBY_SOUND_PREF_EVENT, syncSound);
  }, [open, index]);

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

  const onActiveVideoEnded = useCallback(() => {
    if (!activeClip) return;
    if (activeClip.requiresClickAfterEnd) {
      setAwaitingClick(true);
      return;
    }
    advance();
  }, [activeClip, advance]);

  const onTap = useCallback(() => {
    if (resumePlayOnTapRef.current) {
      resumePlayOnTapRef.current = false;
      setNeedsTapToResume(false);
      setLoadFailed(false);
      void tryPlayActive(true);
      return;
    }
    if (!awaitingClick) return;
    soundUnlockedRef.current = true;
    setAwaitingClick(false);
    advance();
  }, [tryPlayActive, advance, awaitingClick]);

  const showResumeHint = needsTapToResume || loadFailed;
  const showBootHint = open && !activeVideoReady && !showResumeHint && !awaitingClick;

  if (!open) return null;

  return createPortal(
    <div
      className={
        awaitingClick || showResumeHint
          ? "newbie-video-tutorial newbie-video-tutorial--awaiting-tap"
          : "newbie-video-tutorial"
      }
      role="dialog"
      aria-modal="true"
      aria-label="New player tutorial"
      onClick={onTap}
      onContextMenu={(e) => e.preventDefault()}>
      <div className="newbie-video-tutorial__stack">
        {NEWBIE_VIDEO_TUTORIAL_CLIPS.map((clip, i) => {
          const active = i === index;
          const videoReady = activeVideoReady || showResumeHint;
          return (
            <video
              key={clip.src}
              ref={(el) => {
                videoRefs.current[i] = el;
              }}
              className={
                "newbie-video-tutorial__video" +
                (active
                  ? videoReady
                    ? ""
                    : " newbie-video-tutorial__video--pending"
                  : " newbie-video-tutorial__video--inactive")
              }
              src={clip.src}
              playsInline
              muted
              preload={i === index || i === index + 1 ? "auto" : "none"}
              draggable={false}
              controlsList="nodownload nofullscreen noremoteplayback"
              aria-hidden={!active || !videoReady}
              onEnded={active ? onActiveVideoEnded : undefined}
            />
          );
        })}
      </div>
      {showBootHint ? (
        <p className="newbie-video-tutorial__hint" aria-live="polite">
          Loading tutorial…
        </p>
      ) : null}
      {showResumeHint ? (
        <p className="newbie-video-tutorial__hint newbie-video-tutorial__hint--tap">
          Tap to continue
        </p>
      ) : null}
      <button
        type="button"
        className="newbie-video-tutorial__skip"
        onClick={(e) => {
          e.stopPropagation();
          finish();
        }}
      >
        Skip
      </button>
    </div>,
    document.body,
  );
}
