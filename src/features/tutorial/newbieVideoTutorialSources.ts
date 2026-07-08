import { publicImageUrl } from "../../lib/publicImageUrl";

/**
 * Newbie tutorial clip manifest (source of truth for play order and tap behavior).
 *
 * Naming rule (source files in `美版新手教學影片 3`):
 * - Filename contains `click` → user must tap after playback ends to advance.
 * - Otherwise → auto-advance on `ended`.
 *
 * Deployed as `public/videos/1.mp4` … `19.mp4` (CDN paths unchanged).
 */
export type NewbieVideoTutorialClip = {
  /** Deployed filename under `/videos/`. */
  deploy: string;
  /** Original source filename (for copy script / asset handoff). */
  source: string;
  requiresClickAfterEnd: boolean;
  src: string;
};

const CLIP_DEFS: readonly {
  deploy: string;
  source: string;
  requiresClickAfterEnd: boolean;
}[] = [
  { deploy: "1.mp4", source: "1_click.mp4", requiresClickAfterEnd: true },
  { deploy: "2.mp4", source: "1Out.mp4", requiresClickAfterEnd: false },
  { deploy: "3.mp4", source: "2_click.mp4", requiresClickAfterEnd: true },
  { deploy: "4.mp4", source: "2Out.mp4", requiresClickAfterEnd: false },
  { deploy: "5.mp4", source: "3_click.mp4", requiresClickAfterEnd: true },
  { deploy: "6.mp4", source: "3-1_click.mp4", requiresClickAfterEnd: true },
  { deploy: "7.mp4", source: "4_click.mp4", requiresClickAfterEnd: true },
  { deploy: "8.mp4", source: "5_click.mp4", requiresClickAfterEnd: true },
  { deploy: "9.mp4", source: "5-1_click.mp4", requiresClickAfterEnd: true },
  { deploy: "10.mp4", source: "6.mp4", requiresClickAfterEnd: false },
  { deploy: "11.mp4", source: "6_click.mp4", requiresClickAfterEnd: true },
  { deploy: "12.mp4", source: "7.mp4", requiresClickAfterEnd: false },
  { deploy: "13.mp4", source: "7_click.mp4", requiresClickAfterEnd: true },
  { deploy: "14.mp4", source: "8_click.mp4", requiresClickAfterEnd: true },
  { deploy: "15.mp4", source: "8-1_click.mp4", requiresClickAfterEnd: true },
  { deploy: "16.mp4", source: "9.mp4", requiresClickAfterEnd: false },
  { deploy: "17.mp4", source: "9-1_click.mp4", requiresClickAfterEnd: true },
  { deploy: "18.mp4", source: "10_click.mp4", requiresClickAfterEnd: true },
  { deploy: "19.mp4", source: "10-1_click.mp4", requiresClickAfterEnd: true },
] as const;

export const NEWBIE_VIDEO_TUTORIAL_CLIPS: readonly NewbieVideoTutorialClip[] =
  CLIP_DEFS.map((clip) => ({
    ...clip,
    src: publicImageUrl(`/videos/${clip.deploy}`),
  }));

export const NEWBIE_VIDEO_TUTORIAL_CLIP_COUNT =
  NEWBIE_VIDEO_TUTORIAL_CLIPS.length;

/** Full-screen newbie tutorial clips: 1 → 2 → … → 19. */
export const NEWBIE_VIDEO_TUTORIAL_SOURCES: readonly string[] =
  NEWBIE_VIDEO_TUTORIAL_CLIPS.map((clip) => clip.src);
