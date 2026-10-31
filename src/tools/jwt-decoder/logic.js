/**
 * JWT Decoder Core Logic
 * Pure, DOM-free decoding of JSON Web Tokens (RFC 7519) and local HMAC signature
 * checks (HS256/HS384/HS512) with the Web Crypto API. Nothing is sent or stored.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.JwtLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const HMAC = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };
  const TIME_CLAIMS = ['iat', 'nbf', 'exp'];
  const MAX_TOKEN = 100000;

  /** Base64URL (RFC 4648 §5) to bytes; returns null for invalid input. */
  function base64UrlToBytes(part) {
    if (!/^[A-Za-z0-9_-]*$/.test(part)) return null;
    if (part.length % 4 === 1) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4);
    let binary;
    try {
      binary = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    } catch (e) {
      return null;
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function bytesToBase64Url(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeJsonPart(part, label) {
    const bytes = base64UrlToBytes(part);
    if (!bytes) return { error: `The ${label} is not valid Base64URL.` };
    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (e) {
      return { error: `The ${label} is not valid UTF-8 text.` };
    }
    try {
      const json = JSON.parse(text);
      if (json === null || typeof json !== 'object' || Array.isArray(json)) return { error: `The ${label} must be a JSON object.` };
      return { json, text };
    } catch (e) {
      return { error: `The ${label} is not valid JSON.` };
    }
  }

  function describeTime(value, nowMs) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return { valid: false, value };
    const ms = value * 1000;
    if (Math.abs(ms) > 8.64e15) return { valid: false, value };
    const iso = new Date(ms).toISOString().replace('.000Z', 'Z');
    return { valid: true, value, ms, iso, inPast: ms <= nowMs };
  }

  /**
   * Decodes a compact JWS (header.payload.signature). Does NOT verify the signature.
   * @param {string} token
   * @param {Object} options - { now: ms } for testing
   */
  function decode(token, options = {}) {
    const raw = String(token === undefined || token === null ? '' : token).trim().replace(/^Bearer\s+/i, '');
    if (!raw) return { error: 'Paste a JSON Web Token (three parts separated by dots).' };
    if (raw.length > MAX_TOKEN) return { error: 'That token is too long to decode here.' };
    if (/\s/.test(raw)) return { error: 'A JWT cannot contain spaces or line breaks. Copy the token again without them.' };
    const parts = raw.split('.');
    if (parts.length === 5) return { error: 'This looks like an encrypted JWT (JWE, five parts). Its payload cannot be read without the decryption key.' };
    if (parts.length !== 3) {
      return { error: `A JWT has three parts separated by dots (header.payload.signature), but this one has ${parts.length}.` };
    }

    const header = decodeJsonPart(parts[0], 'header');
    if (header.error) return header;
    const payload = decodeJsonPart(parts[1], 'payload');
    if (payload.error) return payload;
    if (parts[2] && !base64UrlToBytes(parts[2])) return { error: 'The signature is not valid Base64URL.' };

    const now = options.now === undefined ? Date.now() : options.now;
    const times = {};
    TIME_CLAIMS.forEach(name => {
      if (name in payload.json) times[name] = describeTime(payload.json[name], now);
    });

    let status = 'no-exp';
    if (times.nbf && times.nbf.valid && times.nbf.ms > now) status = 'not-yet-valid';
    else if (times.exp && times.exp.valid) status = times.exp.ms <= now ? 'expired' : 'valid-time';

    const alg = typeof header.json.alg === 'string' ? header.json.alg : '';
    return {
      header: header.json,
      payload: payload.json,
      headerJson: JSON.stringify(header.json, null, 2),
      payloadJson: JSON.stringify(payload.json, null, 2),
      signature: parts[2],
      alg,
      unsigned: alg.toLowerCase() === 'none' || parts[2] === '',
      canVerifyHmac: Object.prototype.hasOwnProperty.call(HMAC, alg),
      times,
      status,
      expiresInMs: times.exp && times.exp.valid ? times.exp.ms - now : null,
      parts
    };
  }

  function getSubtle() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) return globalThis.crypto.subtle;
    throw new Error('Signature checks need the Web Crypto API, which this browser does not provide.');
  }

  /**
   * Checks an HS256/HS384/HS512 signature with a shared secret, locally.
   * @param {string} token
   * @param {string} secret
   * @param {Object} options - { secretEncoding: 'utf8' | 'base64url' }
   * @returns {Promise<{valid:boolean, alg:string}|{error:string}>}
   */
  async function verifyHmac(token, secret, options = {}) {
    const decoded = decode(token, { now: 0 });
    if (decoded.error) return decoded;
    const hash = HMAC[decoded.alg];
    if (!hash) return { error: `This token uses ${decoded.alg || 'no algorithm'}. Only HS256, HS384 and HS512 (shared-secret) signatures can be checked here.` };
    if (secret === undefined || secret === null || secret === '') return { error: 'Enter the secret to check the signature.' };

    let keyBytes;
    if (options.secretEncoding === 'base64url') {
      keyBytes = base64UrlToBytes(String(secret).trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
      if (!keyBytes) return { error: 'The secret is not valid Base64 / Base64URL.' };
    } else {
      keyBytes = new TextEncoder().encode(String(secret));
    }
    const sigBytes = base64UrlToBytes(decoded.signature);
    if (!sigBytes || !sigBytes.length) return { error: 'The token has no signature to check.' };

    const subtle = getSubtle();
    const key = await subtle.importKey('raw', keyBytes, { name: 'HMAC', hash }, false, ['verify']);
    const data = new TextEncoder().encode(`${decoded.parts[0]}.${decoded.parts[1]}`);
    // crypto.subtle.verify compares in constant time
    const valid = await subtle.verify('HMAC', key, sigBytes, data);
    return { valid, alg: decoded.alg };
  }

  return { HMAC, base64UrlToBytes, bytesToBase64Url, decode, verifyHmac };
});
