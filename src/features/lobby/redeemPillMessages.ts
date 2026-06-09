export function sanitizePillMessages(messages: string[]): string[] {
  return messages.map((s) => s.trim()).filter(Boolean);
}
