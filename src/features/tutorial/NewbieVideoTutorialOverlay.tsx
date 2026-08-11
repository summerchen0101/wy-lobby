import "./NewbieVideoTutorialOverlay.css";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { isIOSWebKit, isMobileBrowser } from "../../lib/iosGameFullscreen";
import {
  getTutorialBgmDuckLevelForClip,
  consumeTutorialSoundUnlockedFromLoginGesture,
  isLobbySoundEnabled,
  LOBBY_BGM_NORMAL_VOLUME,
  LOBBY_SOUND_PREF_EVENT,
  setLobbyBannerMuted,
  setLobbyBgmDuckLevel,
} from "../../lib/lobbySound";
import { NEWBIE_VIDEO_TUTORIAL_CLIPS } from "./newbieVideoTutorialSources";
import { setTutorialOverlayOpen } from "./tutorialOverlayState";

type Props = {
  open: boolean;
  onComplete: () => void;
};

type VideoFrameRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type ClipLayout = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function measureTopHeightVideoFrame(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number,
): VideoFrameRect | null {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    videoWidth <= 0 ||
    videoHeight <= 0
  ) {
    return null;
  }
  const height = containerHeight;
  const width = Math.ceil((videoWidth / videoHeight) * height);
  return {
    top: 0,
    left: (containerWidth - width) / 2,
    width,
    height,
  };
}

/** Mobile cover: fill viewport, top-aligned; avoids letterbox gap over lobby chrome. */
function measureCoverVideoFrame(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number,
): VideoFrameRect | null {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    videoWidth <= 0 ||
    videoHeight <= 0
  ) {
    return null;
  }
  const scale = Math.max(
    containerWidth / videoWidth,
    containerHeight / videoHeight,
  );
  const width = Math.ceil(videoWidth * scale);
  const height = Math.ceil(videoHeight * scale);
  return {
    top: 0,
    left: (containerWidth - width) / 2,
    width,
    height,
  };
}

function getTutorialLayoutHeight(stack: HTMLElement): number {
  if (typeof window !== "undefined" && window.visualViewport?.height) {
    return Math.round(window.visualViewport.height);
  }
  if (stack.clientHeight > 0) return Math.round(stack.clientHeight);
  if (typeof window !== "undefined") return Math.round(window.innerHeight);
  return 0;
}

function measureClipLayout(
  stack: HTMLElement,
  videoWidth: number,
  videoHeight: number,
  useMobileCover: boolean,
): ClipLayout | null {
  const containerWidth = getTutorialLayoutWidth(stack);
  const containerHeight = getTutorialLayoutHeight(stack);
  const measured = useMobileCover
    ? measureCoverVideoFrame(
        containerWidth,
        containerHeight,
        videoWidth,
        videoHeight,
      )
    : measureTopHeightVideoFrame(
        containerWidth,
        containerHeight,
        videoWidth,
        videoHeight,
      );
  if (!measured) return null;
  return measured;
}

function layoutsEqual(a: ClipLayout | undefined, b: ClipLayout): boolean {
  return (
    a?.top === b.top &&
    a?.left === b.left &&
    a?.width === b.width &&
    a?.height === b.height
  );
}

