import { useEffect, useState } from "react";
import { useGatewayLobby } from "../../realtime/useGatewayLobby";
import { useWordData } from "../../wordData/useWordData";
import { formatWithdrawMarqueePushLine } from "./redeemWithdrawMarquee";
import { useRedeemPillMessages } from "./useRedeemPillMessages";

export function useWithdrawSuccessMarquee(): string[] {
  const w = useWordData();
  const { subscribeWithdrawSuccessPush } = useGatewayLobby();
  const [liveMessages, setLiveMessages] = useState<string[]>([]);

  useEffect(() => {
    return subscribeWithdrawSuccessPush((push) => {
      const line = formatWithdrawMarqueePushLine(
        w,
        push.nickname,
        push.actualAmountWire,
      );
      setLiveMessages((prev) => [line, ...prev].slice(0, 24));
    });
  }, [subscribeWithdrawSuccessPush, w]);

  return useRedeemPillMessages(liveMessages);
}
