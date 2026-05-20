import { publicImageUrl } from "../../lib/publicImageUrl";

const VIDEO_COUNT = 10;

/** Full-screen newbie tutorial clips: 1 → 1Out → 2 → 2Out → … → 10Out. */
export const NEWBIE_VIDEO_TUTORIAL_SOURCES: readonly string[] = Array.from(
  { length: VIDEO_COUNT },
  (_, i) => {
    const n = i + 1;
    return [
      publicImageUrl(`/videos/${n}.mp4`),
      publicImageUrl(`/videos/${n}Out.mp4`),
    ];
  },
).flat();
