import { WORD_DATA } from "./wordData.generated";

export type WordDataId = number;

/**
 * Look up a WordData string by numeric ID and replace `{0}`, `{1}`, … placeholders.
 */
export function getWord(id: WordDataId, ...args: (string | number)[]): string {
  const template = WORD_DATA[id];
  if (template === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[wordData] missing id ${id}`);
    }
    return "";
  }
  if (args.length === 0) return template;
  return template.replace(/\{(\d+)\}/g, (_, index: string) => {
    const i = Number(index);
    if (!Number.isFinite(i) || i < 0 || i >= args.length) return `{${index}}`;
    return String(args[i]);
  });
}

/** Strip rich-text color tags for plain-text contexts (aria-label, title, etc.). */
export function stripWordDataTags(text: string): string {
  return text.replace(/\[[0-9A-Fa-f]{6}\]/g, "").replace(/\[-\]/g, "");
}

export function getWordPlain(id: WordDataId, ...args: (string | number)[]): string {
  return stripWordDataTags(getWord(id, ...args));
}
