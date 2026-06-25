import { publicImageUrl } from "../../lib/publicImageUrl";

const VIDEO_COUNT = 19;

/** Full-screen newbie tutorial clips: 1 → 2 → … → 19. */
export const NEWBIE_VIDEO_TUTORIAL_SOURCES: readonly string[] = Array.from(
  { length: VIDEO_COUNT },
  (_, i) => publicImageUrl(`/videos/${i + 1}.mp4`),
);
