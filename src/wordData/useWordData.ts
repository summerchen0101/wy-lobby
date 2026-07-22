import { useCallback } from "react";
import { getWord, type WordDataId } from "./getWord";

export type WordDataFn = (id: WordDataId, ...args: (string | number)[]) => string;

/** React hook returning a stable `getWord` lookup function. */
export function useWordData(): WordDataFn {
  return useCallback(
    (id: WordDataId, ...args: (string | number)[]) => getWord(id, ...args),
    [],
  );
}
