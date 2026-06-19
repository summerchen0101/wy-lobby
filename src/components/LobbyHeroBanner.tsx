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
      <img
        className="lobby-hero-banner__layer lobby-hero-banner__layer--title"
        src={LOBBY_BANNER_TITLE}
        alt=""
        width={1447}
        height={1017}
        decoding="async"
      />
      <img
        className="lobby-hero-banner__layer lobby-hero-banner__layer--subtitle"
        src={LOBBY_BANNER_SUBTITLE}
        alt=""
        width={1536}
        height={1364}
        decoding="async"
      />
      <img
        className="lobby-hero-banner__layer lobby-hero-banner__layer--subtitle-anim"
        src={LOBBY_BANNER_SUBTITLE_ANIM}
        alt=""
        width={662}
        height={413}
        decoding="async"
      />
      {children}
    </div>
  );
}
