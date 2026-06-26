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

  const syncScrollEdgeMask = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const atStart = maxScroll <= 1 || el.scrollLeft <= 1;
    const atEnd = maxScroll <= 1 || el.scrollLeft >= maxScroll - 1;
    el.classList.toggle("is-scroll-at-start", atStart);
    el.classList.toggle("is-scroll-at-end", atEnd);
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    syncScrollEdgeMask();
    const content = el.firstElementChild;
    const onScroll = () => syncScrollEdgeMask();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    if (content) ro.observe(content);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
    };
  }, [syncScrollEdgeMask]);

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
      syncScrollEdgeMask();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [syncScrollEdgeMask]);

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
    // Defer capture until drag starts so button clicks inside the track still fire.
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
      if (!el.hasPointerCapture(e.pointerId)) {
        el.setPointerCapture(e.pointerId);
      }
    }

    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.max(
      0,
      Math.min(maxScroll, state.startScrollLeft - dx),
    );
    syncScrollEdgeMask();
  }, [syncScrollEdgeMask]);

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

    syncScrollEdgeMask();

    if (dragged) {
      const suppressClick = (ev: MouseEvent) => {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        el.removeEventListener("click", suppressClick, true);
      };
      el.addEventListener("click", suppressClick, true);
    }
  }, [syncScrollEdgeMask]);

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
