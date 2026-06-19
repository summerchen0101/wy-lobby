import type { ReactNode } from "react";
import {
  LOBBY_BANNER_SUBTITLE,
  LOBBY_BANNER_SUBTITLE_ANIM,
  LOBBY_BANNER_TITLE,
} from "../features/lobby/landingContent";
import "./LobbyHeroBanner.css";

type Props = {
  baseSrc: string;
  children?: ReactNode;
};

export function LobbyHeroBanner({ baseSrc, children }: Props) {
  return (
    <div className="lobby-hero-banner__art-wrap">
      <img
        className="lobby-hero-banner__img lobby-hero-banner__img--base"
        src={baseSrc}
        alt=""
        width={1536}
        height={1364}
        decoding="async"
      />
      {children}
    </div>
  );
}
