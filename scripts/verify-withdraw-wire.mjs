/**
 * 驗證 megaman.CreateWithdrawOrderReq：新第三方僅 userID + amount + callback URLs。
 *
 * 執行：npm run verify:withdraw-wire（於 web/）
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import protobuf from "protobufjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const protoPath = join(__dirname, "../proto/lobby_wire.proto");
const protoText = readFileSync(protoPath, "utf8");
const parsed = protobuf.parse(protoText);
const root = parsed.root;

const Req = root.lookupType("megaman.CreateWithdrawOrderReq");
const Resp = root.lookupType("megaman.CreateWithdrawOrderResp");

function assert(cond, msg) {
  if (!cond) {
    console.error(msg);
    process.exit(1);
  }
}

function roundTripReq(name, payload) {
  const err = Req.verify(payload);
  assert(!err, `verify ${name}: ${err}`);
  const encoded = Req.encode(Req.create(payload)).finish();
  const decoded = Req.decode(encoded);
  const o = Req.toObject(decoded, {
    longs: String,
    defaults: true,
    enums: String,
  });
  assert(String(o.userID) === String(payload.userID), `${name}: userID mismatch`);
  assert(String(o.amount) === String(payload.amount), `${name}: amount mismatch`);
  assert(Number(o.paymentType) === 0, `${name}: expected paymentType 0`);
  console.log(`ok ${name}`);
}

roundTripReq("minimal", {
  userID: 99,
  amount: "500000",
  paymentType: 0,
  successUrl: "https://example.com/redeem/callback?state=1",
  failUrl: "https://example.com/redeem/callback?state=2",
});

const respErr = Resp.verify({
  withdrawOrderUID: "order-123",
  paymentURL: "https://pay.example.com/session/abc",
});
assert(!respErr, `verify resp: ${respErr}`);
const respEncoded = Resp.encode(
  Resp.create({
    withdrawOrderUID: "order-123",
    paymentURL: "https://pay.example.com/session/abc",
  }),
).finish();
const respDecoded = Resp.toObject(Resp.decode(respEncoded), {
  longs: String,
  defaults: true,
  enums: String,
});
assert(
  respDecoded.paymentURL === "https://pay.example.com/session/abc",
  "resp paymentURL mismatch",
);
console.log("ok CreateWithdrawOrderResp paymentURL");

console.log("verify-withdraw-wire: all checks passed.");
