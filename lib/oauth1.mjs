// Minimal, dependency-free OAuth 1.0a (HMAC-SHA1) implementation.
// Fanfou only supports HMAC-SHA1 and rejects plaintext signatures.
import crypto from 'node:crypto';

// RFC 5849 percent-encoding. encodeURIComponent is close, but RFC 5849 also
// requires escaping ! * ' ( ) which encodeURIComponent leaves alone.
export function pctEncode(value) {
  return encodeURIComponent(String(value)).replace(/[!*'()]/g, (c) =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

export function makeNonce(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

// Build the OAuth 1.0a signature base string per RFC 5849 section 3.4.1.1.
// `requestParams` must contain every protocol + request parameter that is
// included in the signature (oauth_* plus query/form params).
export function signatureBaseString(method, baseUrl, requestParams) {
  const normalized = Object.entries(requestParams)
    .map(([k, v]) => [pctEncode(k), pctEncode(v)])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => k + '=' + v)
    .join('&');
  return [method.toUpperCase(), pctEncode(baseUrl), pctEncode(normalized)].join('&');
}

// Raw HMAC-SHA1 (base64). Exposed so the RFC 2202 vectors can be verified
// directly, and so `sign` has a single implementation.
export function hmacSha1(key, data) {
  return crypto.createHmac('sha1', key).update(data, 'utf8').digest('base64');
}

// HMAC-SHA1 signing key is percentEncode(consumerSecret) + '&' + percentEncode(tokenSecret).
export function sign(baseString, consumerSecret, tokenSecret = '') {
  const key = pctEncode(consumerSecret) + '&' + pctEncode(tokenSecret);
  return hmacSha1(key, baseString);
}

/**
 * Build an OAuth Authorization header for a GET/POST request.
 * @returns {{header: string, baseString: string, signature: string, oauthParams: object}}
 */
export function buildOAuthHeader(opts) {
  const { method, url, consumerKey, consumerSecret, token = '', tokenSecret = '', extra = {}, nonce, timestamp } = opts;
  const u = new URL(url);
  // Fanfou always builds its expected base string with the http:// scheme,
  // even when the request itself is made over https://. Callers pass signUrl.
  const signU = opts.signUrl ? new URL(opts.signUrl) : u;
  const baseUrl = signU.origin + signU.pathname;

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce ?? makeNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(timestamp ?? Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
    ...extra,
  };
  if (token) oauthParams.oauth_token = token;

  // Params that participate in the signature: oauth_* (header) + query string.
  const requestParams = { ...oauthParams };
  for (const [k, v] of u.searchParams) requestParams[k] = v;

  const baseString = signatureBaseString(method, baseUrl, requestParams);
  const signature = sign(baseString, consumerSecret, tokenSecret);
  oauthParams.oauth_signature = signature;

  const header =
    'OAuth ' +
    Object.keys(oauthParams)
      .sort()
      .map((k) => pctEncode(k) + '="' + pctEncode(oauthParams[k]) + '"')
      .join(', ');

  return { header, baseString, signature, oauthParams };
}

export function parseFormBody(text) {
  return Object.fromEntries(new URLSearchParams(text));
}
