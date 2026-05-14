import { Fragment, type ReactNode } from "react";

type Chunk = {
  text: string;
  bold: boolean;
  colorHex: string | null;
};

/**
 * Parses a minimal BBCode subset:
 * - `[b]…[/b]` bold
 * - `[RRGGBB]…[-]` hex color (no `#`)
 * Unknown `[...]` sequences are emitted as literal text.
 */
function chunkBbcode(source: string): Chunk[] {
  const chunks: Chunk[] = [];
  let bold = false;
  let colorHex: string | null = null;
  let buf = "";
  let i = 0;

  const pushBuf = () => {
    if (!buf) return;
    chunks.push({ text: buf, bold, colorHex });
    buf = "";
  };

  while (i < source.length) {
    const c = source[i];
    if (c !== "[") {
      buf += c;
      i++;
      continue;
    }

    if (source.startsWith("[b]", i)) {
      pushBuf();
      bold = true;
      i += "[b]".length;
      continue;
    }
    if (source.startsWith("[/b]", i)) {
      pushBuf();
      bold = false;
      i += "[/b]".length;
      continue;
    }
    if (source.startsWith("[-]", i)) {
      pushBuf();
      colorHex = null;
      i += "[-]".length;
      continue;
    }

    const rest = source.slice(i + 1);
    const hexMatch = /^([0-9A-Fa-f]{6})\]/.exec(rest);
    if (hexMatch) {
      pushBuf();
      colorHex = hexMatch[1];
      i += 1 + hexMatch[0].length;
      continue;
    }

    buf += c;
    i++;
  }
  pushBuf();
  return chunks;
}

function renderChunk(chunk: Chunk, key: number): ReactNode {
  let n: ReactNode = chunk.text;
  if (chunk.bold) {
    n = <strong>{n}</strong>;
  }
  if (chunk.colorHex) {
    n = <span style={{ color: `#${chunk.colorHex}` }}>{n}</span>;
  }
  return <Fragment key={key}>{n}</Fragment>;
}

/** Renders BBCode into React nodes (no `dangerouslySetInnerHTML`). */
export function renderBbcodeTutorial(source: string): ReactNode {
  const chunks = chunkBbcode(source);
  return chunks.map((chunk, idx) => renderChunk(chunk, idx));
}
