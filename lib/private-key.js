import { Buffer } from 'buffer';
export default class PrivateKey {
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

function isRsaPrivateKey(data) {
  const possibleKey = `${data}`.trim();
  return (
    /^-----BEGIN RSA PRIVATE KEY-----\n/.test(possibleKey) &&
    /\n-----END RSA PRIVATE KEY-----$/.test(possibleKey)
  );
}

function decodeData(data) {
  try {
    const decoded = Buffer.from(data, 'base64').toString('ascii');
    if (isRsaPrivateKey(decoded)) {
      return decoded;
    }
  } catch {
    // ignore
  }
  return null;
}
