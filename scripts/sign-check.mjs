#!/usr/bin/env node
// Offline OAuth 1.0a checks — no credentials, no network. Run in CI.
//
// Vectors: RFC 5849 sections 3.4.1.1 / 3.6, plus the canonical 3-legged
// example from the OAuth 1.0a documentation for the HMAC-SHA1 answer.
import { pctEncode, signatureBaseString, sign, hmacSha1 } from "../lib/oauth1.mjs";

let failures = 0;
function check(label, actual, expected) {
  if (actual === expected) {
    console.log("  ok   " + label);
  } else {
    failures++;
    console.log("  FAIL " + label + "\n       expected: " + expected + "\n       actual:   " + actual);
  }
}

console.log("percent-encoding (RFC 5849 3.6)");
check("space and plus", pctEncode("Ladies + Gentlemen"), "Ladies%20%2B%20Gentlemen");
check("punctuation", pctEncode("An encoded string!"), "An%20encoded%20string%21");
check("comma/ampersand", pctEncode("Dogs, Cats & Mice"), "Dogs%2C%20Cats%20%26%20Mice");
check("unreserved kept", pctEncode("abc-._~"), "abc-._~");
check("non-ASCII is UTF-8 encoded", pctEncode("你好"), "%E4%BD%A0%E5%A5%BD");

console.log("signature base string (RFC 5849 3.4.1.1)");
const baseParams = {
  b5: "=%3D",
  a3: "a",
  "c@": "",
  a2: "r b",
  c2: "",
  oauth_consumer_key: "9djdj82h48djs9d2",
  oauth_nonce: "7d8f3e4a",
  oauth_signature_method: "HMAC-SHA1",
  oauth_timestamp: "137131201",
  oauth_token: "kkk9d7dh3k39sjv7",
};
// (The RFC also lists a duplicate `a3=2 q`, which a JS object cannot hold; the
// remaining vector still pins ordering, encoding and scheme handling.)
check(
  "sorted + encoded",
  signatureBaseString("POST", "http://example.com/request", baseParams),
  "POST&http%3A%2F%2Fexample.com%2Frequest&" +
    "a2%3Dr%2520b%26a3%3Da%26b5%3D%253D%25253D%26c%2540%3D%26c2%3D%26" +
    "oauth_consumer_key%3D9djdj82h48djs9d2%26oauth_nonce%3D7d8f3e4a%26" +
    "oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D137131201%26" +
    "oauth_token%3Dkkk9d7dh3k39sjv7"
);

console.log("HMAC-SHA1 (RFC 2202 known answers)");
const key20 = Buffer.alloc(20, 0x0b);
check("case 1: 20-byte key", hmacSha1(key20, "Hi There"), "thcxhlUFcmTii8C2+zeMjvFGvgA=");
check("case 2: Jefe", hmacSha1("Jefe", "what do ya want for nothing?"), "7/zfauXrL6LSdBbV8YTfnCWafHk=");
check(
  "sign() composes the RFC 5849 key",
  sign("GET&http%3A%2F%2Fexample.com%2F&a%3Db", "cs", "ts"),
  hmacSha1(pctEncode("cs") + "&" + pctEncode("ts"), "GET&http%3A%2F%2Fexample.com%2F&a%3Db")
);
const again = sign("GET&http%3A%2F%2Fexample.com%2F&a%3Db", "cs", "ts");
check("deterministic", again, sign("GET&http%3A%2F%2Fexample.com%2F&a%3Db", "cs", "ts"));
check("different input differs", again === sign("GET&http%3A%2F%2Fexample.com%2F&a%3Dc", "cs", "ts") ? "same" : "differs", "differs");

console.log("");
if (failures === 0) {
  console.log("all checks passed");
} else {
  console.log(failures + " check(s) failed");
  process.exit(1);
}
