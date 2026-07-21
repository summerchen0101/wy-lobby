import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import { DISPLAY_TZ } from "../lib/displayTimezone";
import { getActiveLocale } from "../i18n/getActiveLocale";
import { SC_POINT_SCALE } from "../wallet/formatWalletAmount";
import { tradeEventToLabel } from "../wordData/tradeEventWordData";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);

function mustLookup(name: string): protobuf.Type {
  const t = root.lookup(name);
  if (!t || !(t instanceof protobuf.Type)) {
    throw new Error(`funds history wire: missing message type ${name}`);
  }
  return t;
}

const ListPurchaseAndPrizeHistoriesResponseType = mustLookup(
  "megaman.ListPurchaseAndPrizeHistoriesResponse",
);

const wireToObjectOpts = {
  longs: String,
  defaults: true,
  enums: String,
} as const;

export type FundsHistoryWireRow = {
  tradeEventRaw: number;
  tradeEventLabel: string;
  gcAmountWire: string;
  scAmountWire: string;
  timestampMs: string;
};

export { tradeEventToLabel } from "../wordData/tradeEventWordData";

/** GC 顯示：600000 → 600K（對齊 Shop gcLabel） */
export function formatFundsHistoryGcAmount(gcAmountWire: string): string {
  const t = String(gcAmountWire ?? "")
    .trim()
    .replace(/,/g, "");
  if (t === "") return "—";
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const s = m >= 10 ? String(Math.round(m)) : String(Math.round(m * 10) / 10);
    return `${s.replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) {
    const k = n / 1000;
    const s = k >= 100 ? String(Math.round(k)) : String(Math.round(k * 10) / 10);
    return `${s.replace(/\.0$/, "")}K`;
  }
  return String(Math.round(n));
}

/** SC 贈送顯示：20000 wire → 2（整數 SC） */
export function formatFundsHistoryScBonus(scAmountWire: string): string {
  const t = String(scAmountWire ?? "")
    .trim()
    .replace(/,/g, "");
  if (t === "" || t === "0") return "";
  if (!/^\d+$/.test(t)) return "";
  try {
    const rawBig = BigInt(t);
    if (rawBig <= 0n) return "";
    const display = rawBig / BigInt(SC_POINT_SCALE);
    if (display <= 0n) return "";
    return display.toLocaleString(getActiveLocale());
  } catch {
    return "";
  }
}

/** timestamp 毫秒 → MM/DD/YYYY（en-US, America/New_York） */
export function formatFundsHistoryDate(timestampMs: string): string {
  const t = String(timestampMs ?? "").trim();
  if (!/^\d+$/.test(t)) return "—";
  try {
    const ms = BigInt(t);
    if (ms <= 0n) return "—";
    const n = Number(ms);
    if (!Number.isFinite(n)) return "—";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: DISPLAY_TZ,
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(n));
  } catch {
    return "—";
  }
}

export type ListPurchaseAndPrizeHistoriesWireResult = {
  histories: FundsHistoryWireRow[];
};

export function decodeListPurchaseAndPrizeHistoriesResponseBytes(
  data: Uint8Array,
): ListPurchaseAndPrizeHistoriesWireResult {
  const msg = ListPurchaseAndPrizeHistoriesResponseType.decode(data);
  const o = ListPurchaseAndPrizeHistoriesResponseType.toObject(
    msg,
    wireToObjectOpts,
  ) as {
    histories?: Record<string, unknown>[];
  };
  const histories = (o.histories ?? []).map((row) => {
    const tradeEventRaw = row.TradeEvent ?? row.tradeEvent;
    const gcAmountWire = String(row.gcAmount ?? "").trim();
    const scAmountWire = String(row.scAmount ?? "").trim();
    const timestampMs = String(row.timestamp ?? "").trim();
    return {
      tradeEventRaw:
        typeof tradeEventRaw === "number"
          ? tradeEventRaw
          : Number(String(tradeEventRaw ?? "").trim()) || 0,
      tradeEventLabel: tradeEventToLabel(tradeEventRaw),
      gcAmountWire,
      scAmountWire,
      timestampMs,
    };
  });
  return { histories };
}
