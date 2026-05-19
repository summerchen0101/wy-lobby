"use strict";

/**
 * Browser-safe stub for @protobufjs/inquire (avoids direct eval in the original).
 * protobufjs/light only uses inquire for optional Node modules (buffer, long, fs);
 * we provide Long via ensureProtobufLong and fall back to Uint8Array for buffers.
 */
function inquire(_moduleName) {
  return null;
}

module.exports = inquire;
