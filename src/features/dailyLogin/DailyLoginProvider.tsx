import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  isDayClaimableToday,
  type DayViewModel,
} from "./dailyLoginLogic";
import { DailyLoginContext } from "./dailyLoginContext";
import {
  clearCachedDailyLoginActivity,
  readCachedDailyLoginActivity,
  readCachedDailyLoginActivityId,
  writeCachedDailyLoginActivity,
} from "./dailyLoginCache";

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
  const { show } = useAlert();
  const { requestRef, gatewayRequestReady, refreshLobbyGet } =
    useGatewayLobby();

  const [activity, setActivity] = useState<ActivityDataDecoded | null>(() =>
    readCachedDailyLoginActivity(),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [flying, setFlying] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const claimSummaryRef = useRef("");
  const flyCompleteRef = useRef<() => void>(() => {});
  const lastActivityIdRef = useRef<string | null>(readCachedDailyLoginActivityId());
  const activityRef = useRef(activity);
  const reloadInFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    activityRef.current = activity;
  }, [activity]);

  const viewModel = useMemo(
    () => (activity ? buildDailyLoginViewModel(activity) : null),
    [activity],
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
            writeCachedDailyLoginActivity(next);
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
  }, [requestRef]);

  useEffect(() => {
    if (!gatewayRequestReady) return;
    void reload({ background: activityRef.current != null });
  }, [gatewayRequestReady, reload]);

  const openModal = useCallback(
    (options?: { refresh?: boolean; background?: boolean }) => {
      setModalOpen(true);
      if (options?.refresh === false) return;
      void reload({
        background: options?.background ?? false,
      });
    },
    [reload],
  );
  const closeModal = useCallback(() => {
    if (claiming || flying) return;
    setModalOpen(false);
  }, [claiming, flying]);

  const finishClaimSuccess = useCallback(
    async (flyFromRect: DOMRect | null, hasGcReward: boolean) => {
      if (flyFromRect && hasGcReward) {
        setFlying(true);
        flyCompleteRef.current = () => {
          show(claimSummaryRef.current, { variant: "success" });
          setModalOpen(false);
        };
      } else {
        try {
          await refreshLobbyGet();
        } catch {
          /* balance refresh best-effort */
        }
        show(claimSummaryRef.current, { variant: "success" });
        setModalOpen(false);
      }
    },
    [show, refreshLobbyGet],
  );

  const executeClaim = useCallback(
    async ({
      dailyIds,
      creditAmounts,
      rewardParts,
      hasGcReward,
      flyFromRect,
    }: {
      dailyIds: string[];
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
      if (dailyIds.length === 0 && creditAmounts.length === 0) return;

      setClaiming(true);
      setError(null);

      try {
        for (const missionId of dailyIds) {
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
              translateGatewayError(code, r.errMessage, `Claim failed (${code})`),
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
              translateGatewayError(code, r.errMessage, `Claim failed (${code})`),
            );
          }
        }

        claimSummaryRef.current =
          rewardParts.length > 0
            ? `Successfully claimed ${rewardParts.join(", ")}!`
            : "Rewards claimed!";

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
    ],
  );

  const claimDay = useCallback(
    async (day: DayViewModel, flyFromRect: DOMRect | null) => {
      if (!isDayClaimableToday(day)) return;
      if (day.status !== "claimable") return;
      const dailyIds = day.claimableMissionIds;
      if (dailyIds.length === 0) return;

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
        dailyIds,
        creditAmounts: [],
        rewardParts,
        hasGcReward,
        flyFromRect,
      });
    },
    [executeClaim],
  );

  const claimCreditReward = useCallback(
    async (requiredCreditAmount: number, flyFromRect: DOMRect | null) => {
      const reward = viewModel?.creditRewards.find(
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
        dailyIds: [],
        creditAmounts: [requiredCreditAmount],
        rewardParts,
        hasGcReward: false,
        flyFromRect,
      });
    },
    [viewModel, executeClaim],
  );

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

  const value = useMemo(
    () => ({
      viewModel,
      loading,
      error,
      claiming,
      flying,
      modalOpen,
      openModal,
      closeModal,
      reload,
      claimDay,
      claimCreditReward,
      onFlyComplete,
    }),
    [
      viewModel,
      loading,
      error,
      claiming,
      flying,
      modalOpen,
      openModal,
      closeModal,
      reload,
      claimDay,
      claimCreditReward,
      onFlyComplete,
    ],
  );

  return (
    <DailyLoginContext.Provider value={value}>
      {children}
    </DailyLoginContext.Provider>
  );
}
