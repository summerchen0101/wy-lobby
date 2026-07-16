import { describe, expect, it } from "vitest";
import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import {
  decodeListPurchaseAndPrizeHistoriesResponseBytes,
  formatFundsHistoryDate,
  formatFundsHistoryGcAmount,
  formatFundsHistoryScBonus,
  tradeEventToLabel,
} from "./fundsHistoryLobbyWire";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);

function mustLookup(name: string): protobuf.Type {
  const t = root.lookup(name);
  if (!t || !(t instanceof protobuf.Type)) {
    throw new Error(`missing message type ${name}`);
  }
  return t;
}

const ResponseType = mustLookup("megaman.ListPurchaseAndPrizeHistoriesResponse");
const HistoryType = mustLookup("megaman.PurchaseAndPrizeHistory");

describe("fundsHistoryLobbyWire", () => {
  it("decodes ListPurchaseAndPrizeHistoriesResponse", () => {
    const history = HistoryType.create({
      TradeEvent: 17,
      gcAmount: "600000",
      scAmount: "20000",
      timestamp: "1781491946824",
    });
    const resp = ResponseType.create({ histories: [history] });
    const raw = Uint8Array.from(ResponseType.encode(resp).finish());
    const { histories } = decodeListPurchaseAndPrizeHistoriesResponseBytes(raw);
    expect(histories).toHaveLength(1);
    expect(histories[0]?.tradeEventLabel).toBe("PaymentBuyGold Reward");
    expect(formatFundsHistoryGcAmount(histories[0]!.gcAmountWire)).toBe("600K");
    expect(formatFundsHistoryScBonus(histories[0]!.scAmountWire)).toBe("2");
  });

  it("formats trade event enum name fallback", () => {
    expect(tradeEventToLabel("PAYMENT_BUY_GOLD")).toBe("PaymentBuyGold Reward");
  });

  it("formats timestamp as MM/DD/YYYY in America/New_York", () => {
    expect(formatFundsHistoryDate("1781491946824")).toBe("06/14/2026");
  });
});
