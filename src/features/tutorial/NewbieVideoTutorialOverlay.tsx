import "./NewbieVideoTutorialOverlay.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NEWBIE_VIDEO_TUTORIAL_SOURCES } from "./newbieVideoTutorialSources";
import { markNewbieTutorialDone } from "./tutorialStorage";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function NewbieVideoTutorialOverlay({ open, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resumePlayOnTapRef = useRef(false);
  const [index, setIndex] = useState(0);

  const src = NEWBIE_VIDEO_TUTORIAL_SOURCES[index];
  const lastClip = index >= NEWBIE_VIDEO_TUTORIAL_SOURCES.length - 1;

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    resumePlayOnTapRef.current = false;
  }, [open]);

  const tryPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return true;
    try {
      await video.play();
      resumePlayOnTapRef.current = false;
      return true;
    } catch {
      resumePlayOnTapRef.current = true;
      return false;
    }
  }, []);

  useEffect(() => {
    if (!open || !src) return;
    const video = videoRef.current;
    if (!video) return;
    video.load();
    void tryPlay();
  }, [open, src, tryPlay]);

  useEffect(() => {
    if (open) return;
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }, [open]);

  const finish = useCallback(() => {
    markNewbieTutorialDone();
    onClose();
  }, [onClose]);

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
      void tryPlay();
      return;
    }
    advance();
  }, [tryPlay, advance]);

  if (!open || !src) return null;

  return createPortal(
    <div
      className="newbie-video-tutorial"
      role="dialog"
      aria-modal="true"
      aria-label="New player tutorial"
      onClick={onTap}>
      <video
        ref={videoRef}
        className="newbie-video-tutorial__video"
        src={src}
        playsInline
        autoPlay
        preload="auto"
      />
    </div>,
    document.body,
  );
}
