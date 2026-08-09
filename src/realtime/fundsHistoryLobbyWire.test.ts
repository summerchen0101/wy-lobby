import { describe, expect, it } from "vitest";
import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import { getWord } from "../wordData/getWord";
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
      gcAmount: 600000,
      scAmount: 20000,
      timestamp: "1781491946824",
    });
    const resp = ResponseType.create({ histories: [history] });
    const raw = Uint8Array.from(ResponseType.encode(resp).finish());
    const { histories } = decodeListPurchaseAndPrizeHistoriesResponseBytes(raw);
    expect(histories).toHaveLength(1);
    expect(histories[0]?.tradeEventLabel).toBe(getWord(510769));
    expect(formatFundsHistoryGcAmount(histories[0]!.gcAmountWire)).toBe("600K");
    expect(formatFundsHistoryScBonus(histories[0]!.scAmountWire)).toBe("2");
  });

  it("decodes server int64 wire amounts (regression: index out of range)", () => {
    const history = HistoryType.create({
      TradeEvent: 17,
      gcAmount: 255000,
      scAmount: 20000,
      timestamp: "1781491946824",
    });
    const resp = ResponseType.create({ histories: [history] });
    const raw = Uint8Array.from(ResponseType.encode(resp).finish());
    const { histories } = decodeListPurchaseAndPrizeHistoriesResponseBytes(raw);
    expect(histories).toHaveLength(1);
    expect(histories[0]?.gcAmountWire).toBe("255000");
  });

  it("decodes DailyMissonAward (TradeEvent 51) as Daily Bonus", () => {
    const history = HistoryType.create({
      TradeEvent: 51,
      gcAmount: 170000,
      scAmount: 0,
      timestamp: "1781491946824",
    });
    const resp = ResponseType.create({ histories: [history] });
    const raw = Uint8Array.from(ResponseType.encode(resp).finish());
    const { histories } = decodeListPurchaseAndPrizeHistoriesResponseBytes(raw);
    expect(histories).toHaveLength(1);
    expect(histories[0]?.tradeEventLabel).toBe(getWord(510786));
    expect(tradeEventToLabel(51)).toBe(getWord(510786));
    expect(formatFundsHistoryGcAmount(histories[0]!.gcAmountWire)).toBe("170K");
    expect(formatFundsHistoryScBonus(histories[0]!.scAmountWire)).toBe("0");
  });

  it("formats zero and fractional SC bonus amounts", () => {
    expect(formatFundsHistoryScBonus("6000")).toBe("0.60");
    expect(formatFundsHistoryScBonus("0")).toBe("0");
    expect(formatFundsHistoryGcAmount("0")).toBe("0");
  });

  it("formats trade event enum name fallback", () => {
    expect(tradeEventToLabel("PAYMENT_BUY_GOLD")).toBe(getWord(510769));
  });

  it("decodes VIPLevelBonus (TradeEvent 111) as Level Up Bonus", () => {
    expect(tradeEventToLabel(111)).toBe(getWord(510783));
    expect(tradeEventToLabel("VIPLevelBonus")).toBe(getWord(510783));
  });

  it("decodes AMOE_AWARD (TradeEvent 112) as AMOE", () => {
    expect(tradeEventToLabel(112)).toBe(getWord(510784));
    expect(tradeEventToLabel("AMOE_AWARD")).toBe(getWord(510784));
  });

  it("formats timestamp as MM/DD/YYYY in America/New_York", () => {
    expect(formatFundsHistoryDate("1781491946824")).toBe("06/14/2026");
  });
});
