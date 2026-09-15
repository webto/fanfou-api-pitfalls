#!/usr/bin/env node
// OAuth 1.0a login with the out-of-band (PIN) flow.
//
//   node scripts/login.mjs
//
// Writes the access token to fanfou-credentials.json (mode 600, git-ignored)
// and to fanfou-credentials.env, and prints only masked values.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { loadCredentials, OAUTH_URLS, USER_AGENT, CREDENTIALS_PATH, makeRedactor, maskSecret } from "../lib/config.mjs";
import { buildOAuthHeader, parseFormBody } from "../lib/oauth1.mjs";

const creds = loadCredentials();
const redact = makeRedactor();

async function oauthGet(url, { token, tokenSecret } = {}) {
  const { header } = buildOAuthHeader({
    method: "GET",
    url,
    signUrl: url.replace(/^https:/, "http:"),
    consumerKey: creds.consumerKey,
    consumerSecret: creds.consumerSecret,
    token,
    tokenSecret,
  });
  const res = await fetch(url, {
    headers: { Authorization: header, "User-Agent": USER_AGENT, Accept: "*/*" },
  });
  return { status: res.status, text: await res.text() };
}

let rt = await oauthGet(OAUTH_URLS.requestToken + "?oauth_callback=oob");
if (rt.status !== 200) {
  console.error("request_token failed: HTTP " + rt.status + " " + redact(rt.text).slice(0, 300));
  process.exit(1);
}
const req = parseFormBody(rt.text);
console.log("1) open this URL, authorize, and copy the PIN:");
console.log("   " + OAUTH_URLS.authorize + "?oauth_token=" + encodeURIComponent(req.oauth_token));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const pin = await new Promise((resolve) => rl.question("2) PIN: ", resolve));
rl.close();

const at = await oauthGet(
  OAUTH_URLS.accessToken + "?oauth_verifier=" + encodeURIComponent(pin.trim()),
  { token: req.oauth_token, tokenSecret: req.oauth_token_secret }
);
if (at.status !== 200) {
  console.error("access_token failed: HTTP " + at.status + " " + redact(at.text).slice(0, 300));
  process.exit(1);
}
const tok = parseFormBody(at.text);

let existing = {};
try { existing = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8")); } catch {}
const merged = {
  ...existing,
  oauthToken: tok.oauth_token,
  oauthTokenSecret: tok.oauth_token_secret,
  userId: tok.user_id,
  screenName: tok.screen_name,
};
fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(merged, null, 2), { mode: 0o600 });

const envPath = path.join(path.dirname(CREDENTIALS_PATH), "fanfou-credentials.env");
fs.writeFileSync(
  envPath,
  "export FANFOU_OAUTH_TOKEN=" + tok.oauth_token + "\n" +
    "export FANFOU_OAUTH_TOKEN_SECRET=" + tok.oauth_token_secret + "\n",
  { mode: 0o600 }
);

console.log("3) saved (git-ignored, mode 600):");
console.log("   " + CREDENTIALS_PATH + "  -> token " + maskSecret(tok.oauth_token));
console.log("   " + envPath + "  -> source it:  source " + path.basename(envPath));
console.log("   (consumer key/secret still come from FANFOU_CONSUMER_KEY/SECRET)");
