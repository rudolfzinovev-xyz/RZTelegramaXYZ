import * as nacl from "tweetnacl";
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util";

// Encoding helpers
export const b64encode = encodeBase64;
export const b64decode = decodeBase64;
export const utf8encode = decodeUTF8;   // string → Uint8Array
export const utf8decode = encodeUTF8;   // Uint8Array → string

const PBKDF2_ITERATIONS = 150_000;

// Derive a 32-byte key from password using PBKDF2-SHA256 (Web Crypto).
export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const baseKey = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    256,
  );
  return new Uint8Array(bits);
}

// Generate new X25519 keypair.
export function generateKeyPair() {
  return nacl.box.keyPair();
}

// Encrypt privkey with password-derived key. Used at registration.
export async function encryptPrivateKey(privateKey: Uint8Array, password: string) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(nacl.secretbox.nonceLength));
  const key = await deriveKeyFromPassword(password, salt);
  const ciphertext = nacl.secretbox(privateKey, nonce, key);
  return {
    encryptedPrivateKey: b64encode(ciphertext),
    privateKeyNonce: b64encode(nonce),
    privateKeySalt: b64encode(salt),
  };
}

// Decrypt privkey after login.
export async function decryptPrivateKey(
  encryptedPrivateKey: string,
  privateKeyNonce: string,
  privateKeySalt: string,
  password: string,
): Promise<Uint8Array | null> {
  const key = await deriveKeyFromPassword(password, b64decode(privateKeySalt));
  const plain = nacl.secretbox.open(
    b64decode(encryptedPrivateKey),
    b64decode(privateKeyNonce),
    key,
  );
  return plain;
}

// Encrypt a message for recipient. Returns base64 ciphertext + nonce.
export function encryptMessage(
  plaintext: string,
  recipientPublicKey: string,
  senderPrivateKey: Uint8Array,
): { content: string; nonce: string } {
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(nacl.box.nonceLength));
  const ciphertext = nacl.box(
    utf8encode(plaintext),
    nonce,
    b64decode(recipientPublicKey),
    senderPrivateKey,
  );
  return { content: b64encode(ciphertext), nonce: b64encode(nonce) };
}

// Decrypt an incoming message from peer.
export function decryptMessage(
  ciphertext: string,
  nonce: string,
  peerPublicKey: string,
  myPrivateKey: Uint8Array,
): string | null {
  const plain = nacl.box.open(
    b64decode(ciphertext),
    b64decode(nonce),
    b64decode(peerPublicKey),
    myPrivateKey,
  );
  return plain ? utf8decode(plain) : null;
}

// sessionStorage helpers — private key lives only in-memory-per-tab.
const SESSION_PRIVKEY_KEY = "rz:privkey";

export function storePrivateKey(privateKey: Uint8Array) {
  sessionStorage.setItem(SESSION_PRIVKEY_KEY, b64encode(privateKey));
}

export function loadPrivateKey(): Uint8Array | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_PRIVKEY_KEY);
  return raw ? b64decode(raw) : null;
}

export function clearPrivateKey() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_PRIVKEY_KEY);
}
