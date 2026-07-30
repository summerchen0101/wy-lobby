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
  const scroll = useHorizontalScrollContainer({
    externalRef: scrollerRef,
    edgeMask: true,
  });

  return (
    <div
      ref={scroll.ref}
      className="lobby-games-scroller"
      onPointerDown={scroll.onPointerDown}
      onPointerMove={scroll.onPointerMove}
      onPointerUp={scroll.onPointerUp}
      onPointerCancel={scroll.onPointerCancel}
      onLostPointerCapture={scroll.onLostPointerCapture}>
      {children}
    </div>
  );
}
