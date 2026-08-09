import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { LandingHeader } from "../../components/LandingHeader";
import { LobbyJackpotStrip } from "../../components/LobbyJackpotStrip";
import { LobbyHeroBanner } from "../../components/LobbyHeroBanner";
import { SessionChromeShell } from "../../components/session/SessionChromeShell";
import { SupportFab } from "../../components/session/SupportFab";
import { LobbyComplianceFooter } from "../../components/LobbyComplianceFooter";
import { TrustpilotSection } from "../../components/TrustpilotSection";
import { useGameShell } from "../../components/useGameShell";
import { useBlockingLoad } from "../../components/loading/useBlockingLoad";
import { getWord } from "../../wordData/getWord";
import { useAuthModals } from "../auth/authModalsContext";
import { ForgotPasswordModal } from "../auth/ForgotPasswordModal";
import { LoginModal } from "../auth/LoginModal";
import { PhoneVerificationModal } from "../auth/PhoneVerificationModal";
import { RegisterModal } from "../auth/RegisterModal";
import { TermsGateModal } from "../auth/TermsGateModal";
import {
  trustpilotBusinessUnitId,
  unityWebEntryDefaultGameId,
  isSlotWebEntryEnabled,
  isDevConsoleEnabled,
  isThirdPartyGamesEnabled,
  isWsLobbyGamesEnabled,
  buildGameCallbackUrl,
} from "../../lib/env";
import {
  buildGameShellLobbyReturn,
  consumeGameShellLobbyReturn,
  isProviderTabId,
  lobbyTabDomId,
  providerPlatformFromTabId,
  providerTabId,
  type LobbyFilterTab,
} from "../../lib/gameShellLobbyReturn";
import {
  sortThirdPartyPlatforms,
  thirdPartyPlatformDisplayName,
} from "../../lib/thirdPartyPlatformDisplay";
import { GATEWAY_API_GET_THIRD_PARTY_GAME_INFO } from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import {
  decodeGetThirdPartyGameInfoResponseBytes,
  encodeGetThirdPartyGameInfoRequest,
} from "../../realtime/playerAvatarWire";
import {
  type LobbyGameSortMenu,
  lobbyThirdPartyListToApiGames,
  sortLobbyGamesByMenu,
} from "../../realtime/lobbyDecode";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { useAlert } from "../../components/alert/alertContext";
import { usePaymentCallbackListener } from "../payment/usePaymentCallbackListener";
import {
  activeWalletToSlotMode,
  amountForActiveWallet,
  buildSlotLaunchUrl,
} from "../../lib/slotLaunchUrl";
import type { Game } from "../../lib/api/types";
import { useLobbyBannerViewport } from "../../hooks/useLobbyBannerViewport";
import { useWallet } from "../../wallet/walletContext";
import {
  FLOATING_CTA_IMAGE,
  GUEST_DEMO_SLOT_IDS,
  getGuestHeroImage,
  lobbyGameCardThumbnail,
  thirdPartyGameEntryThumbnailUrl,
  getSessionLobbyBannerImage,
  getSessionLobbyBannerVideo,
  UNITY_DEMO_LOBBY_GAME,
  unityDemoGameUrl,
} from "./landingContent";
import { useHorizontalScrollContainer } from "../../hooks/useHorizontalScrollContainer";
import { useIosOrientationMediaGate } from "../../hooks/useIosOrientationMediaGate";
import {
  lobbyGamesPageSize,
  lobbyGridLoadRootMargin,
  lobbyThumbIntersectionMargin,
  lobbyTrackLoadRootMargin,
} from "../../lib/lobbyIosTuning";
import { LobbyGamesScroller } from "./LobbyGamesScroller";
import { LobbyWithdrawMarquee } from "./LobbyWithdrawMarquee";
import { useWithdrawSuccessMarquee } from "./useWithdrawSuccessMarquee";
import "./LobbyPage.css";

const LOBBY_SLOTS_ALL_SUBSECTION_LABEL = "Mega X Widescreen Exclusive";

type LobbyFilterTabEntry = { id: LobbyFilterTab; label: string };
type LobbyAllSubsectionId = Exclude<LobbyFilterTab, "all" | "providers">;

function lobbyAllSubsectionLabel(
  subId: LobbyAllSubsectionId,
  tabs: LobbyFilterTabEntry[],
): string {
  if (subId === "slots") return LOBBY_SLOTS_ALL_SUBSECTION_LABEL;
  return tabs.find((t) => t.id === subId)?.label ?? subId;
}

function lobbyFilterTabs(
  thirdPartyGamesEnabled: boolean,
  providerPlatforms: string[],
): LobbyFilterTabEntry[] {
  return [
    { id: "all", label: getWord(510670) },
    { id: "slots", label: LOBBY_SLOTS_ALL_SUBSECTION_LABEL },
    { id: "hot", label: getWord(510672) },
    ...(thirdPartyGamesEnabled
      ? [
          { id: "providers" as const, label: "PROVIDERS" },
          ...providerPlatforms.map((p) => ({
            id: providerTabId(p),
            label: thirdPartyPlatformDisplayName(p),
          })),
        ]
      : []),
  ];
}

function lobbyAllSubsections(
  thirdPartyGamesEnabled: boolean,
  providerPlatforms: string[],
): LobbyAllSubsectionId[] {
  return [
    "slots",
    "hot",
    ...(thirdPartyGamesEnabled
      ? providerPlatforms.map(
          (p) => providerTabId(p) as LobbyAllSubsectionId,
        )
      : []),
  ];
}

/** 訪客 HOT 列 LOBBY_GET 完成前之骨架卡數（僅佔位，不顯示假遊戲圖） */
const GUEST_HOT_SKELETON_COUNT = 4;
const LOBBY_GAMES_SECTION_ID = "lobby-games-section";

