import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { isChunkLoadError, reloadForStaleChunk } from "./chunkLoadRecovery";

export function lazyRoute<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (isChunkLoadError(error)) {
        reloadForStaleChunk("lazy-import");
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }),
  );
}

export function lazyRouteWithProps<Props extends object>(
  factory: () => Promise<{ default: ComponentType<Props> }>,
): LazyExoticComponent<ComponentType<Props>> {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (isChunkLoadError(error)) {
        reloadForStaleChunk("lazy-import");
        return new Promise<{ default: ComponentType<Props> }>(() => {});
      }
      throw error;
    }),
  ) as LazyExoticComponent<ComponentType<Props>>;
}
