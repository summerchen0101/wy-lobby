import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../../auth/useAuth";
import { useAlert } from "../../components/alert/alertContext";
import { isWsLobbyGamesEnabled } from "../../lib/env";
import { formatCompactGcAmount } from "../../lib/formatCompactGcAmount";
import { translateGatewayError } from "../../i18n/apiErrorMessage";
import {
  decodeGetActivityResponseBytes,
  decodeListActivitiesResponseBytes,
  encodeActivityCollectRewardReqBytes,
  encodeGetActivityRequestBytes,
  encodeListActivitiesRequestBytes,
  formatItemAmountForDisplay,
  isDailySignInActivityType,
  type ActivityDataDecoded,
} from "../../realtime/activityLobbyWire";
import {
  GATEWAY_API_ACTIVITY_COLLECT_REWARD,
  GATEWAY_API_GET_ACTIVITY,
  GATEWAY_API_LIST_ACTIVITY,
} from "../../realtime/gatewayApi";
import { isGatewaySuccessCode } from "../../realtime/gatewayWire";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import {
  buildDailyLoginViewModel,
  countLeadingCollectableDayGroups,
  findClaimableCreditRewardAmounts,
  findCollectableDay,
  hasClaimedDailyRewardTodayFromLobbyGet,
  isDayCollectable,
  isMissionCollectEligible,
  type DayViewModel,
} from "./dailyLoginLogic";
import { DailyLoginContext } from "./dailyLoginContext";
import {
  clearCachedDailyLoginActivity,
  readCachedDailyLoginActivity,
  readCachedDailyLoginActivityId,
  writeCachedDailyLoginActivity,
} from "./dailyLoginCache";
import {
  getInitialCollectableCount,
  markDailyClaimedToday,
  recordInitialCollectableCount,
  resolveClaimedDailyToday,
} from "./dailyLoginSession";
import {
  DAILY_LOGIN_AUTO_CLOSE_MS,
  computeCanDismissModal,
  resolveDailyLoginPrimaryAction,
} from "./dailyLoginFlow";
import {
  LOBBY_SESSION_OVERLAYS_DISMISS_EVENT,
} from "../../lib/dismissLobbySessionOverlays";

function translateDailyLoginClaimError(
  code: string,
  errMessage?: string | null,
): string {
  return translateGatewayError(
    code,
    errMessage,
    `Claim failed (${code})`,
  );
}

type GatewayRequestFn = NonNullable<
  ReturnType<typeof useGatewayLobby>["requestRef"]["current"]
>;

type ReloadOptions = {
  background?: boolean;
};

async function fetchDailySignInActivity(
  request: GatewayRequestFn,
  knownActivityId?: string | null,
): Promise<ActivityDataDecoded | null> {
  let activityId = String(knownActivityId ?? "").trim();

  const fetchDetail = async (
    id: string,
  ): Promise<ActivityDataDecoded | null> => {
    const detailRes = await request({
      type: GATEWAY_API_GET_ACTIVITY,
      data: encodeGetActivityRequestBytes(id),
      debugLabel: "GET_ACTIVITY",
    });
    const detailCode = String(detailRes.code ?? "");
    if (!isGatewaySuccessCode(detailCode)) {
      return null;
    }
    if (!(detailRes.data instanceof Uint8Array)) return null;
    const { activity } = decodeGetActivityResponseBytes(detailRes.data);
    return activity ?? null;
  };

  if (activityId) {
    const cached = await fetchDetail(activityId);
    if (cached) return cached;
    clearCachedDailyLoginActivity();
    activityId = "";
  }

  const listRes = await request({
    type: GATEWAY_API_LIST_ACTIVITY,
    data: encodeListActivitiesRequestBytes(),
    debugLabel: "LIST_ACTIVITY",
  });
  const listCode = String(listRes.code ?? "");
  if (!isGatewaySuccessCode(listCode)) {
    throw new Error(
      translateGatewayError(
        listCode,
        listRes.errMessage,
        `List activity failed (${listCode})`,
      ),
    );
  }
  if (!(listRes.data instanceof Uint8Array)) return null;
  const { activities } = decodeListActivitiesResponseBytes(listRes.data);
  const summary = (activities ?? []).find((a) =>
    isDailySignInActivityType(a.activityType),
  );
  if (!summary?.activityID) return null;
  activityId = String(summary.activityID).trim();

  const detail = await fetchDetail(activityId);
  if (!detail) {
    throw new Error("Get activity failed");
  }
  return detail;
}

