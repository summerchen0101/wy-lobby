import {
  useCallback,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";

const DRAG_THRESHOLD_PX = 4;

type LobbyGamesScrollerProps = {
  children: ReactNode;
  scrollerRef?: Ref<HTMLDivElement>;
};

function mergeScrollerRef(
  node: HTMLDivElement | null,
  scrollerRef?: Ref<HTMLDivElement>,
) {
  if (!scrollerRef) return;
  if (typeof scrollerRef === "function") {
    scrollerRef(node);
    return;
  }
  scrollerRef.current = node;
}

export function LobbyGamesScroller({
  children,
  scrollerRef,
}: LobbyGamesScrollerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    dragged: false,
  });

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      mergeScrollerRef(node, scrollerRef);
    },
    [scrollerRef],
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      const delta = absX > absY ? e.deltaX : e.deltaY;
      if (delta === 0) return;

      const prev = el.scrollLeft;
      const next = Math.max(0, Math.min(maxScroll, prev + delta));
      if (next === prev) return;

      el.scrollLeft = next;
      e.preventDefault();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    const el = e.currentTarget;
    if (el.scrollWidth <= el.clientWidth) return;

    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      dragged: false,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (state.pointerId !== e.pointerId) return;

    const el = e.currentTarget;
    const dx = e.clientX - state.startX;
    if (!state.dragged && Math.abs(dx) < DRAG_THRESHOLD_PX) return;

    if (!state.dragged) {
      state.dragged = true;
      el.classList.add("is-dragging");
    }

    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.max(
      0,
      Math.min(maxScroll, state.startScrollLeft - dx),
    );
  }, []);

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (state.pointerId !== e.pointerId) return;

    const el = e.currentTarget;
    const dragged = state.dragged;
    state.pointerId = -1;
    state.dragged = false;
    el.classList.remove("is-dragging");

    if (el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }

    if (dragged) {
      const suppressClick = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        el.removeEventListener("click", suppressClick, true);
      };
      el.addEventListener("click", suppressClick, true);
    }
  }, []);

  return (
    <div
      ref={setRef}
      className="lobby-games-scroller"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}>
      {children}
    </div>
  );
}
