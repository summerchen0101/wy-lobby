import type { ReactNode } from "react";
import { getWord, type WordDataId } from "./getWord";

type Props = {
  id: WordDataId;
  args?: (string | number)[];
  className?: string;
};

const TAG_RE = /\[([0-9A-Fa-f]{6})\]([\s\S]*?)\[-\]/g;

function parseRichText(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let segment = 0;

  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const color = `#${match[1]}`;
    nodes.push(
      <span key={`${keyPrefix}-${segment++}`} style={{ color }}>
        {match[2]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function WordDataText({ id, args = [], className }: Props) {
  const text = getWord(id, ...args);
  const parts = parseRichText(text, `wd-${id}`);
  return <span className={className}>{parts}</span>;
}
