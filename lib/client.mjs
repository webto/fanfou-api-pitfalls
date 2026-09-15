// Shared authenticated Fanfou API client.
//
// SECURITY: signs with credentials read from the environment / a local ignored
// file only. Never log the Authorization header or token values.
import {
  loadCredentials,
  requireAccessToken,
  makeRedactor,
  USER_AGENT,
} from "./config.mjs";
import { buildOAuthHeader } from "./oauth1.mjs";

const redact = makeRedactor();

export const API_BASE = "https://api.fanfou.com";

function tryJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Fanfou builds its expected signature base string with the http:// scheme even
// though the request goes over https:// — a quirk worth remembering. Every call
// here signs against the http:// form.
export async function signedRequest(url, { method = "GET", body, token } = {}) {
  const creds = loadCredentials();
  const at = token ?? requireAccessToken();
  const { header, baseString, signature } = buildOAuthHeader({
    method,
    url,
    signUrl: url.replace(/^https:/, "http:"),
    consumerKey: creds.consumerKey,
    consumerSecret: creds.consumerSecret,
    token: at.oauth_token,
    tokenSecret: at.oauth_token_secret,
  });
  const headers = {
    Authorization: header,
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  return { status: res.status, text, json: tryJson(text), url, baseString, signature };
}

export async function apiGet(pathAndQuery) {
  const url = pathAndQuery.startsWith("http") ? pathAndQuery : API_BASE + pathAndQuery;
  return signedRequest(url, { method: "GET" });
}

export async function apiGetJson(pathAndQuery) {
  const r = await apiGet(pathAndQuery);
  if (r.status !== 200) {
    throw new Error(
      "Fanfou API HTTP " + r.status + " for " + pathAndQuery + ": " + redact(r.text).slice(0, 300)
    );
  }
  return r.json;
}

export { redact };
