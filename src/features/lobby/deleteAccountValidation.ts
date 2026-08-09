/** Must match APK: exact uppercase DELETE after trim (no case folding). */
export function isDeleteConfirmTextValid(text: string): boolean {
  return text.trim() === "DELETE";
}