function primeClipForPlayback(video: HTMLVideoElement): void {
  if (video.currentTime > 0.05) {
    try {
      video.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}

function getTutorialLayoutWidth(stack: HTMLElement): number {
  if (typeof window !== "undefined" && window.visualViewport?.width) {
    return Math.round(window.visualViewport.width);
  }
  return Math.round(stack.clientWidth);
}

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

function kickstartVideoInUserGesture(
  video: HTMLVideoElement,
  soundUnlocked: boolean,
): void {
  const wantSound = isLobbySoundEnabled() && soundUnlocked;
  video.playsInline = true;
  video.muted = !wantSound;
  if (!video.src) return;
  if (!video.paused) return;
  const attempt = video.play();
  if (attempt) {
    void attempt.catch(() => {
      video.muted = true;
      void video.play().catch(() => {});
    });
  }
}

/** Muted autoplay when needed (refresh-safe), then unmute when sound is allowed. */
async function playTutorialVideo(
  video: HTMLVideoElement,
  soundUnlocked: boolean,
  fromUserGesture = false,
): Promise<{ ok: true; soundUnlocked: boolean } | { ok: false }> {
  const wantSound = isLobbySoundEnabled();
  video.playsInline = true;

  if (fromUserGesture) {
    kickstartVideoInUserGesture(video, soundUnlocked);
    try {
      if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        await waitForVideoCanPlay(video);
      }
      if (!video.paused) {
        await waitForFirstVideoFrame(video);
        return { ok: true, soundUnlocked: soundUnlocked && wantSound };
      }
      kickstartVideoInUserGesture(video, soundUnlocked);
      if (!video.paused) {
        await waitForFirstVideoFrame(video);
        return { ok: true, soundUnlocked: soundUnlocked && wantSound };
      }
    } catch {
      return { ok: false };
    }
    return { ok: false };
  }

  if (wantSound && soundUnlocked) {
    video.muted = false;
    try {
      if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        await waitForVideoCanPlay(video);
      }
      if (video.paused) await video.play();
      await waitForFirstVideoFrame(video);
      return { ok: true, soundUnlocked: true };
    } catch {
      video.muted = true;
    }
  }

  video.muted = true;
  if (video.paused && video.src) {
    try {
      await video.play();
      await waitForFirstVideoFrame(video);
      if (wantSound && soundUnlocked) {
        video.muted = false;
        try {
          await video.play();
          return { ok: true, soundUnlocked: true };
        } catch {
          video.muted = true;
        }
      }
      return {
        ok: true,
        soundUnlocked: soundUnlocked && wantSound && !video.muted,
      };
    } catch {
      /* fall through */
    }
  }

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

  if (wantSound && soundUnlocked) {
    if (await tryUnmuted()) {
      await waitForFirstVideoFrame(video);
      return { ok: true, soundUnlocked: true };
    }
  }

  video.muted = true;
  try {
    if (video.paused) await video.play();
    await waitForFirstVideoFrame(video);
  } catch {
    return { ok: false };
  }

  if (wantSound && soundUnlocked) {
    const unmuted = await tryUnmuted();
    return { ok: true, soundUnlocked: unmuted || soundUnlocked };
  }

  return { ok: true, soundUnlocked: soundUnlocked && wantSound };
}

function captureTutorialSoundUnlockFromUserActivation(): boolean {
  if (consumeTutorialSoundUnlockedFromLoginGesture()) return true;
  if (!isLobbySoundEnabled()) return false;
  if (typeof navigator === "undefined") return false;
  return navigator.userActivation?.isActive === true;
}