function scrollLobbyGamesSectionIntoView(): void {
  const el = document.getElementById(LOBBY_GAMES_SECTION_ID);
  if (!el) return;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({
    behavior: smooth ? "smooth" : "auto",
    block: "start",
  });
}

type LobbyGameCardRenderer = (
  g: Game,
  index: number,
  thumbBase: number,
  showTextLabels?: boolean,
  onCardAction?: (g: Game) => void,
) => ReactNode;

function PaginatedGameGrid({
  games,
  thumbOffset,
  gameCard,
}: {
  games: Game[];
  thumbOffset: number;
  gameCard: LobbyGameCardRenderer;
}) {
  const pageSize = lobbyGamesPageSize();
  const gridMargin = lobbyGridLoadRootMargin();
  const sentinelRef = useRef<HTMLLIElement | null>(null);
  const total = games.length;
  const [visible, setVisible] = useState(() =>
    Math.min(pageSize, total),
  );

  useEffect(() => {
    setVisible((v) => Math.min(v, games.length));
  }, [games.length]);

  useEffect(() => {
    if (visible >= total) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((c) => Math.min(c + pageSize, total));
        }
      },
      { root: null, rootMargin: gridMargin, threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, total, pageSize, gridMargin]);

  const slice = games.slice(0, visible);
  const hasMore = visible < total;

  return (
    <ul className="lobby-games-grid" role="list">
      {slice.map((g, index) => (
        <li key={g.id} className="lobby-games-grid__item">
          {gameCard(g, index, thumbOffset, false)}
        </li>
      ))}
      {hasMore ? (
        <li
          ref={sentinelRef}
          className="lobby-games-grid__sentinel"
          aria-hidden
        />
      ) : null}
    </ul>
  );
}

function PaginatedGameTrack({
  games,
  thumbOffset,
  showTextLabels,
  onCardAction,
  gameCard,
}: {
  games: Game[];
  thumbOffset: number;
  showTextLabels: boolean;
  onCardAction?: (g: Game) => void;
  gameCard: LobbyGameCardRenderer;
}) {
  const pageSize = lobbyGamesPageSize();
  const trackMargin = lobbyTrackLoadRootMargin();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLLIElement | null>(null);
  const total = games.length;
  const [visible, setVisible] = useState(() =>
    Math.min(pageSize, total),
  );

  useEffect(() => {
    setVisible((v) => Math.min(v, games.length));
  }, [games.length]);

  useEffect(() => {
    if (visible >= total) return;
    const root = scrollerRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((c) => Math.min(c + pageSize, total));
        }
      },
      { root, rootMargin: trackMargin, threshold: 0 },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [visible, total, pageSize, trackMargin]);

  const slice = games.slice(0, visible);
  const hasMore = visible < total;

  return (
    <LobbyGamesScroller scrollerRef={scrollerRef}>
      <ul className="lobby-games-track" role="list">
        {slice.map((g, index) => (
          <li key={g.id}>
            {gameCard(g, index, thumbOffset, showTextLabels, onCardAction)}
          </li>
        ))}
        {hasMore ? (
          <li
            ref={sentinelRef}
            className="lobby-games-track__sentinel"
            aria-hidden
          />
        ) : null}
      </ul>
    </LobbyGamesScroller>
  );
}

function slotGameIdFromCard(g: Game, fallback: number): number {
  const n = Number.parseInt(g.id, 10);
  if (Number.isFinite(n) && n > 0) return n;
  return fallback;
}

function filterHotGames(games: Game[]): Game[] {
  return games.filter((g) => (g.lobbyLabel ?? "").toUpperCase() === "HOT");
}

function pickGuestSlotRowGames(
  games: Game[],
  orderedIds: readonly number[],
): Game[] {
  return orderedIds.map((id) => {
    const sid = String(id);
    const found = games.find((g) => g.id === sid);
    if (found) return found;
    return {
      id: sid,
      title: `Game ${id}`,
      launchUrl: "",
    };
  });
}

function lobbySortMenuForTab(f: LobbyFilterTab): LobbyGameSortMenu {
  if (isProviderTabId(f)) return "providers";
  return f;
}

function gamesForFilter(displayGames: Game[], f: LobbyFilterTab): Game[] {
  if (f === "all" || isProviderTabId(f) || f === "providers") {
    return displayGames;
  }
  if (f === "hot") {
    const labelHot = displayGames.filter(
      (g) => (g.lobbyLabel ?? "").toUpperCase() === "HOT",
    );
    if (labelHot.length > 0) return labelHot;
    const h = displayGames.filter((g) =>
      /hot|jackpot|fire/i.test(`${g.title} ${g.subtitle ?? ""} ${g.id}`),
    );
    return h.length > 0 ? h : displayGames;
  }
  if (f === "slots") {
    const slots = displayGames.filter(
      (g) => (g.lobbyCategory ?? "").toUpperCase() === "SLOT",
    );
    return slots.length > 0 ? slots : displayGames;
  }
  return displayGames;
}

/** 進入視窗（含上下預載）後才載入縮圖，避免大廳一次打滿 HTTP */
function lobbyThumbRootMargin(): string {
  return lobbyThumbIntersectionMargin();
}

function LobbyGameCardThumbSpinner() {
  return <span className="lobby-game-card__thumb-spinner" aria-hidden />;
}

