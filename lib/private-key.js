import { Buffer } from 'buffer';

export default class PrivateKey {
  /**
   * @param {any} data
   */
  constructor(data) {
    if (isRsaPrivateKey(data)) {
      this._key = data;
    } else {
      const decoded = decodeData(data);
      if (decoded) {
        this._key = decoded;
      } else {
        throw new Error(
          'Unsupported private key data format, need raw key in PEM format or Base64 encoded string.',
        );
      }
    }
  }

  get key() {
    return this._key;
  }
}

/**
 * @param {string} data
 */
function decodeData(data) {
  const decoded = Buffer.from(data, 'base64').toString('ascii');
  if (isRsaPrivateKey(decoded)) {
    return decoded;
  }
  return null;
}

/**
 * @param {string} data
 */
function isRsaPrivateKey(data) {
  const possibleKey = `${data}`.trim();
  return (
    /^-----BEGIN RSA PRIVATE KEY-----/.test(possibleKey) &&
    /-----END RSA PRIVATE KEY-----$/.test(possibleKey)
  );
}
