import * as protobuf from "protobufjs/light.js";
import schema from "../gen/lobby_wire.schema.js";

const root = protobuf.Root.fromJSON(schema as protobuf.INamespace);

function mustLookup(name: string): protobuf.Type {
  const t = root.lookup(name);
  if (!t || !(t instanceof protobuf.Type)) {
    throw new Error(`lobby wire: missing message type ${name}`);
  }
  return t;
}

const GenerateAmoeCodeResponseType = mustLookup("megaman.GenerateAmoeCodeResponse");

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