function LobbyGameCardThumb({
  thumb,
  title,
  eagerLoad = false,
}: {
  thumb: string | undefined;
  title: string;
  /** 訪客首屏橫列等少量本地卡圖：略過 IO，避免首幀空白 */
  eagerLoad?: boolean;
}) {
  const thumbRootMargin = lobbyThumbRootMargin();
  const orientationMediaGate = useIosOrientationMediaGate();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [inView, setInView] = useState(() => eagerLoad || !thumb);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(!thumb);

  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(!thumb);
    if (!thumb) {
      setInView(true);
      return;
    }
    setInView(eagerLoad ? true : false);
  }, [thumb, eagerLoad]);

  useEffect(() => {
    if (!thumb || inView) return;
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
        }
      },
      { root: null, rootMargin: thumbRootMargin, threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [thumb, inView, thumbRootMargin]);

  const loadThumb = Boolean(thumb && inView && orientationMediaGate);

  useEffect(() => {
    if (!loadThumb) return;
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, [loadThumb, thumb]);
  const thumbLoading =
    Boolean(thumb) && (!inView || (loadThumb && !imageLoaded && !imageFailed));
  const showTextFallback = !thumb || (loadThumb && imageFailed);
  const bgStyle =
    thumb && loadThumb && imageLoaded && !imageFailed
      ? { backgroundImage: `url("${thumb}")` }
      : undefined;

  return (
    <div ref={wrapRef} className="lobby-game-card__thumb" style={bgStyle}>
      {thumbLoading ? <LobbyGameCardThumbSpinner /> : null}
      {loadThumb ? (
        <img
          ref={imgRef}
          src={thumb}
          alt=""
          className="lobby-game-card__thumb-probe"
          aria-hidden
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
        />
      ) : null}
      {showTextFallback ? (
        <span className="lobby-game-card__fallback">{title}</span>
      ) : null}
    </div>
  );
}

