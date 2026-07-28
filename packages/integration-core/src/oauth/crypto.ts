import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

let cachedKey: Buffer | null = null;
let warnedDevKey = false;

/**
 * Resolves the 32-byte AES-256 key used to encrypt OAuth tokens at rest.
 * Reads TOKEN_ENCRYPTION_KEY (base64 or hex, 32 bytes decoded). In production
 * this must be set explicitly — we refuse to run with an implicit key so a
 * misconfigured deploy can't silently store tokens under a guessable secret.
 */
function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (raw) {
    const buf = /^[0-9a-fA-F]+$/.test(raw) && raw.length === 64
      ? Buffer.from(raw, 'hex')
      : Buffer.from(raw, 'base64');
    if (buf.length !== 32) {
      throw new Error('TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64 or 64-char hex).');
    }
    cachedKey = buf;
    return cachedKey;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY is required in production to encrypt OAuth integration tokens at rest.'
    );
  }

  if (!warnedDevKey) {
    console.warn(
      '[OAuthManager] TOKEN_ENCRYPTION_KEY not set — deriving an insecure development-only key. ' +
      'Set TOKEN_ENCRYPTION_KEY before storing real OAuth tokens.'
    );
    warnedDevKey = true;
  }
  cachedKey = scryptSync('fricta-dev-only-insecure-key', 'fricta-dev-salt', 32);
  return cachedKey;
}

/** Encrypts a token for storage. Returns `iv:authTag:ciphertext`, all base64. */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
}

/** Decrypts a token produced by {@link encryptToken}. */
export function decryptToken(encoded: string): string {
  const [ivB64, tagB64, dataB64] = encoded.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed encrypted token payload.');
  }
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