export function NewbieVideoTutorialOverlay({ open, onComplete }: Props) {
  const stackRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const resumePlayOnTapRef = useRef(false);
  const soundUnlockedRef = useRef(false);
  const [videoSoundOn, setVideoSoundOn] = useState(false);
  const [index, setIndex] = useState(0);
  const [activeVideoReady, setActiveVideoReady] = useState(false);
  const [awaitingClick, setAwaitingClick] = useState(false);
  const [needsTapToResume, setNeedsTapToResume] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [videoFrame, setVideoFrame] = useState<VideoFrameRect | null>(null);
  const [iosBootNeedsTap, setIosBootNeedsTap] = useState(false);
  const playNextFromGestureRef = useRef(false);
  const iosManualPlayRef = useRef(false);
  const clipAutoplayStartedRef = useRef<number | null>(null);
  const clipEndedHandledRef = useRef(false);
  const useMobileLayeredStack = isMobileBrowser();
  const [clipLayouts, setClipLayouts] = useState<(ClipLayout | undefined)[]>(
    () => Array.from({ length: NEWBIE_VIDEO_TUTORIAL_CLIPS.length }),
  );

  const activeClip = NEWBIE_VIDEO_TUTORIAL_CLIPS[index];
  const lastClip = index >= NEWBIE_VIDEO_TUTORIAL_CLIPS.length - 1;

  const syncVideoSoundOn = useCallback((on: boolean) => {
    soundUnlockedRef.current = on;
    setVideoSoundOn(on);
  }, []);

  useEffect(() => {
    setTutorialOverlayOpen(open);
    return () => setTutorialOverlayOpen(false);
  }, [open]);

  const ensureVideoSoundUnlocked = useCallback(() => {
    if (soundUnlockedRef.current) return;
    if (
      captureTutorialSoundUnlockFromUserActivation() ||
      isLobbySoundEnabled()
    ) {
      syncVideoSoundOn(true);
    }
  }, [syncVideoSoundOn]);

  useLayoutEffect(() => {
    if (!open) {
      releaseVideos(videoRefs.current);
      syncVideoSoundOn(false);
      clipAutoplayStartedRef.current = null;
      return;
    }
    setIndex(0);
    setActiveVideoReady(false);
    setAwaitingClick(false);
    setLoadFailed(false);
    setVideoFrame(null);
    resumePlayOnTapRef.current = false;
    playNextFromGestureRef.current = false;
    iosManualPlayRef.current = false;
    clipAutoplayStartedRef.current = null;
    setIosBootNeedsTap(false);
    setClipLayouts(Array.from({ length: NEWBIE_VIDEO_TUTORIAL_CLIPS.length }));
  }, [open, syncVideoSoundOn]);

  useEffect(() => {
    setAwaitingClick(false);
    clipEndedHandledRef.current = false;
    if (!useMobileLayeredStack) {
      setVideoFrame(null);
    }
  }, [index, useMobileLayeredStack]);

  useEffect(() => {
    if (!open || activeVideoReady || index !== 0 || !isIOSWebKit()) {
      setIosBootNeedsTap(false);
      return;
    }
    const timer = window.setTimeout(() => {
      if (!activeVideoReady) {
        resumePlayOnTapRef.current = true;
        setNeedsTapToResume(true);
        setIosBootNeedsTap(true);
      }
    }, 1_200);
    return () => window.clearTimeout(timer);
  }, [open, index, activeVideoReady]);

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

  const updateClipLayout = useCallback(
    (clipIndex: number, video: HTMLVideoElement) => {
      const stack = stackRef.current;
      if (!stack) return;
      const measured = measureClipLayout(
        stack,
        video.videoWidth,
        video.videoHeight,
        useMobileLayeredStack,
      );
      if (!measured) return;
      setClipLayouts((prev) => {
        const current = prev[clipIndex];
        if (layoutsEqual(current, measured)) return prev;
        const next = [...prev];
        next[clipIndex] = measured;
        return next;
      });
    },
    [useMobileLayeredStack],
  );

  const syncVideoFrame = useCallback(() => {
    const stack = stackRef.current;
    const video = videoRefs.current[index];
    if (!stack) {
      setVideoFrame(null);
      return;
    }
    const layout = clipLayouts[index];
    if (layout) {
      setVideoFrame(layout);
      return;
    }
    if (!video) {
      setVideoFrame(null);
      return;
    }
    setVideoFrame(
      measureClipLayout(
        stack,
        video.videoWidth,
        video.videoHeight,
        useMobileLayeredStack,
      ),
    );
  }, [clipLayouts, index, useMobileLayeredStack]);

  const remeasureAllClipLayouts = useCallback(() => {
    const stack = stackRef.current;
    if (!stack) return;
    setClipLayouts((prev) => {
      let changed = false;
      const next = [...prev];
      videoRefs.current.forEach((video, i) => {
        if (!video || video.videoWidth <= 0) return;
        const measured = measureClipLayout(
          stack,
          video.videoWidth,
          video.videoHeight,
          useMobileLayeredStack,
        );
        if (!measured) return;
        if (layoutsEqual(next[i], measured)) return;
        next[i] = measured;
        changed = true;
      });
      return changed ? next : prev;
    });
  }, [useMobileLayeredStack]);

  const tryPlayClip = useCallback(
    async (clipIndex: number, fromUserGesture = false, isAutoChain = false) => {
      const video = videoRefs.current[clipIndex];
      if (!video) return false;
      if (soundUnlockedRef.current && isLobbySoundEnabled()) {
        video.muted = false;
      }
      if (fromUserGesture) {
        syncVideoSoundOn(true);
        primeClipForPlayback(video);
        kickstartVideoInUserGesture(video, true);
      } else if (!isAutoChain) {
        setActiveVideoReady(false);
        setLoadFailed(false);
      }
      setAwaitingClick(false);
      const result = await playTutorialVideo(
        video,
        soundUnlockedRef.current,
        fromUserGesture,
      );
      if (!result.ok) {
        resumePlayOnTapRef.current = true;
        setNeedsTapToResume(true);
        setLoadFailed(true);
        if (isAutoChain || clipIndex > 0) {
          setAwaitingClick(true);
        }
        return false;
      }
      pauseAllExcept(clipIndex);
      soundUnlockedRef.current = result.soundUnlocked;
      setVideoSoundOn(result.soundUnlocked);
      setActiveVideoReady(true);
      resumePlayOnTapRef.current = false;
      setNeedsTapToResume(false);
      setLoadFailed(false);
      setIosBootNeedsTap(false);
      return true;
    },
    [pauseAllExcept, syncVideoSoundOn],
  );

  const handleClipMetadata = useCallback(
    (clipIndex: number, video: HTMLVideoElement) => {
      updateClipLayout(clipIndex, video);
      if (clipIndex === index) {
        syncVideoFrame();
      }
    },
    [index, updateClipLayout, syncVideoFrame],
  );

  const tryPlayActive = useCallback(
    async (fromUserGesture = false) => tryPlayClip(index, fromUserGesture),
    [index, tryPlayClip],
  );

  useLayoutEffect(() => {
    if (!open) return;
    if (!isMobileBrowser()) {
      pauseAllExcept(index);
    }
    if (isIOSWebKit()) {
      if (iosManualPlayRef.current) {
        iosManualPlayRef.current = false;
        return;
      }
      if (index === 0 && !resumePlayOnTapRef.current) {
        if (clipAutoplayStartedRef.current === 0) return;
        clipAutoplayStartedRef.current = 0;
        ensureVideoSoundUnlocked();
        void tryPlayActive(false);
      }
      return;
    }
    const fromGesture = playNextFromGestureRef.current;
    playNextFromGestureRef.current = false;
    if (index === 0) ensureVideoSoundUnlocked();
    void tryPlayActive(fromGesture);
  }, [open, index, pauseAllExcept, tryPlayActive, ensureVideoSoundUnlocked]);

  useEffect(() => {
    if (!open || !useMobileLayeredStack) return;
    syncVideoFrame();
  }, [open, index, clipLayouts, useMobileLayeredStack, syncVideoFrame]);

  useLayoutEffect(() => {
    if (!open) return;
    remeasureAllClipLayouts();
    syncVideoFrame();
    const stack = stackRef.current;
    if (!stack) return;
    const onLayoutChange = () => {
      remeasureAllClipLayouts();
      syncVideoFrame();
    };
    const observer = new ResizeObserver(onLayoutChange);
    observer.observe(stack);
    window.addEventListener("resize", onLayoutChange);
    window.visualViewport?.addEventListener("resize", onLayoutChange);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onLayoutChange);
      window.visualViewport?.removeEventListener("resize", onLayoutChange);
    };
  }, [open, index, activeVideoReady, remeasureAllClipLayouts, syncVideoFrame]);

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
    if (!activeClip || clipEndedHandledRef.current) return;
    clipEndedHandledRef.current = true;
    if (activeClip.requiresClickAfterEnd) {
      setAwaitingClick(true);
      return;
    }
    if (lastClip) {
      finish();
      return;
    }
    const nextIndex = index + 1;
    if (isIOSWebKit()) {
      flushSync(() => {
        setIndex(nextIndex);
      });
      const nextVideo = videoRefs.current[nextIndex];
      if (nextVideo) {
        primeClipForPlayback(nextVideo);
        kickstartVideoInUserGesture(nextVideo, soundUnlockedRef.current);
      }
      void tryPlayClip(nextIndex, false, true).then((ok) => {
        if (!ok) {
          setAwaitingClick(true);
        }
      });
      return;
    }
    advance();
  }, [activeClip, lastClip, finish, advance, index, tryPlayClip]);

  const goToNextClip = useCallback(
    (fromUserGesture: boolean) => {
      clipEndedHandledRef.current = true;
      videoRefs.current[index]?.pause();

      syncVideoSoundOn(true);
      setAwaitingClick(false);
      setNeedsTapToResume(false);
      setLoadFailed(false);
      resumePlayOnTapRef.current = false;
      setIosBootNeedsTap(false);

      if (lastClip) {
        finish();
        return;
      }

      const nextIndex = index + 1;
      iosManualPlayRef.current = true;
      if (!isIOSWebKit()) {
        playNextFromGestureRef.current = fromUserGesture;
      }
      flushSync(() => {
        setIndex(nextIndex);
      });
      if (isIOSWebKit()) {
        const nextVideo = videoRefs.current[nextIndex];
        if (nextVideo) {
          primeClipForPlayback(nextVideo);
          kickstartVideoInUserGesture(nextVideo, true);
        }
        void tryPlayClip(nextIndex, true);
      }
    },
    [index, lastClip, finish, syncVideoSoundOn, tryPlayClip],
  );

  const onTap = useCallback(() => {
    if (resumePlayOnTapRef.current || iosBootNeedsTap) {
      iosManualPlayRef.current = true;
      setIosBootNeedsTap(false);
      clipAutoplayStartedRef.current = null;
      void tryPlayClip(index, true);
      return;
    }
    if (awaitingClick || activeVideoReady) {
      goToNextClip(true);
    }
  }, [tryPlayClip, awaitingClick, activeVideoReady, index, goToNextClip, iosBootNeedsTap]);

  const showResumeHint = needsTapToResume || loadFailed;
  const isTapTarget =
    awaitingClick ||
    showResumeHint ||
    iosBootNeedsTap ||
    activeVideoReady;
  const showBootHint =
    open &&
    index === 0 &&
    !activeVideoReady &&
    !awaitingClick &&
    !showResumeHint &&
    !iosBootNeedsTap;
  const showBootCover = open && index === 0 && !activeVideoReady;

  if (!open) return null;

  return createPortal(
    <div
      className={
        (useMobileLayeredStack
          ? "newbie-video-tutorial newbie-video-tutorial--mobile"
          : "newbie-video-tutorial") +
        (activeVideoReady ? " newbie-video-tutorial--playing" : "") +
        (showBootCover ? " newbie-video-tutorial--booting" : "") +
        (isTapTarget ? " newbie-video-tutorial--awaiting-tap" : "")
      }
      role="dialog"
      aria-modal="true"
      aria-label="New player tutorial"
      onPointerUp={onTap}
      onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={stackRef}
        className={
          "newbie-video-tutorial__viewport" +
          (useMobileLayeredStack
            ? " newbie-video-tutorial__viewport--mobile"
            : " newbie-video-tutorial__viewport--desktop")
        }>
        <div
          className={
            "newbie-video-tutorial__stack" +
            (useMobileLayeredStack
              ? " newbie-video-tutorial__stack--mobile-layered"
              : "")
          }>
          {NEWBIE_VIDEO_TUTORIAL_CLIPS.map((clip, i) => {
            const active = i === index;
            const layout = clipLayouts[i];
            const layoutStyle = layout
              ? {
                  top: layout.top,
                  left: layout.left,
                  width: layout.width,
                  height: layout.height,
                }
              : useMobileLayeredStack
                ? { width: "100%", minWidth: "100%" }
                : { height: "100%" };
            return (
              <video
                key={clip.src}
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                className={
                  "newbie-video-tutorial__video" +
                  (useMobileLayeredStack
                    ? active
                      ? " newbie-video-tutorial__video--mobile-active"
                      : " newbie-video-tutorial__video--mobile-behind"
                    : " newbie-video-tutorial__video--desktop-fit" +
                      (!active
                        ? " newbie-video-tutorial__video--inactive"
                        : ""))
                }
                style={layoutStyle}
                src={clip.src}
                playsInline
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                muted={!videoSoundOn || !isLobbySoundEnabled()}
                preload={i === index || i === index + 1 ? "auto" : "metadata"}
                draggable={false}
                controlsList="nodownload nofullscreen noremoteplayback"
                aria-hidden={!active}
                onLoadedMetadata={(event) =>
                  handleClipMetadata(i, event.currentTarget)
                }
                onEnded={active ? onActiveVideoEnded : undefined}
              />
            );
          })}
        </div>
        {showBootCover ? (
          <div
            className="newbie-video-tutorial__boot-cover"
            aria-hidden="true"
          />
        ) : null}
        {videoFrame ? (
          <div
            className="newbie-video-tutorial__video-frame"
            style={{
              top: videoFrame.top,
              left: videoFrame.left,
              width: videoFrame.width,
              height: videoFrame.height,
            }}>
            <button
              type="button"
              className="newbie-video-tutorial__skip"
              onClick={(e) => {
                e.stopPropagation();
                finish();
              }}
              onPointerUp={(e) => e.stopPropagation()}>
              Skip
            </button>
          </div>
        ) : null}
      </div>
      {showBootHint ? (
        <p className="newbie-video-tutorial__hint" aria-live="polite">
          Loading tutorial…
        </p>
      ) : null}
    </div>,
    document.body,
  );
}