export function LandingPage() {
  const { token, user, refreshUser, ensureFreshAccessForGame } = useAuth();
  const { show } = useAlert();
  const { withBlocking } = useBlockingLoad();
  const { activeWallet } = useWallet();
  const { open: openShell } = useGameShell();
  const {
    lobbyGames,
    lobbyLoading,
    lobbyError,
    liveJackpotAmounts,
    lobbyGet,
    requestRef,
    refreshLobbyGet,
  } = useGatewayLobby();
  const withdrawMarqueeMessages = useWithdrawSuccessMarquee();

  const wsLobbyEnabled = isWsLobbyGamesEnabled();
  const thirdPartyGamesEnabled = isThirdPartyGamesEnabled();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lobbyFilter, setLobbyFilter] = useState<LobbyFilterTab>("all");
  const [providerPlatformFilter, setProviderPlatformFilter] = useState<
    string | null
  >(null);
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const [providerMenuPos, setProviderMenuPos] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);

  useEffect(() => {
    if (!thirdPartyGamesEnabled) {
      setLobbyFilter((f) =>
        f === "providers" || isProviderTabId(f) ? "all" : f,
      );
    }
  }, [thirdPartyGamesEnabled]);
  const [lobbySearch, setLobbySearch] = useState("");
  const [lobbySearchExpanded, setLobbySearchExpanded] = useState(false);
  const lobbySearchInputRef = useRef<HTMLInputElement | null>(null);
  const lobbyGameFilterRef = useRef<HTMLDivElement | null>(null);
  const {
    setContainerRef: setLobbyGameFilterContainerRef,
    onPointerDown: onLobbyGameFilterPointerDown,
    onPointerMove: onLobbyGameFilterPointerMove,
    onPointerUp: onLobbyGameFilterPointerUp,
    onPointerCancel: onLobbyGameFilterPointerCancel,
    onLostPointerCapture: onLobbyGameFilterLostPointerCapture,
  } = useHorizontalScrollContainer({
    externalRef: lobbyGameFilterRef,
  });
  const providerTabBtnRef = useRef<HTMLButtonElement | null>(null);

  useLayoutEffect(() => {
    const ret = consumeGameShellLobbyReturn();
    if (!ret) return;
    let filter: LobbyFilterTab = ret.lobbyFilter;
    if (
      !thirdPartyGamesEnabled &&
      (filter === "providers" || isProviderTabId(filter))
    ) {
      filter = "all";
    }
    setLobbyFilter(filter);
    if (filter === "providers" || isProviderTabId(filter)) {
      setProviderPlatformFilter(
        isProviderTabId(filter)
          ? providerPlatformFromTabId(filter)
          : ret.providerPlatform,
      );
    }
    const scrollY = ret.scrollY;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: "auto" });
      });
    });
  }, [thirdPartyGamesEnabled]);

  const loading = user && wsLobbyEnabled ? lobbyLoading : false;
  const error = user && wsLobbyEnabled ? lobbyError : null;
  const {
    termsOpen,
    loginOpen,
    registerOpen,
    forgotPasswordOpen,
    phoneVerifyOpen,
    phoneVerifyPayload,
    openTermsThen,
    openLoginDirect,
    openRegisterDirect,
    openForgotPasswordDirect,
    closeTerms,
    closeLogin,
    closeRegister,
    closeForgotPassword,
    closePhoneVerify,
    onTermsAccepted,
    hasAcceptedTerms,
  } = useAuthModals();

  const tpId = trustpilotBusinessUnitId();
  const bannerViewport = useLobbyBannerViewport();
  const sessionHeroVideoSrc = useMemo(
    () => getSessionLobbyBannerVideo(activeWallet, bannerViewport),
    [activeWallet, bannerViewport],
  );
  const sessionHeroPosterSrc = useMemo(
    () => getSessionLobbyBannerImage(activeWallet),
    [activeWallet],
  );
  const guestHeroSrc = useMemo(
    () => getGuestHeroImage(bannerViewport),
    [bannerViewport],
  );

  const guestLobbyRows = useMemo(() => {
    if (lobbyGames === null) {
      return {
        top: [] as Game[],
        demo: pickGuestSlotRowGames([], GUEST_DEMO_SLOT_IDS),
      };
    }
    const hotFiltered = filterHotGames(lobbyGames);
    const top = sortLobbyGamesByMenu(
      hotFiltered.length > 0 ? hotFiltered : lobbyGames,
      "hot",
    );
    return {
      top,
      demo: pickGuestSlotRowGames(lobbyGames, GUEST_DEMO_SLOT_IDS),
    };
  }, [lobbyGames]);

  const displayGames = useMemo(() => {
    if (user && wsLobbyEnabled && lobbyGames !== null) {
      const sorted = sortLobbyGamesByMenu(lobbyGames, "all");
      return [UNITY_DEMO_LOBBY_GAME, ...sorted];
    }
    if (!user && lobbyGames !== null) {
      return guestLobbyRows.top.length > 0 || guestLobbyRows.demo.length > 0
        ? [...guestLobbyRows.top, ...guestLobbyRows.demo]
        : [];
    }
    return user ? [UNITY_DEMO_LOBBY_GAME] : [];
  }, [user, wsLobbyEnabled, lobbyGames, guestLobbyRows]);

  const searchFilteredGames = useMemo(() => {
    const q = lobbySearch.trim().toLowerCase();
    if (!q) return displayGames;
    return displayGames.filter((g) => {
      const hay =
        `${g.title} ${g.subtitle ?? ""} ${g.id} ${g.provider ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [displayGames, lobbySearch]);

  /** 第三方遊戲：僅 ACTIVE；順序不變，僅依搜尋過濾（不重排）。 */
  const providerGamesFiltered = useMemo(() => {
    if (!thirdPartyGamesEnabled) return [];
    const list = lobbyThirdPartyListToApiGames(
      lobbyGet?.thirdPartyGameInfoList,
    );
    const q = lobbySearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((g) => {
      const hay =
        `${g.title} ${g.subtitle ?? ""} ${g.id} ${g.provider ?? ""} ${g.thirdPartyLaunch?.platform ?? ""} ${g.thirdPartyLaunch?.gameUID ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [thirdPartyGamesEnabled, lobbyGet?.thirdPartyGameInfoList, lobbySearch]);

  const providerPlatforms = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const g of providerGamesFiltered) {
      const p = g.thirdPartyLaunch?.platform?.trim();
      if (!p || seen.has(p)) continue;
      seen.add(p);
      out.push(p);
    }
    return sortThirdPartyPlatforms(out);
  }, [providerGamesFiltered]);

  const lobbyFilterTabsList = useMemo(
    () => lobbyFilterTabs(thirdPartyGamesEnabled, providerPlatforms),
    [thirdPartyGamesEnabled, providerPlatforms],
  );
  const lobbyFilterOrder = useMemo(
    () => lobbyFilterTabsList.map((t) => t.id),
    [lobbyFilterTabsList],
  );
  const lobbyAllSubsectionsList = useMemo(
    () => lobbyAllSubsections(thirdPartyGamesEnabled, providerPlatforms),
    [thirdPartyGamesEnabled, providerPlatforms],
  );

  const providerGamesForFilter = useMemo(() => {
    if (!providerPlatformFilter) return providerGamesFiltered;
    return providerGamesFiltered.filter(
      (g) => g.thirdPartyLaunch?.platform === providerPlatformFilter,
    );
  }, [providerGamesFiltered, providerPlatformFilter]);

  /** 各分類一份列表（已登入分頁用） */
  const gamesByFilter = useMemo(() => {
    const out: Record<string, Game[]> = {};
    const sessionProviders =
      thirdPartyGamesEnabled && user ? providerGamesForFilter : [];
    for (const f of lobbyFilterOrder) {
      if (f === "providers") {
        out[f] = sessionProviders;
        continue;
      }
      if (isProviderTabId(f)) {
        const platform = providerPlatformFromTabId(f);
        out[f] =
          platform === null
            ? []
            : providerGamesFiltered.filter(
                (g) => g.thirdPartyLaunch?.platform === platform,
              );
        continue;
      }
      const filtered = gamesForFilter(searchFilteredGames, f);
      out[f] = sortLobbyGamesByMenu(filtered, lobbySortMenuForTab(f));
    }
    return out;
  }, [
    searchFilteredGames,
    providerGamesForFilter,
    providerGamesFiltered,
    user,
    thirdPartyGamesEnabled,
    lobbyFilterOrder,
  ]);

  useEffect(() => {
    if (
      providerPlatformFilter &&
      !providerPlatforms.includes(providerPlatformFilter)
    ) {
      setProviderPlatformFilter(null);
      setLobbyFilter((f) => (isProviderTabId(f) ? "all" : f));
    }
  }, [providerPlatformFilter, providerPlatforms]);

  useEffect(() => {
    if (!isProviderTabId(lobbyFilter)) return;
    const platform = providerPlatformFromTabId(lobbyFilter);
    if (!platform || !providerPlatforms.includes(platform)) {
      setLobbyFilter("all");
      setProviderPlatformFilter(null);
    }
  }, [lobbyFilter, providerPlatforms]);

  const updateProviderMenuPos = useCallback(() => {
    const el = providerTabBtnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setProviderMenuPos({
      top: r.bottom + 4,
      left: r.left,
      minWidth: r.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!providerMenuOpen) return;
    updateProviderMenuPos();
    const filterEl = lobbyGameFilterRef.current;
    window.addEventListener("resize", updateProviderMenuPos);
    filterEl?.addEventListener("scroll", updateProviderMenuPos, {
      passive: true,
    });
    return () => {
      window.removeEventListener("resize", updateProviderMenuPos);
      filterEl?.removeEventListener("scroll", updateProviderMenuPos);
    };
  }, [providerMenuOpen, updateProviderMenuPos, providerPlatforms.length]);

  useEffect(() => {
    if (!providerMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (providerTabBtnRef.current?.contains(t)) return;
      const menu = document.getElementById("lobby-provider-tab-menu");
      if (menu?.contains(t)) return;
      setProviderMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProviderMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [providerMenuOpen]);

  const selectProviderPlatform = useCallback((platform: string | null) => {
    setLobbyFilter("providers");
    setProviderPlatformFilter(platform);
    setProviderMenuOpen(false);
  }, []);

  const selectProviderTab = useCallback((platform: string) => {
    setLobbyFilter(providerTabId(platform));
    setProviderPlatformFilter(platform);
    setProviderMenuOpen(false);
  }, []);

  /** 點 PROVIDERS tab 只開／關下拉；選完 platform 後才切到 providers 遊戲列表。 */
  const onProvidersTabClick = useCallback(() => {
    setProviderMenuOpen((open) => !open);
  }, []);

  const providerMenuPortal = useMemo(() => {
    if (
      !providerMenuOpen ||
      providerPlatforms.length === 0 ||
      !providerMenuPos
    ) {
      return null;
    }
    return createPortal(
      <ul
        id="lobby-provider-tab-menu"
        className="lobby-provider-tab__menu"
        role="listbox"
        aria-label="Provider platforms"
        style={{
          top: providerMenuPos.top,
          left: providerMenuPos.left,
          minWidth: providerMenuPos.minWidth,
        }}>
        <li role="presentation">
          <button
            type="button"
            className={
              "lobby-provider-tab__option" +
              (!providerPlatformFilter ? " is-selected" : "")
            }
            role="option"
            aria-selected={!providerPlatformFilter}
            onClick={() => selectProviderPlatform(null)}>
            All
          </button>
        </li>
        {providerPlatforms.map((p) => (
          <li key={p} role="presentation">
            <button
              type="button"
              className={
                "lobby-provider-tab__option" +
                (providerPlatformFilter === p ? " is-selected" : "")
              }
              role="option"
              aria-selected={providerPlatformFilter === p}
              onClick={() => selectProviderPlatform(p)}>
              {thirdPartyPlatformDisplayName(p)}
            </button>
          </li>
        ))}
      </ul>,
      document.body,
    );
  }, [
    providerMenuOpen,
    providerPlatforms,
    providerMenuPos,
    providerPlatformFilter,
    selectProviderPlatform,
  ]);

  const handleGameCallback = useCallback(
    (payload: { state: 1 | 2 }) => {
      if (payload.state === 2) {
        show("Game session ended with an error.", { variant: "error" });
      }
      void refreshLobbyGet();
    },
    [show, refreshLobbyGet],
  );

  usePaymentCallbackListener(
    "game",
    Boolean(user && thirdPartyGamesEnabled),
    handleGameCallback,
  );

  const launchThirdPartyGame = useCallback(
    async (card: Game) => {
      const tp = card.thirdPartyLaunch;
      if (!tp) return;
      const platform = tp.platform.trim();
      const gameUID = tp.gameUID.trim();
      const req = requestRef.current;
      if (!req || !platform || !gameUID) return;
      try {
        const data = encodeGetThirdPartyGameInfoRequest(platform, gameUID, {
          successUrl: buildGameCallbackUrl(1),
          failUrl: buildGameCallbackUrl(2),
        });
        const r = await req({
          type: GATEWAY_API_GET_THIRD_PARTY_GAME_INFO,
          data,
          debugLabel: "GetThirdPartyGameInfo",
        });
        if (
          isGatewaySuccessCode(String(r.code)) &&
          r.data instanceof Uint8Array &&
          r.data.byteLength > 0
        ) {
          const decoded = decodeGetThirdPartyGameInfoResponseBytes(r.data);
          const url = decoded.thirdPartyGameInfo?.gameLaunchURL?.trim();
          if (url) {
            if (isDevConsoleEnabled()) {
              try {
                console.log(
                  "[lobby] iframe game URL:",
                  new URL(url, window.location.href).href,
                );
              } catch {
                console.log("[lobby] iframe game URL:", url);
              }
            }
            openShell({
              url,
              widthPercent: card.embedWidthPercent,
              heightPercent: card.embedHeightPercent,
              isPayment: false,
              openInNewWindow: card.openInNewWindow,
              lobbyReturn: buildGameShellLobbyReturn(
                lobbyFilter,
                providerPlatformFilter,
              ),
            });
          }
        }
      } catch (e) {
        console.warn("[gateway-ws] GetThirdPartyGameInfo failed", e);
      }
    },
    [requestRef, openShell, lobbyFilter, providerPlatformFilter],
  );

  const onSeeAllSubcategory = useCallback((subId: LobbyAllSubsectionId) => {
    setLobbyFilter(subId);
    if (isProviderTabId(subId)) {
      setProviderPlatformFilter(providerPlatformFromTabId(subId));
    }
    setProviderMenuOpen(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollLobbyGamesSectionIntoView);
    });
  }, []);

  useEffect(() => {
    if (!lobbySearchExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLobbySearch("");
        setLobbySearchExpanded(false);
        lobbySearchInputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lobbySearchExpanded]);

  useEffect(() => {
    if (!lobbySearchExpanded) return;
    const id = requestAnimationFrame(() => {
      lobbySearchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [lobbySearchExpanded]);

  useEffect(() => {
    if (!user) return;
    const filterEl = lobbyGameFilterRef.current;
    const tabEl = document.getElementById(lobbyTabDomId(lobbyFilter));
    if (!filterEl || !tabEl) return;
    const filterRect = filterEl.getBoundingClientRect();
    const tabRect = tabEl.getBoundingClientRect();
    const tabCenter =
      tabRect.left - filterRect.left + tabRect.width / 2 + filterEl.scrollLeft;
    const maxScroll = Math.max(0, filterEl.scrollWidth - filterEl.clientWidth);
    const targetScroll = tabCenter - filterEl.clientWidth / 2;
    const left = Math.max(0, Math.min(maxScroll, targetScroll));
    filterEl.scrollTo({ left, behavior: "smooth" });
  }, [user, lobbyFilter]);

  useEffect(() => {
    const auth = searchParams.get("auth");
    if (auth === "login") {
      openLoginDirect();
      const next = new URLSearchParams(searchParams);
      next.delete("auth");
      if (!next.get("redirect")?.trim()) next.delete("redirect");
      setSearchParams(next, { replace: true });
    } else if (auth === "register") {
      openTermsThen("register");
      const next = new URLSearchParams(searchParams);
      next.delete("auth");
      if (!next.get("redirect")?.trim()) next.delete("redirect");
      setSearchParams(next, { replace: true });
    } else if (auth === "forgot") {
      openForgotPasswordDirect();
      const next = new URLSearchParams(searchParams);
      next.delete("auth");
      if (!next.get("redirect")?.trim()) next.delete("redirect");
      setSearchParams(next, { replace: true });
    }
  }, [
    searchParams,
    setSearchParams,
    openForgotPasswordDirect,
    openLoginDirect,
    openTermsThen,
  ]);

  useEffect(() => {
    if (!token) return;
    void refreshUser();
  }, [token, refreshUser]);

  useEffect(() => {
    const { documentElement, body } = document;
    if (user) {
      documentElement.classList.remove("guest-lobby-page");
      body.classList.remove("guest-lobby-page");
      documentElement.classList.add("session-lobby-page");
      body.classList.add("session-lobby-page");
    } else {
      documentElement.classList.remove("session-lobby-page");
      body.classList.remove("session-lobby-page");
      documentElement.classList.add("guest-lobby-page");
      body.classList.add("guest-lobby-page");
    }
    return () => {
      documentElement.classList.remove("guest-lobby-page");
      body.classList.remove("guest-lobby-page");
      documentElement.classList.remove("session-lobby-page");
      body.classList.remove("session-lobby-page");
    };
  }, [user]);

  function onPlayGame(g?: Game) {
    const card = g ?? UNITY_DEMO_LOBBY_GAME;

    const run = async () => {
      let gameToken: string | undefined;
      if (user) {
        const fresh = await ensureFreshAccessForGame();
        if (!fresh) return;
        gameToken = fresh;
      }
      if (card.thirdPartyLaunch) {
        if (!thirdPartyGamesEnabled) return;
        await launchThirdPartyGame(card);
        return;
      }
      let url: string;
      if (isSlotWebEntryEnabled()) {
        const gameId = slotGameIdFromCard(card, unityWebEntryDefaultGameId());
        url = buildSlotLaunchUrl({
          gameId,
          mode: activeWalletToSlotMode(activeWallet),
          amount: amountForActiveWallet(user, activeWallet),
          vipLevel: user?.vipLevel ?? 0,
          token: gameToken,
          guestDemo: !user,
        });
      } else if (card.launchUrl?.trim()) {
        url = card.launchUrl.trim();
      } else {
        url = unityDemoGameUrl();
      }
      if (isDevConsoleEnabled()) {
        try {
          console.log(
            "[lobby] iframe game URL:",
            new URL(url, window.location.href).href,
          );
        } catch {
          console.log("[lobby] iframe game URL:", url);
        }
      }
      openShell({
        url,
        widthPercent: card.embedWidthPercent,
        heightPercent: card.embedHeightPercent,
        isPayment: false,
        openInNewWindow: card.openInNewWindow,
        lobbyReturn: buildGameShellLobbyReturn(
          lobbyFilter,
          providerPlatformFilter,
        ),
      });
    };

    if (user) {
      void withBlocking(run);
    } else {
      void run();
    }
  }

  function onGuestSignUp() {
    openTermsThen("register");
  }

  function gameCard(
    g: Game,
    index: number,
    thumbBase: number,
    showTextLabels = true,
    onCardAction?: (g: Game) => void,
    eagerThumb = false,
  ) {
    const thumb = g.thirdPartyLaunch
      ? thirdPartyGameEntryThumbnailUrl(
          g.thirdPartyLaunch.platform,
          g.thirdPartyLaunch.gameUID,
        )
      : lobbyGameCardThumbnail(g.id, thumbBase + index, g.thumbnailUrl);
    return (
      <button
        type="button"
        className={
          "lobby-game-card" +
          (showTextLabels ? "" : " lobby-game-card--thumb-only")
        }
        onClick={() => (onCardAction ? onCardAction(g) : onPlayGame(g))}
        aria-label={showTextLabels ? undefined : g.title}>
        <LobbyGameCardThumb
          thumb={thumb}
          title={g.title}
          eagerLoad={eagerThumb}
        />
        {showTextLabels ? (
          <>
            <span className="lobby-game-card__title">{g.title}</span>
            {g.subtitle ? (
              <span className="lobby-game-card__sub">{g.subtitle}</span>
            ) : null}
          </>
        ) : null}
      </button>
    );
  }

  function renderGuestHotGameTrackSkeleton() {
    return (
      <LobbyGamesScroller>
        <ul
          className="lobby-games-track"
          role="list"
          aria-busy="true"
          aria-label="Loading hot games">
          {Array.from({ length: GUEST_HOT_SKELETON_COUNT }, (_, index) => (
            <li key={`guest-hot-skeleton-${index}`}>
              <div
                className="lobby-game-card lobby-game-card--thumb-only lobby-game-card--skeleton"
                aria-hidden>
                <div className="lobby-game-card__thumb">
                  <LobbyGameCardThumbSpinner />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </LobbyGamesScroller>
    );
  }

  function renderGameTrack(
    games: Game[],
    thumbOffset = 0,
    showTextLabels = true,
    onCardAction?: (g: Game) => void,
    eagerThumb = false,
  ) {
    return (
      <LobbyGamesScroller>
        <ul className="lobby-games-track" role="list">
          {games.map((g, index) => (
            <li key={g.id}>
              {gameCard(
                g,
                index,
                thumbOffset,
                showTextLabels,
                onCardAction,
                eagerThumb,
              )}
            </li>
          ))}
        </ul>
      </LobbyGamesScroller>
    );
  }

  const guestLandingMain = (
    <>
      <main className="lobby-landing__main guest-landing__main">
        <section
          className="guest-landing__hero"
          aria-label="Promotional banner">
          <LandingHeader
            overHero
            onJoinUs={() => openTermsThen("register")}
            onLogin={() => openLoginDirect()}
          />
          <div className="guest-landing__hero-art-wrap">
            <img
              className="guest-landing__hero-img"
              src={guestHeroSrc}
              alt=""
              width={1164}
              height={1080}
              decoding="async"
            />
          </div>
        </section>

        <section
          className="guest-landing__games-block page-container"
          aria-labelledby="guest-top-games-heading">
          <div className="guest-landing__claim-cta">
            <button
              type="button"
              className="guest-landing__claim-banner"
              onClick={() => openLoginDirect()}>
              {getWord(201)}
            </button>
          </div>
          <h2 id="guest-top-games-heading" className="guest-landing__row-title">
            <span className="guest-landing__accent">HOT</span> GAMES
          </h2>
          {lobbyGames === null
            ? renderGuestHotGameTrackSkeleton()
            : renderGameTrack(
                guestLobbyRows.top,
                0,
                false,
                () => openTermsThen("register"),
                true,
              )}
        </section>

        <section
          className="guest-landing__games-block guest-landing__games-block--demo-row page-container"
          aria-labelledby="guest-demo-games-heading">
          <h2
            id="guest-demo-games-heading"
            className="guest-landing__row-title guest-landing__row-title--demo">
            <span className="guest-landing__accent">DEMO</span> here
          </h2>
          {renderGameTrack(
            guestLobbyRows.demo,
            guestLobbyRows.top.length,
            false,
            undefined,
            true,
          )}
        </section>

        <div className="guest-landing__signup-cta page-container">
          <button
            type="button"
            className="guest-landing__signup-wide"
            onClick={onGuestSignUp}>
            {getWord(202)}
          </button>
        </div>

        <LobbyComplianceFooter variant="guest" />
      </main>

      <div
        className="guest-landing__sticky-bar"
        role="region"
        aria-label="Sign up">
        <img
          className="guest-landing__sticky-gift"
          src={FLOATING_CTA_IMAGE}
          alt=""
          width={72}
          height={72}
          decoding="async"
        />
        <button
          type="button"
          className="guest-landing__sticky-btn"
          onClick={onGuestSignUp}>
          {getWord(202)}
        </button>
      </div>

      <SupportFab placement="guest" />
    </>
  );

  const sessionLandingMain = (
    <>
      <main className="lobby-landing__main">
        <section className="lobby-hero-banner" aria-label="Promotional banner">
          <LobbyHeroBanner
            videoSrc={sessionHeroVideoSrc}
            posterSrc={sessionHeroPosterSrc}>
            <div className="lobby-hero-banner__bottom-stack">
              {liveJackpotAmounts ? (
                <LobbyJackpotStrip
                  wallet={activeWallet}
                  amounts={liveJackpotAmounts}
                  variant="live"
                />
              ) : null}
              <LobbyWithdrawMarquee messages={withdrawMarqueeMessages} />
            </div>
          </LobbyHeroBanner>
        </section>

        <section
          id={LOBBY_GAMES_SECTION_ID}
          className="lobby-games-section"
          aria-label="Games">
          {user ? (
            <div className="lobby-games-toolbar">
              <div
                className={
                  "lobby-games-filter-strip" +
                  (providerMenuOpen ? " is-provider-menu-open" : "") +
                  (lobbySearchExpanded ? " is-search-expanded" : "")
                }>
                <div
                  className={
                    "lobby-game-search" +
                    (lobbySearchExpanded ? " is-expanded" : "")
                  }
                  aria-expanded={lobbySearchExpanded}>
                  <div
                    className="lobby-game-search__pill"
                    role="search"
                    onClick={() => {
                      if (!lobbySearchExpanded) setLobbySearchExpanded(true);
                    }}>
                    <span className="lobby-game-search__lead-icon" aria-hidden>
                      <Search strokeWidth={2.25} />
                    </span>
                    <input
                      ref={lobbySearchInputRef}
                      type="search"
                      className="lobby-game-search__input"
                      value={lobbySearch}
                      onChange={(e) => setLobbySearch(e.target.value)}
                      onFocus={() => setLobbySearchExpanded(true)}
                      onBlur={() => {
                        window.setTimeout(() => {
                          if (
                            document.activeElement !==
                            lobbySearchInputRef.current
                          ) {
                            setLobbySearchExpanded(false);
                          }
                        }, 120);
                      }}
                      autoComplete="off"
                      enterKeyHint="search"
                      aria-label="BGAMING"
                    />
                    {lobbySearchExpanded ? (
                      <button
                        type="button"
                        className="lobby-game-search__close"
                        aria-label="Close search"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setLobbySearch("");
                          setLobbySearchExpanded(false);
                          lobbySearchInputRef.current?.blur();
                        }}>
                        <X strokeWidth={2.25} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div
                  ref={setLobbyGameFilterContainerRef}
                  className="lobby-game-filter"
                  role="tablist"
                  aria-label="Game categories"
                  onPointerDown={onLobbyGameFilterPointerDown}
                  onPointerMove={onLobbyGameFilterPointerMove}
                  onPointerUp={onLobbyGameFilterPointerUp}
                  onPointerCancel={onLobbyGameFilterPointerCancel}
                  onLostPointerCapture={onLobbyGameFilterLostPointerCapture}>
                  {thirdPartyGamesEnabled ? (
                    <div className="lobby-provider-tab">
                      <button
                        ref={providerTabBtnRef}
                        id={lobbyTabDomId("providers")}
                        type="button"
                        className={
                          "lobby-game-filter__tab lobby-game-filter__tab--providers" +
                          (lobbyFilter === "providers" || providerMenuOpen
                            ? " is-active"
                            : "") +
                          (providerMenuOpen ? " is-menu-open" : "")
                        }
                        role="tab"
                        aria-selected={
                          lobbyFilter === "providers" || providerMenuOpen
                        }
                        aria-controls="lobby-games-panel"
                        aria-haspopup="listbox"
                        aria-expanded={providerMenuOpen}
                        tabIndex={
                          lobbyFilter === "providers" || providerMenuOpen ? 0 : -1
                        }
                        onClick={onProvidersTabClick}>
                        <span>PROVIDERS</span>
                        <ChevronDown
                          className="lobby-provider-tab__chevron"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      </button>
                    </div>
                  ) : null}
                  {lobbyFilterTabsList.map(({ id, label }) =>
                    id === "providers" ? null : isProviderTabId(id) ? (
                      <button
                        key={id}
                        id={lobbyTabDomId(id)}
                        type="button"
                        className={
                          "lobby-game-filter__tab" +
                          (lobbyFilter === id && !providerMenuOpen
                            ? " is-active"
                            : "")
                        }
                        role="tab"
                        aria-selected={lobbyFilter === id && !providerMenuOpen}
                        aria-controls="lobby-games-panel"
                        tabIndex={
                          lobbyFilter === id && !providerMenuOpen ? 0 : -1
                        }
                        onClick={() => {
                          const platform = providerPlatformFromTabId(id);
                          if (platform) selectProviderTab(platform);
                        }}>
                        {label}
                      </button>
                    ) : (
                      <button
                        key={id}
                        id={lobbyTabDomId(id)}
                        type="button"
                        className={
                          "lobby-game-filter__tab" +
                          (lobbyFilter === id && !providerMenuOpen
                            ? " is-active"
                            : "")
                        }
                        role="tab"
                        aria-selected={lobbyFilter === id && !providerMenuOpen}
                        aria-controls="lobby-games-panel"
                        tabIndex={
                          lobbyFilter === id && !providerMenuOpen ? 0 : -1
                        }
                        onClick={() => {
                          setProviderMenuOpen(false);
                          setLobbyFilter(id);
                        }}>
                        {label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          ) : null}
          <div className="lobby-games-section__body page-container">
            {error ? <p className="lobby-games-error">{error}</p> : null}
            {user && loading && displayGames.length === 0 && !error ? (
              <p className="lobby-games-hint">Loading…</p>
            ) : null}
            {user && !loading && !error && displayGames.length === 0 ? (
              <p className="lobby-games-hint">No games available yet.</p>
            ) : null}
            {user &&
            !loading &&
            !error &&
            displayGames.length > 0 &&
            gamesByFilter[lobbyFilter]?.length === 0 ? (
              <p className="lobby-games-hint">
                No games match your search or filter.
              </p>
            ) : null}
            {user ? (
              <div
                id="lobby-games-panel"
                className="lobby-games-panel-host"
                role="tabpanel"
                aria-labelledby={lobbyTabDomId(lobbyFilter)}>
                <div key={lobbyFilter} className="lobby-games-panel-swap">
                  {lobbyFilter === "all" ? (
                    (() => {
                      let thumbBase = 0;
                      return lobbyAllSubsectionsList.map((subId) => {
                        const games = gamesByFilter[subId] ?? [];
                        if (games.length === 0) return null;
                        const off = thumbBase;
                        thumbBase += games.length;
                        const subLabel = lobbyAllSubsectionLabel(
                          subId,
                          lobbyFilterTabsList,
                        );
                        return (
                          <div key={subId} className="lobby-games-group">
                            <div className="lobby-games-group-head">
                              <h3
                                className="lobby-games-group-title"
                                id={`lobby-group-${subId}`}>
                                {subLabel}
                              </h3>
                              <button
                                type="button"
                                className="lobby-games-group-see-all"
                                aria-label={`See all in ${subLabel}`}
                                onClick={() => onSeeAllSubcategory(subId)}>
                                See All
                              </button>
                            </div>
                            <PaginatedGameTrack
                              key={`${lobbySearch}\u0000${subId}`}
                              games={games}
                              thumbOffset={off}
                              showTextLabels={false}
                              gameCard={gameCard}
                            />
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <PaginatedGameGrid
                      key={`${lobbyFilter}\u0000${lobbySearch}`}
                      games={gamesByFilter[lobbyFilter] ?? []}
                      thumbOffset={0}
                      gameCard={gameCard}
                    />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {tpId ? <TrustpilotSection businessUnitId={tpId} /> : null}

        <LobbyComplianceFooter variant="session" />
      </main>
    </>
  );

  return (
    <div
      className={
        "lobby-landing" +
        (user ? " lobby-landing--session" : " lobby-landing--guest")
      }>
      {user ? (
        <SessionChromeShell headerOverHero>
          {sessionLandingMain}
        </SessionChromeShell>
      ) : (
        guestLandingMain
      )}

      <TermsGateModal
        open={termsOpen}
        onClose={closeTerms}
        onAccept={onTermsAccepted}
      />
      <LoginModal
        open={loginOpen}
        onClose={closeLogin}
        onForgotPassword={openForgotPasswordDirect}
        onSwitchRegister={() => {
          closeLogin();
          if (hasAcceptedTerms()) openRegisterDirect();
          else openTermsThen("register");
        }}
      />
      <ForgotPasswordModal
        open={forgotPasswordOpen}
        onClose={closeForgotPassword}
        onSwitchToLogin={() => {
          closeForgotPassword();
          openLoginDirect();
        }}
      />
      <RegisterModal
        open={registerOpen}
        onClose={closeRegister}
        onSwitchLogin={() => {
          closeRegister();
          openLoginDirect();
        }}
      />
      <PhoneVerificationModal
        open={phoneVerifyOpen}
        onClose={closePhoneVerify}
        displayEmail={phoneVerifyPayload?.displayEmail ?? ""}
        pendingBody={phoneVerifyPayload?.body ?? null}
      />
      {providerMenuPortal}
    </div>
  );
}
