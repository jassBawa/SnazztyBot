"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/encryption.ts
var encryption_exports = {};
__export(encryption_exports, {
  decrypt: () => decrypt,
  decryptSecretKey: () => decryptSecretKey,
  encrypt: () => encrypt,
  encryptSecretKey: () => encryptSecretKey
});
module.exports = __toCommonJS(encryption_exports);
var crypto = __toESM(require("crypto"));
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 16;
var SALT_LENGTH = 64;
var TAG_LENGTH = 16;
var KEY_LENGTH = 32;
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY must be set in environment and be at least 32 characters");
  }
  return key;
}
function deriveKey(salt) {
  const masterKey = getEncryptionKey();
  return crypto.pbkdf2Sync(masterKey, salt, 1e5, KEY_LENGTH, "sha256");
}
function encrypt(data) {
  const text = typeof data === "string" ? data : Buffer.from(data).toString("hex");
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString("base64");
}
function decrypt(encryptedData) {
  const combined = Buffer.from(encryptedData, "base64");
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
function encryptSecretKey(secretKey) {
  return encrypt(secretKey);
}
function decryptSecretKey(encryptedKey) {
  const decrypted = decrypt(encryptedKey);
  const bytes = Buffer.from(decrypted, "hex");
  return new Uint8Array(bytes);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  decrypt,
  decryptSecretKey,
  encrypt,
  encryptSecretKey
});
