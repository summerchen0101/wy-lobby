import "./NewbieVideoTutorialOverlay.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NEWBIE_VIDEO_TUTORIAL_SOURCES } from "./newbieVideoTutorialSources";
import { markNewbieTutorialDone } from "./tutorialStorage";

type Props = {
  open: boolean;
  onClose: () => void;
};

function releaseVideos(videos: readonly (HTMLVideoElement | null)[]) {
  for (const video of videos) {
    if (!video) continue;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

export function NewbieVideoTutorialOverlay({ open, onClose }: Props) {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const resumePlayOnTapRef = useRef(false);
  const [index, setIndex] = useState(0);

  const lastClip = index >= NEWBIE_VIDEO_TUTORIAL_SOURCES.length - 1;

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    resumePlayOnTapRef.current = false;
  }, [open]);

  const pauseAllExcept = useCallback((activeIndex: number) => {
    videoRefs.current.forEach((video, i) => {
      if (!video || i === activeIndex) return;
      video.pause();
    });
  }, []);

  const tryPlayActive = useCallback(async () => {
    const video = videoRefs.current[index];
    if (!video) return true;
    try {
      await video.play();
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

  const releaseAllVideos = useCallback(() => {
    releaseVideos(videoRefs.current);
  }, []);

  const finish = useCallback(() => {
    releaseAllVideos();
    markNewbieTutorialDone();
    onClose();
  }, [onClose, releaseAllVideos]);

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
          return (
            <video
              key={src}
              ref={(el) => {
                videoRefs.current[i] = el;
              }}
              className={
                active
                  ? "newbie-video-tutorial__video"
                  : "newbie-video-tutorial__video newbie-video-tutorial__video--hidden"
              }
              src={src}
              playsInline
              preload="auto"
              draggable={false}
              controlsList="nodownload nofullscreen noremoteplayback"
              aria-hidden={!active}
            />
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
