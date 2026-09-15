// Credential loading for the Fanfou verification toolkit.
//
// SECURITY: nothing secret lives in this repository. Credentials are read from
// environment variables, or from a local fanfou-credentials.json that is
// git-ignored. Use them only to sign requests to *.fanfou.com.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// Local, git-ignored fallback file (override with FANFOU_CREDENTIALS).
export const CREDENTIALS_PATH =
  process.env.FANFOU_CREDENTIALS || path.join(here, "..", "fanfou-credentials.json");

// The Fanfou edge (Tencent Cloud WAF) answers 404 to non-browser User-Agents;
// a desktop browser UA is REQUIRED on every request, even the OAuth handshake.
export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const OAUTH_URLS = {
  requestToken: "https://fanfou.com/oauth/request_token",
  accessToken: "https://fanfou.com/oauth/access_token",
  authorize: "https://fanfou.com/oauth/authorize",
};

function localCredentials() {
  try {
    return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  } catch {
    return {};
  }
}

function pick(envName, local, key) {
  return process.env[envName] || local[key] || "";
}

export function loadCredentials() {
  const local = localCredentials();
  const consumerKey = pick("FANFOU_CONSUMER_KEY", local, "consumerKey");
  const consumerSecret = pick("FANFOU_CONSUMER_SECRET", local, "consumerSecret");
  if (!consumerKey || !consumerSecret) {
    throw new Error(
      "Missing consumer credentials. Set FANFOU_CONSUMER_KEY and FANFOU_CONSUMER_SECRET, " +
        "or write them to " + CREDENTIALS_PATH + " (see SECURITY.md)."
    );
  }
  return { consumerKey, consumerSecret };
}

// Returns null when no user token is configured, so offline scripts can run.
export function loadAccessToken() {
  const local = localCredentials();
  const token = pick("FANFOU_OAUTH_TOKEN", local, "oauthToken");
  const secret = pick("FANFOU_OAUTH_TOKEN_SECRET", local, "oauthTokenSecret");
  if (!token || !secret) return null;
  return { oauth_token: token, oauth_token_secret: secret };
}

export function requireAccessToken() {
  const token = loadAccessToken();
  if (!token) {
    throw new Error("No access token. Run node scripts/login.mjs (see README).");
  }
  return token;
}

// Strips any known credential (raw and percent-encoded) from arbitrary text.
// Fanfou error bodies echo the expected signature base string, which contains
// the consumer key, so always redact before logging.
export function makeRedactor() {
  let key = "";
  let secret = "";
  let token = "";
  let tokenSecret = "";
  try {
    const c = loadCredentials();
    key = c.consumerKey;
    secret = c.consumerSecret;
  } catch {}
  try {
    const t = loadAccessToken();
    if (t) {
      token = t.oauth_token || "";
      tokenSecret = t.oauth_token_secret || "";
    }
  } catch {}
  return (text) => {
    let s = String(text);
    for (const [value, label] of [
      [key, "<CONSUMER_KEY_REDACTED>"],
      [secret, "<CONSUMER_SECRET_REDACTED>"],
      [token, "<OAUTH_TOKEN_REDACTED>"],
      [tokenSecret, "<OAUTH_TOKEN_SECRET_REDACTED>"],
    ]) {
      if (!value) continue;
      s = s.split(value).join(label);
      const enc = encodeURIComponent(value);
      if (enc !== value) s = s.split(enc).join(label);
    }
    return s;
  };
}

// Mask a secret for safe logging: never reveal the full value.
export function maskSecret(s) {
  if (!s) return "(none)";
  const str = String(s);
  if (str.length <= 6) return "***(" + str.length + ")";
  return str.slice(0, 2) + "***" + str.slice(-2) + "(" + str.length + ")";
}
