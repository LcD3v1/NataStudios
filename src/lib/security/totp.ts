import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * TOTP (RFC 6238) implemented on Node's built-in crypto — no third-party
 * dependency, which keeps the supply-chain surface small.
 *
 * Compatible with Google Authenticator, Authy, 1Password, Microsoft Authenticator.
 */

const STEP_SECONDS = 30;
const DIGITS = 6;
// Accept the adjacent windows to tolerate clock drift (±30s).
const DRIFT_WINDOWS = 1;

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Generate a new base32 secret (160 bits, the RFC 4226 recommendation). */
export function generateTotpSecret(): string {
  const buf = randomBytes(20);
  let bits = '';
  for (const byte of buf) bits += byte.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += B32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = '';
  for (const char of clean) {
    const idx = B32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error('invalid base32 character');
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/** Compute the TOTP code for a given counter (time step). */
function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', key).update(buf).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

/** Current code — used for tests and enrollment confirmation. */
export function generateTotpCode(secret: string, at: number = Date.now()): string {
  return hotp(secret, Math.floor(at / 1000 / STEP_SECONDS));
}

/**
 * Verify a user-supplied code in constant time, allowing ±1 time step of drift.
 */
export function verifyTotp(secret: string, code: string, at: number = Date.now()): boolean {
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.length !== DIGITS) return false;

  const counter = Math.floor(at / 1000 / STEP_SECONDS);
  const supplied = Buffer.from(cleaned);

  let ok = false;
  for (let drift = -DRIFT_WINDOWS; drift <= DRIFT_WINDOWS; drift++) {
    let expected: Buffer;
    try {
      expected = Buffer.from(hotp(secret, counter + drift));
    } catch {
      return false;
    }
    // Constant-time compare; keep looping so timing doesn't reveal which window matched.
    if (expected.length === supplied.length && timingSafeEqual(expected, supplied)) ok = true;
  }
  return ok;
}

/** otpauth:// URI for authenticator apps (QR code or manual entry). */
export function buildOtpAuthUri(secret: string, account: string, issuer = 'NATA STUDIOS'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS)
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
