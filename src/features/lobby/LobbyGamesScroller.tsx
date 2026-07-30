import { type ReactNode, type Ref } from "react";
import { useHorizontalScrollContainer } from "../../hooks/useHorizontalScrollContainer";

type LobbyGamesScrollerProps = {
  children: ReactNode;
  scrollerRef?: Ref<HTMLDivElement>;
};

export function LobbyGamesScroller({
  children,
  scrollerRef,
}: LobbyGamesScrollerProps) {
  const {
    setContainerRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
  } = useHorizontalScrollContainer({
    externalRef: scrollerRef,
    edgeMask: true,
  });

  return (
    <div
      ref={setContainerRef}
      className="lobby-games-scroller"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}>
      {children}
    </div>
  );
}