export function DailyLoginProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id?.trim() ?? "";
  const vipLevel = user?.vipLevel ?? 0;
  const { show } = useAlert();
  const {
    requestRef,
    gatewayRequestReady,
    needsLobbyHydrationOverlay,
    refreshLobbyGet,
    lobbyGet,
  } = useGatewayLobby();

  const [activity, setActivity] = useState<ActivityDataDecoded | null>(() =>
    readCachedDailyLoginActivity(),
  );
  const [activityFromCache, setActivityFromCache] = useState(
    () => readCachedDailyLoginActivity() != null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [flying, setFlying] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [postClaimDismissible, setPostClaimDismissible] = useState(false);
  const claimSummaryRef = useRef("");
  const flyCompleteRef = useRef<() => void>(() => {});
  const lastActivityIdRef = useRef<string | null>(readCachedDailyLoginActivityId());
  const activityRef = useRef(activity);
  const reloadInFlightRef = useRef<Promise<void> | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeClaimFlowRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    activityRef.current = activity;
  }, [activity]);

  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current != null) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  const [claimedDailyToday, setClaimedDailyToday] = useState(() =>
    resolveClaimedDailyToday(userId, activity, {
      lobbyGet,
      syncStorage: true,
    }),
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setClaimedDailyToday(
      resolveClaimedDailyToday(userId, activity, {
        lobbyGet,
        syncStorage: true,
      }),
    );
  }, [activity, userId, lobbyGet]);

  const claimedDailyTodayFromLobby = useMemo(
    () => hasClaimedDailyRewardTodayFromLobbyGet(lobbyGet, nowMs),
    [lobbyGet, nowMs],
  );

  useEffect(() => {
    setNowMs(Date.now());
  }, [activity]);

  const viewModel = useMemo(
    () =>
      activity
        ? buildDailyLoginViewModel(activity, nowMs, {
            claimedDailyToday,
            claimedDailyTodayFromLobby,
            initialCollectableCount: getInitialCollectableCount(userId, nowMs),
            suppressClaimableFromStaleCache:
              loading && activityFromCache,
            vipLevel,
          })
        : null,
    [
      activity,
      claimedDailyToday,
      claimedDailyTodayFromLobby,
      nowMs,
      userId,
      loading,
      activityFromCache,
      vipLevel,
    ],
  );

  const canDismissModal = useMemo(
    () =>
      computeCanDismissModal({
        postClaimDismissible,
        hasClaimableDaily: viewModel?.hasClaimableDaily ?? false,
        hasClaimableCredit: viewModel?.hasClaimableCredit ?? false,
        claiming,
        flying,
        hasError: Boolean(error),
      }),
    [
      postClaimDismissible,
      viewModel?.hasClaimableDaily,
      viewModel?.hasClaimableCredit,
      claiming,
      flying,
      error,
    ],
  );

  const reload = useCallback(async (options?: ReloadOptions) => {
    if (reloadInFlightRef.current) {
      return reloadInFlightRef.current;
    }

    const run = async () => {
      if (!isWsLobbyGamesEnabled()) return;
      const req = requestRef.current;
      if (!req) return;

      const background = options?.background === true;
      if (!background || !activityRef.current) {
        setLoading(true);
      }
      setError(null);
      try {
        const next = await fetchDailySignInActivity(
          req,
          lastActivityIdRef.current,
        );
        setActivity((prev) => {
          if (next?.activityID) {
            const id = String(next.activityID);
            lastActivityIdRef.current = id;
            const now = Date.now();
            writeCachedDailyLoginActivity(next, now);
            const claimedToday = resolveClaimedDailyToday(userId, next, {
              lobbyGet,
              nowMs: now,
              syncStorage: true,
            });
            setClaimedDailyToday(claimedToday);
            if (!claimedToday) {
              recordInitialCollectableCount(
                userId,
                countLeadingCollectableDayGroups(next),
                now,
              );
            }
            activityRef.current = next;
            setActivityFromCache(false);
            return next;
          }
          return prev;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load daily login");
      } finally {
        setLoading(false);
      }
    };

    const promise = run().finally(() => {
      reloadInFlightRef.current = null;
    });
    reloadInFlightRef.current = promise;
    return promise;
  }, [requestRef, userId, lobbyGet]);

  useEffect(() => {
    if (!gatewayRequestReady || needsLobbyHydrationOverlay) return;
    void reload({ background: activityRef.current != null });
  }, [gatewayRequestReady, needsLobbyHydrationOverlay, reload]);

  const closeModalInternal = useCallback(() => {
    clearAutoCloseTimer();
    setPostClaimDismissible(false);
    setModalOpen(false);
  }, [clearAutoCloseTimer]);

  const forceCloseModal = useCallback(() => {
    clearAutoCloseTimer();
    setPostClaimDismissible(false);
    setClaiming(false);
    setFlying(false);
    setModalOpen(false);
  }, [clearAutoCloseTimer]);

  useEffect(() => {
    if (!userId) {
      forceCloseModal();
    }
  }, [userId, forceCloseModal]);

  useEffect(() => {
    const onDismiss = () => {
      forceCloseModal();
    };
    window.addEventListener(LOBBY_SESSION_OVERLAYS_DISMISS_EVENT, onDismiss);
    return () =>
      window.removeEventListener(
        LOBBY_SESSION_OVERLAYS_DISMISS_EVENT,
        onDismiss,
      );
  }, [forceCloseModal]);

  const enterDismissible = useCallback(() => {
    show(claimSummaryRef.current, { variant: "success" });
    setPostClaimDismissible(true);
    clearAutoCloseTimer();
    autoCloseTimerRef.current = setTimeout(() => {
      closeModalInternal();
    }, DAILY_LOGIN_AUTO_CLOSE_MS);
  }, [show, clearAutoCloseTimer, closeModalInternal]);

  const openModal = useCallback(
    (options?: { refresh?: boolean; background?: boolean }) => {
      clearAutoCloseTimer();
      setPostClaimDismissible(false);
      setError(null);
      setModalOpen(true);
      if (options?.refresh === false) return;
      void reload({
        background: options?.background ?? false,
      });
    },
    [reload, clearAutoCloseTimer],
  );

  const dismissModal = useCallback(() => {
    if (claiming || flying) return;
    closeModalInternal();
  }, [claiming, flying, closeModalInternal]);

  const closeModal = useCallback(() => {
    if (claiming || flying) return;
    if (!canDismissModal) return;
    closeModalInternal();
  }, [claiming, flying, canDismissModal, closeModalInternal]);

  const finishClaimSuccess = useCallback(
    async (flyFromRect: DOMRect | null, hasGcReward: boolean) => {
      if (flyFromRect && hasGcReward) {
        setFlying(true);
        flyCompleteRef.current = () => {
          void completeClaimFlowRef.current();
        };
        return;
      }

      try {
        await refreshLobbyGet();
      } catch {
        /* balance refresh best-effort */
      }
      await completeClaimFlowRef.current();
    },
    [refreshLobbyGet],
  );

  const executeClaim = useCallback(
    async ({
      dailyMissionIds,
      creditAmounts,
      rewardParts,
      hasGcReward,
      flyFromRect,
    }: {
      dailyMissionIds: string[];
      creditAmounts: number[];
      rewardParts: string[];
      hasGcReward: boolean;
      flyFromRect: DOMRect | null;
    }) => {
      if (!viewModel || claiming || flying) return;
      const req = requestRef.current;
      if (!req) {
        setError("Not connected");
        return;
      }
      if (dailyMissionIds.length === 0 && creditAmounts.length === 0) return;

      setClaiming(true);
      setError(null);

      try {
        for (const missionId of dailyMissionIds) {
          const r = await req({
            type: GATEWAY_API_ACTIVITY_COLLECT_REWARD,
            data: encodeActivityCollectRewardReqBytes({
              activityID: viewModel.activityId,
              dailyMissionID: missionId,
              requiredCreditAmount: 0,
            }),
            debugLabel: "ACTIVITY_COLLECT_REWARD",
          });
          const code = String(r.code ?? "");
          if (!isGatewaySuccessCode(code)) {
            throw new Error(
              translateDailyLoginClaimError(code, r.errMessage),
            );
          }
        }
        for (const amount of creditAmounts) {
          const r = await req({
            type: GATEWAY_API_ACTIVITY_COLLECT_REWARD,
            data: encodeActivityCollectRewardReqBytes({
              activityID: viewModel.activityId,
              dailyMissionID: 0,
              requiredCreditAmount: amount,
            }),
            debugLabel: "ACTIVITY_COLLECT_REWARD_CREDIT",
          });
          const code = String(r.code ?? "");
          if (!isGatewaySuccessCode(code)) {
            throw new Error(
              translateDailyLoginClaimError(code, r.errMessage),
            );
          }
        }

        claimSummaryRef.current =
          rewardParts.length > 0
            ? `Successfully claimed ${rewardParts.join(", ")}!`
            : "Rewards claimed!";

        if (dailyMissionIds.length > 0) {
          markDailyClaimedToday(userId);
          setClaimedDailyToday(true);
        }

        await reload();
        await finishClaimSuccess(flyFromRect, hasGcReward);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Claim failed");
      } finally {
        setClaiming(false);
      }
    },
    [
      viewModel,
      claiming,
      flying,
      requestRef,
      reload,
      finishClaimSuccess,
      userId,
    ],
  );

  const claimDay = useCallback(
    async (day: DayViewModel, flyFromRect: DOMRect | null) => {
      if (!isDayCollectable(day)) {
        closeModalInternal();
        return;
      }
      if (day.status !== "claimable") {
        closeModalInternal();
        return;
      }
      const dailyMissionIds = day.claimableMissionIds.filter((id) => {
        const mission = day.missions.find(
          (m) => String(m.dailyMissionID ?? "") === id,
        );
        return mission != null && isMissionCollectEligible(mission);
      });
      if (dailyMissionIds.length === 0) {
        closeModalInternal();
        return;
      }

      const rewardParts: string[] = [];
      let hasGcReward = false;
      for (const reward of day.rewards) {
        const amt = formatItemAmountForDisplay(reward.itemID, reward.itemAmount);
        if (reward.wallet === "GC") hasGcReward = true;
        rewardParts.push(
          reward.wallet === "GC"
            ? `${formatCompactGcAmount(amt)} GC`
            : `${amt} SC`,
        );
      }

      await executeClaim({
        dailyMissionIds,
        creditAmounts: [],
        rewardParts,
        hasGcReward,
        flyFromRect,
      });
    },
    [executeClaim, closeModalInternal],
  );

  const claimCreditReward = useCallback(
    async (requiredCreditAmount: number, flyFromRect: DOMRect | null) => {
      const vm = activityRef.current
        ? buildDailyLoginViewModel(activityRef.current, Date.now(), {
            claimedDailyToday,
            claimedDailyTodayFromLobby: hasClaimedDailyRewardTodayFromLobbyGet(
              lobbyGet,
            ),
            initialCollectableCount: getInitialCollectableCount(userId),
            vipLevel,
          })
        : viewModel;
      const reward = vm?.creditRewards.find(
        (r) => r.requiredCreditAmount === requiredCreditAmount,
      );
      if (!reward?.claimable) return;

      const rewardParts: string[] = [];
      for (const line of reward.rewards) {
        const amt = formatItemAmountForDisplay(line.itemID, line.itemAmount);
        rewardParts.push(
          line.wallet === "GC"
            ? `${formatCompactGcAmount(amt)} GC`
            : `${amt} SC`,
        );
      }

      await executeClaim({
        dailyMissionIds: [],
        creditAmounts: [requiredCreditAmount],
        rewardParts,
        hasGcReward: false,
        flyFromRect,
      });
    },
    [viewModel, executeClaim, claimedDailyToday, userId, vipLevel, lobbyGet],
  );

  const completeClaimFlow = useCallback(async () => {
    const vm = activityRef.current
      ? buildDailyLoginViewModel(activityRef.current, Date.now(), {
          claimedDailyToday,
          claimedDailyTodayFromLobby: hasClaimedDailyRewardTodayFromLobbyGet(
            lobbyGet,
          ),
          initialCollectableCount: getInitialCollectableCount(userId),
        })
      : null;
    const nextDaily = findCollectableDay(vm);
    if (nextDaily) {
      await claimDay(nextDaily, null);
      return;
    }
    const [nextCredit] = findClaimableCreditRewardAmounts(
      vm?.creditRewards ?? [],
    );
    if (nextCredit != null) {
      await claimCreditReward(nextCredit, null);
      return;
    }
    enterDismissible();
  }, [claimCreditReward, enterDismissible, claimedDailyToday, claimDay, userId, lobbyGet]);

  useEffect(() => {
    completeClaimFlowRef.current = completeClaimFlow;
  }, [completeClaimFlow]);

  const onFlyComplete = useCallback(() => {
    void (async () => {
      try {
        await refreshLobbyGet();
      } catch {
        /* balance refresh best-effort */
      } finally {
        setFlying(false);
        flyCompleteRef.current();
      }
    })();
  }, [refreshLobbyGet]);

  const handlePrimaryAction = useCallback(
    (flyFromRect?: DOMRect | null) => {
      if (claiming || flying) return;

      const action = resolveDailyLoginPrimaryAction(viewModel, {
        postClaimDismissible,
        claiming,
        flying,
        hasError: Boolean(error),
      });

      switch (action.type) {
        case "claim-day":
          void claimDay(action.day, flyFromRect ?? null);
          break;
        case "claim-credit":
          void claimCreditReward(
            action.requiredCreditAmount,
            flyFromRect ?? null,
          );
          break;
        case "dismiss":
          closeModalInternal();
          break;
        case "none":
          break;
      }
    },
    [
      claiming,
      flying,
      viewModel,
      postClaimDismissible,
      error,
      claimDay,
      claimCreditReward,
      closeModalInternal,
    ],
  );

  useEffect(() => {
    return () => {
      clearAutoCloseTimer();
    };
  }, [clearAutoCloseTimer]);

  const value = useMemo(
    () => ({
      viewModel,
      loading,
      error,
      claiming,
      flying,
      modalOpen,
      postClaimDismissible,
      canDismissModal,
      openModal,
      closeModal,
      dismissModal,
      reload,
      claimDay,
      claimCreditReward,
      onFlyComplete,
      handlePrimaryAction,
    }),
    [
      viewModel,
      loading,
      error,
      claiming,
      flying,
      modalOpen,
      postClaimDismissible,
      canDismissModal,
      openModal,
      closeModal,
      dismissModal,
      reload,
      claimDay,
      claimCreditReward,
      onFlyComplete,
      handlePrimaryAction,
    ],
  );

  return (
    <DailyLoginContext.Provider value={value}>
      {children}
    </DailyLoginContext.Provider>
  );
}
