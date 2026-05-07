import { Home } from "lucide-react";
import type { TransitionEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { agentDebugLog, agentDebugUrlPreview } from "../debug/agentDebugIngest";
import { useGameVisualViewport } from "../hooks/useGameVisualViewport";
import { buildIframeAllow, postQuitToGameIframe } from "../lib/gameShell";
import {
  enterBrowserFullscreen,
  exitBrowserFullscreen,
  GAME_OVERLAY_IOS_TOOLBAR_CONSUMER_RESET_EVENT,
  dismissIosGameScrollHintPermanently,
  getFullscreenElement,
  hasDismissedIosGameScrollHint,
  shouldUseIosGameViewportWorkarounds,
  shouldUseTapToBrowserFullscreen,
} from "../lib/iosGameFullscreen";
import { logPerfMemorySnapshot } from "../lib/gameShellTelemetry";
import "./GameShellContext.css";

/**
 * 轉向後多久內不採信「已全螢」的 debounce 截止時間（從 orientationchange 起算）。
 * 須 ≥ useGameVisualViewport 轉向 follow-up（~820ms），否則剛轉橫就會被誤判全螢、cover 約 1s 內消失。
 */
const ORIENTATION_POST_ROTATION_GRACE_MS = 1100;

/** 連續視為全螢幕前的等待；濾掉 vv 抖動導致 cover 过早消失 */
const IOS_TOOLBAR_HIDDEN_DEBOUNCE_MS = 520;

/** ms — brief delay so embedded Unity can run `Quit()` after shell postMessage before `about:blank`. */
const IFRAME_TEARDOWN_DELAY_MS = 120;

/** iOS Safari 自動淡出提示後再卸載，需略長於 `--leaving` transition */
const IOS_HINT_LEAVE_MS = 480;
const IOS_HINT_AUTO_LEAVE_MS = 11_500;

/** `/play` 橫向上滑全螢幕示意（`web/public/images/games/`） */
const PLAY_SWIPE_HINT_IMAGE_SRC = "/images/games/swipe-loop.webp";

type GameOverlayProps = {
  url: string;
  widthPercent: number;
  heightPercent: number;
  isPayment: boolean;
  onClose: () => void;
};

export function GameOverlay({ url, isPayment, onClose }: GameOverlayProps) {
  const { pathname } = useLocation();
  const [layoutLandscape, setLayoutLandscape] = useState(
    () =>
      typeof window !== "undefined" && window.innerWidth > window.innerHeight,
  );
  const isPlayRoute = pathname === "/play";
  /** 為 `/play`；實際顯示還需 playSwipeHintFeatureOn */
  const playSwipeHintConfigured = isPlayRoute;
  /**
   * 生產環境僅真 iOS 分頁內需要上滑收合 chrome；本機 dev 允許任何 UA 預覽上滑示意。
   */
  const playSwipeHintFeatureOn =
    playSwipeHintConfigured &&
    (shouldUseIosGameViewportWorkarounds() || import.meta.env.DEV);
  const { t } = useTranslation("common");
  const allow = buildIframeAllow(isPayment);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const iosScrollEdgeLeftRef = useRef<HTMLDivElement>(null);
  const iosScrollEdgeRightRef = useRef<HTMLDivElement>(null);
  /** 顯示 /play 上滑示意時略過轉向後自動 scroll nudge，避免誤收合網址列、cover ~1s 消失 */
  const suppressAutoChromeNudgeRef = useRef(false);
  /** 取消 stale teardown（Strict Mode dev 會先 unmount 再 mount，未定時清空會誤設 about:blank） */
  const iframeTeardownTimerRef = useRef<number | undefined>(undefined);

  const iosWorkarounds = shouldUseIosGameViewportWorkarounds();
  const tapFullscreenMode = shouldUseTapToBrowserFullscreen();

  const [iosToolbarHidden, setIosToolbarHidden] = useState(false);
  /** 滿版 cover 仍掛在 DOM（含淡出中），供漸入漸出與 iframe suppress */
  const [swipeHintInDom, setSwipeHintInDom] = useState(false);
  const [swipeHintOpaque, setSwipeHintOpaque] = useState(false);
  /** 供 orientationchange 讀取「已確認」全螢幕，與滿版圖顯示邏輯一致 */
  const iosToolbarHiddenRef = useRef(false);
  /** `hidden:true` 延後套用，避免誤判瞬間關掉 cover */
  const toolbarHiddenConfirmTimerRef = useRef<number | undefined>(undefined);
  /** 上次 orientationchange 時間；轉向後短時間內拉長「採信全螢」延遲 */
  const lastOrientationAtRef = useRef(0);

  /** 行動／平板首次點擊進瀏覽器全螢：預設顯示閘門，listener 再對齊實際 fullscreen 狀態 */
  const [tapFullscreenGateVisible, setTapFullscreenGateVisible] = useState(
    () => tapFullscreenMode,
  );

  const onIosToolbarHiddenChange = useCallback((hidden: boolean) => {
    if (!hidden) {
      if (toolbarHiddenConfirmTimerRef.current !== undefined) {
        window.clearTimeout(toolbarHiddenConfirmTimerRef.current);
        toolbarHiddenConfirmTimerRef.current = undefined;
      }
      iosToolbarHiddenRef.current = false;
      setIosToolbarHidden(false);
      return;
    }
    if (toolbarHiddenConfirmTimerRef.current !== undefined) return;
    const sinceOrient = Date.now() - lastOrientationAtRef.current;
    const graceRemain = Math.max(
      0,
      ORIENTATION_POST_ROTATION_GRACE_MS - sinceOrient,
    );
    const wait = IOS_TOOLBAR_HIDDEN_DEBOUNCE_MS + graceRemain;
    toolbarHiddenConfirmTimerRef.current = window.setTimeout(() => {
      toolbarHiddenConfirmTimerRef.current = undefined;
      iosToolbarHiddenRef.current = true;
      setIosToolbarHidden(true);
    }, wait);
  }, []);

  useEffect(() => {
    return () => {
      if (toolbarHiddenConfirmTimerRef.current !== undefined) {
        window.clearTimeout(toolbarHiddenConfirmTimerRef.current);
        toolbarHiddenConfirmTimerRef.current = undefined;
      }
    };
  }, []);

  useEffect(() => {
    if (!iosWorkarounds) {
      suppressAutoChromeNudgeRef.current = false;
      return;
    }
    suppressAutoChromeNudgeRef.current =
      playSwipeHintFeatureOn && layoutLandscape;
  }, [iosWorkarounds, playSwipeHintFeatureOn, layoutLandscape]);

  useGameVisualViewport(rootRef, {
    adaptIosBottomGutter: iosWorkarounds,
    iosScrollEdgeLeftRef: iosWorkarounds ? iosScrollEdgeLeftRef : undefined,
    iosScrollEdgeRightRef: iosWorkarounds ? iosScrollEdgeRightRef : undefined,
    blurTargetRef: iosWorkarounds ? iframeRef : undefined,
    suppressAutoChromeNudgeRef: iosWorkarounds
      ? suppressAutoChromeNudgeRef
      : undefined,
    onIosToolbarHiddenChange: iosWorkarounds
      ? onIosToolbarHiddenChange
      : undefined,
  });

  useEffect(() => {
    const syncLayout = () => {
      setLayoutLandscape(window.innerWidth > window.innerHeight);
    };
    syncLayout();
    window.addEventListener("resize", syncLayout);
    window.addEventListener("orientationchange", syncLayout);
    return () => {
      window.removeEventListener("resize", syncLayout);
      window.removeEventListener("orientationchange", syncLayout);
    };
  }, []);

  useEffect(() => {
    if (!iosWorkarounds) return;
    const onOrientationChange = () => {
      lastOrientationAtRef.current = Date.now();
      /*
       * 轉向後 Safari 經常重新排版網址列（尤其直向），舊的 hidden 狀態不可沿用；
       * 先取消「全螢幕」判定與 debounce，否則橫屏全螢 → 轉直後非全螢仍不顯示 cover。
       */
      if (toolbarHiddenConfirmTimerRef.current !== undefined) {
        window.clearTimeout(toolbarHiddenConfirmTimerRef.current);
        toolbarHiddenConfirmTimerRef.current = undefined;
      }
      iosToolbarHiddenRef.current = false;
      setIosToolbarHidden(false);
      window.dispatchEvent(
        new Event(GAME_OVERLAY_IOS_TOOLBAR_CONSUMER_RESET_EVENT),
      );
    };
    window.addEventListener("orientationchange", onOrientationChange);
    return () => {
      window.removeEventListener("orientationchange", onOrientationChange);
    };
  }, [iosWorkarounds]);

  useEffect(() => {
    if (!tapFullscreenMode) {
      setTapFullscreenGateVisible(false);
      return;
    }
    const syncTapGate = () => {
      const root = rootRef.current;
      const fsEl = getFullscreenElement();
      const inOurs = !!(root && fsEl && root.contains(fsEl));
      setTapFullscreenGateVisible(!inOurs);
    };
    syncTapGate();
    document.addEventListener("fullscreenchange", syncTapGate);
    document.addEventListener(
      "webkitfullscreenchange",
      syncTapGate as EventListener,
    );
    return () => {
      document.removeEventListener("fullscreenchange", syncTapGate);
      document.removeEventListener(
        "webkitfullscreenchange",
        syncTapGate as EventListener,
      );
    };
  }, [tapFullscreenMode]);

  useEffect(() => {
    const rootEl = rootRef.current;
    return () => {
      const fsEl = getFullscreenElement();
      if (rootEl && fsEl && rootEl.contains(fsEl)) {
        void exitBrowserFullscreen();
      }
    };
  }, []);

  useEffect(() => {
    const doc = document.documentElement;
    if (!shouldUseIosGameViewportWorkarounds()) return;
    doc.classList.add("game-fullscreen-host");
    document.body.classList.add("game-fullscreen-host");
    return () => {
      doc.classList.remove("game-fullscreen-host");
      document.body.classList.remove("game-fullscreen-host");
    };
  }, []);

  const initialIosHint =
    shouldUseIosGameViewportWorkarounds() && !hasDismissedIosGameScrollHint();

  const [iosHintOn, setIosHintOn] = useState(initialIosHint);
  const [iosHintLeaving, setIosHintLeaving] = useState(false);

  useEffect(() => {
    if (!iosHintOn || iosHintLeaving) return;
    const tId = window.setTimeout(() => {
      setIosHintLeaving(true);
    }, IOS_HINT_AUTO_LEAVE_MS);
    return () => window.clearTimeout(tId);
  }, [iosHintOn, iosHintLeaving]);

  useEffect(() => {
    if (!iosHintLeaving || !iosHintOn) return;
    const tId = window.setTimeout(() => {
      setIosHintOn(false);
      setIosHintLeaving(false);
    }, IOS_HINT_LEAVE_MS);
    return () => window.clearTimeout(tId);
  }, [iosHintLeaving, iosHintOn]);

  useEffect(() => {
    agentDebugLog({
      hypothesisId: "A",
      location: "GameOverlay.tsx:mount",
      message: "overlay_mounted",
      data: { path: agentDebugUrlPreview(url), isPayment },
    });
    return () => {
      agentDebugLog({
        hypothesisId: "A",
        location: "GameOverlay.tsx:unmount",
        message: "overlay_unmount_cleanup_start",
        data: { path: agentDebugUrlPreview(url) },
      });
    };
  }, [url, isPayment]);

  /** Ask Unity to Quit (postMessage), then tear down iframe so WebGL can release sooner. */
  useEffect(() => {
    const prevTimer = iframeTeardownTimerRef.current;
    if (prevTimer !== undefined) {
      window.clearTimeout(prevTimer);
      iframeTeardownTimerRef.current = undefined;
    }

    const iframeEl = iframeRef.current;

    return () => {
      if (!iframeEl) return;
      postQuitToGameIframe(iframeEl);

      iframeTeardownTimerRef.current = window.setTimeout(() => {
        iframeTeardownTimerRef.current = undefined;
        try {
          iframeEl.src = "about:blank";
        } catch {
          /* ignore */
        }
        logPerfMemorySnapshot(
          "[game-shell][dev] heap after iframe_teardown (delayed)",
        );
      }, IFRAME_TEARDOWN_DELAY_MS);
    };
  }, [url]);

  const dismissIosHint = () => {
    dismissIosGameScrollHintPermanently();
    setIosHintLeaving(true);
  };

  const finishCloseAfterFullscreen = useCallback(() => {
    postQuitToGameIframe(iframeRef.current);
    onClose();
  }, [onClose]);

  const handleTapFullscreenGateActivate = useCallback(() => {
    const root = rootRef.current;
    if (!root || !tapFullscreenMode) return;
    void enterBrowserFullscreen(root).catch(() => {
      setTapFullscreenGateVisible(false);
    });
  }, [tapFullscreenMode]);

  const handleHomeClick = () => {
    const root = rootRef.current;
    const fsEl = getFullscreenElement();
    if (root && fsEl && root.contains(fsEl)) {
      void exitBrowserFullscreen()
        .catch(() => {
          /* ignore */
        })
        .finally(finishCloseAfterFullscreen);
      return;
    }
    finishCloseAfterFullscreen();
  };

  const showPlaySwipeHintImage =
    playSwipeHintFeatureOn &&
    layoutLandscape &&
    ((!iosWorkarounds && import.meta.env.DEV) ||
      (iosWorkarounds && !iosToolbarHidden));

  useEffect(() => {
    if (!playSwipeHintFeatureOn) {
      setSwipeHintInDom(false);
      setSwipeHintOpaque(false);
      return;
    }
    if (showPlaySwipeHintImage) {
      setSwipeHintInDom(true);
    } else {
      setSwipeHintOpaque(false);
    }
  }, [showPlaySwipeHintImage, playSwipeHintFeatureOn]);

  useEffect(() => {
    if (!swipeHintInDom || !showPlaySwipeHintImage) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSwipeHintOpaque(true));
    });
    return () => cancelAnimationFrame(id);
  }, [swipeHintInDom, showPlaySwipeHintImage]);

  const onSwipeHintTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "opacity") return;
    if (!showPlaySwipeHintImage) setSwipeHintInDom(false);
  };

  /** 未實際完成 fade-in 就關閉時，opacity 未變可能不觸發 transitionend */
  useEffect(() => {
    if (showPlaySwipeHintImage || !swipeHintInDom) return;
    const tid = window.setTimeout(() => {
      setSwipeHintInDom(false);
    }, 450);
    return () => window.clearTimeout(tid);
  }, [showPlaySwipeHintImage, swipeHintInDom]);

  /** 直向不顯示滿版圖時仍用既有文字提示（與舊版 ios-hint 並存） */
  const showIosTextScrollHint =
    iosHintOn && (!playSwipeHintFeatureOn || !layoutLandscape);

  const swipeHintSuppressIframe =
    iosWorkarounds &&
    playSwipeHintFeatureOn &&
    layoutLandscape &&
    swipeHintInDom;

  const overlayClassNames = [
    iosWorkarounds
      ? "game-overlay game-overlay--ios-scroll-host"
      : "game-overlay",
    swipeHintSuppressIframe ? "game-overlay--swipe-hint-suppress-iframe" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={rootRef} className={overlayClassNames} role="presentation">
      {iosWorkarounds ? (
        <>
          <div
            ref={iosScrollEdgeLeftRef}
            className="game-overlay__ios-scroll-edge game-overlay__ios-scroll-edge--left"
            aria-hidden
          />
          <div
            ref={iosScrollEdgeRightRef}
            className="game-overlay__ios-scroll-edge game-overlay__ios-scroll-edge--right"
            aria-hidden
          />
        </>
      ) : null}
      <button
        type="button"
        className="game-overlay__close"
        onClick={handleHomeClick}
        aria-label="Return to lobby">
        <Home
          className="game-overlay__close-icon"
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {swipeHintInDom && playSwipeHintFeatureOn ? (
        <div
          className={`game-overlay__play-swipe-hint${swipeHintOpaque ? " game-overlay__play-swipe-hint--visible" : ""}`}
          aria-hidden
          onTransitionEnd={onSwipeHintTransitionEnd}>
          <img
            src={PLAY_SWIPE_HINT_IMAGE_SRC}
            alt=""
            className="game-overlay__play-swipe-hint-img"
            draggable={false}
          />
        </div>
      ) : null}
      {showIosTextScrollHint ? (
        <aside
          className={`game-overlay__ios-hint${iosHintLeaving ? " game-overlay__ios-hint--leaving" : ""}`}
          role="note"
          aria-live="polite">
          <p className="game-overlay__ios-hint-text">
            {t("gameIosScrollHint")}
          </p>
          <div className="game-overlay__ios-hint-actions">
            <button
              type="button"
              className="game-overlay__ios-hint-dismiss"
              onClick={dismissIosHint}>
              {t("gameIosScrollHintDismiss")}
            </button>
          </div>
        </aside>
      ) : null}
      {tapFullscreenGateVisible ? (
        <button
          type="button"
          className="game-overlay__tap-fs-gate"
          aria-label={t("gameTapToFullscreenHint")}
          onPointerDown={(e) => {
            e.preventDefault();
            handleTapFullscreenGateActivate();
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            handleTapFullscreenGateActivate();
          }}>
          <span className="game-overlay__tap-fs-gate-label">
            {t("gameTapToFullscreenHint")}
          </span>
        </button>
      ) : null}
      <iframe
        ref={iframeRef}
        className="game-overlay__frame"
        title={isPayment ? "payment" : "game"}
        src={url}
        referrerPolicy="strict-origin-when-cross-origin"
        allow={allow}
        onLoad={() => {
          agentDebugLog({
            hypothesisId: "D",
            location: "GameOverlay.tsx:iframe",
            message: "iframe_load_event",
            data: { path: agentDebugUrlPreview(url) },
          });
        }}
        onError={() => {
          agentDebugLog({
            hypothesisId: "D",
            location: "GameOverlay.tsx:iframe",
            message: "iframe_error_ua",
            data: { path: agentDebugUrlPreview(url) },
          });
        }}
      />
    </div>
  );
}
