import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";
import { formatScFromRawWireInteger } from "../wallet/formatWalletAmount";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);

function mustLookup(name: string): protobuf.Type {
  const t = root.lookup(name);
  if (!t || !(t instanceof protobuf.Type)) {
    throw new Error(`lobby wire: missing message type ${name}`);
  }
  return t;
}

const wireToObjectOpts = {
  longs: String,
  defaults: true,
  enums: String,
} as const;

const GenerateAmoeCodeResponseType = mustLookup("megaman.GenerateAmoeCodeResponse");
const AmoeCreditedPushType = mustLookup("megaman.AmoeCreditedPush");
const AmoeInvalidPushType = mustLookup("megaman.AmoeInvalidPush");

export type GenerateAmoeCodeResponseDecoded = {
  entryId?: string;
  sweepstakeCode?: string;
};

export type GenerateAmoeErrorKind =
  | "profile_name"
  | "profile_email"
  | "rate_limit"
  | "quota"
  | "unauthorized"
  | "server"
  | "unknown";

const ERR_FULL_NAME =
  "Please complete your full name before requesting a sweepstake code.";
const ERR_EMAIL =
  "Please set your email before requesting a sweepstake code.";

export function decodeGenerateAmoeCodeResponseBytes(
  data: Uint8Array,
): GenerateAmoeCodeResponseDecoded {
  const msg = GenerateAmoeCodeResponseType.decode(data);
  const obj = GenerateAmoeCodeResponseType.toObject(msg, {
    longs: String,
    defaults: true,
    enums: String,
  }) as {
    entryId?: string | number;
    entry_id?: string | number;
    sweepstakeCode?: string;
    sweepstake_code?: string;
  };

  const entryId = obj.entryId ?? obj.entry_id;
  const sweepstakeCode = obj.sweepstakeCode ?? obj.sweepstake_code;

  return {
    entryId: entryId != null ? String(entryId) : undefined,
    sweepstakeCode: sweepstakeCode?.trim() || undefined,
  };
}

/** Split a sweepstake code into individual display digits/characters. */
export function formatSweepstakeCodeDigits(code: string): string[] {
  return code.trim().split("");
}

export function classifyGenerateAmoeError(
  code: string,
  errMessage?: string,
): GenerateAmoeErrorKind {
  const normalized = String(code ?? "").trim();
  const msg = (errMessage ?? "").trim();

  if (normalized === "400001") {
    if (msg === ERR_FULL_NAME) return "profile_name";
    if (msg === ERR_EMAIL) return "profile_email";
    return "profile_name";
  }
  if (normalized === "429001") return "rate_limit";
  if (normalized === "409001") return "quota";
  if (normalized === "401001") return "unauthorized";
  if (normalized === "500001") return "server";
  return "unknown";
}

export function encodeGenerateAmoeCodeResponseForTest(
  entryId: string | number,
  sweepstakeCode: string,
): Uint8Array {
  const msg = GenerateAmoeCodeResponseType.create({
    entryId: String(entryId),
    sweepstakeCode,
  });
  return GenerateAmoeCodeResponseType.encode(msg).finish();
}

export type AmoeCreditedPushWire = {
  entryId: string;
  /** Proto `scAmount` int64 string：整數 SC 原始單位（見 {@link SC_POINT_SCALE}）。 */
  scAmountWire: string;
  sweepstakeCode: string;
};

export type AmoeInvalidPushWire = {
  entryId: string;
  sweepstakeCode: string;
  exceptionCodes: string;
};

function readWireStringField(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  if (raw !== undefined && raw !== null) return String(raw).trim();
  return "";
}

function readWireInt64Field(raw: unknown): string {
  const t = readWireStringField(raw).replace(/,/g, "");
  if (!/^\d+$/.test(t)) return "";
  try {
    void BigInt(t);
    return t;
  } catch {
    return "";
  }
}

export function decodeAmoeCreditedPushBytes(
  data: Uint8Array,
): AmoeCreditedPushWire | null {
  if (!(data instanceof Uint8Array) || data.byteLength === 0) return null;
  try {
    const msg = AmoeCreditedPushType.decode(data);
    const o = AmoeCreditedPushType.toObject(msg, wireToObjectOpts) as {
      entryId?: string | number;
      entry_id?: string | number;
      scAmount?: string | number;
      sc_amount?: string | number;
      sweepstakeCode?: string;
      sweepstake_code?: string;
    };
    const entryId = readWireInt64Field(o.entryId ?? o.entry_id);
    const scAmountWire = readWireInt64Field(o.scAmount ?? o.sc_amount);
    if (!entryId || !scAmountWire) return null;
    return {
      entryId,
      scAmountWire,
      sweepstakeCode: readWireStringField(
        o.sweepstakeCode ?? o.sweepstake_code,
      ),
    };
  } catch {
    return null;
  }
}

export function decodeAmoeInvalidPushBytes(
  data: Uint8Array,
): AmoeInvalidPushWire | null {
  if (!(data instanceof Uint8Array) || data.byteLength === 0) return null;
  try {
    const msg = AmoeInvalidPushType.decode(data);
    const o = AmoeInvalidPushType.toObject(msg, wireToObjectOpts) as {
      entryId?: string | number;
      entry_id?: string | number;
      sweepstakeCode?: string;
      sweepstake_code?: string;
      exceptionCodes?: string;
      exception_codes?: string;
    };
    const entryId = readWireInt64Field(o.entryId ?? o.entry_id);
    if (!entryId) return null;
    return {
      entryId,
      sweepstakeCode: readWireStringField(
        o.sweepstakeCode ?? o.sweepstake_code,
      ),
      exceptionCodes: readWireStringField(
        o.exceptionCodes ?? o.exception_codes,
      ),
    };
  } catch {
    return null;
  }
}

function formatAmoeSweepstakeCodeClause(code: string): string {
  const t = code.trim();
  return t ? ` (code: ${t})` : "";
}

/** Toast copy for AMOE_CREDITED_PUSH (1085). */
export function formatAmoeCreditedPushToast(push: AmoeCreditedPushWire): string {
  const sc = formatScFromRawWireInteger(push.scAmountWire);
  const codeClause = formatAmoeSweepstakeCodeClause(push.sweepstakeCode);
  return `Your AMOE entry${codeClause} was approved. ${sc} SC has been credited.`;
}

/** Toast copy for AMOE_INVALID_PUSH (1086). */
export function formatAmoeInvalidPushToast(push: AmoeInvalidPushWire): string {
  const codeClause = formatAmoeSweepstakeCodeClause(push.sweepstakeCode);
  return `Your AMOE entry${codeClause} was not approved. Please review the Sweepstakes Rules and try again with a new Mail-In Request Code.`;
}

export function encodeAmoeCreditedPushForTest(
  entryId: string | number,
  scAmountWire: string | number,
  sweepstakeCode: string,
): Uint8Array {
  const msg = AmoeCreditedPushType.create({
    entryId: String(entryId),
    scAmount: String(scAmountWire),
    sweepstakeCode,
  });
  return AmoeCreditedPushType.encode(msg).finish();
}

export function encodeAmoeInvalidPushForTest(
  entryId: string | number,
  sweepstakeCode: string,
  exceptionCodes = "",
): Uint8Array {
  const msg = AmoeInvalidPushType.create({
    entryId: String(entryId),
    sweepstakeCode,
    exceptionCodes,
  });
  return AmoeInvalidPushType.encode(msg).finish();
}
