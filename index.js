import process from 'process';
import { Buffer } from 'buffer';
import { getOctokit } from '@actions/github';
import jwt from 'jsonwebtoken';
import * as core from '@actions/core';
import { getInstallationId } from './lib/github-application.js';

/**
 * Test if the data is a valid RSA private key, decode it if it's base64 encoded and return the key
 * @param {string} data RSA private key in PEM format or base64 encoded
 * @returns {string} RSA private key (decoded if data is base64 encoded)
 * @throws {Error} If the data is not a valid RSA private key
 * @example const privateKey = decodePrivateKey('LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ==');
 */
export function decodePrivateKey(data) {
  /**
   * @param {string} data
   **/
  if (!data) {
    const message = 'Invalid RSA private key';
    core.error(message);
    throw new Error(message);
  }

  const privateKey = data.replace(/\\n/g, '\n').trim();
  const decoded = Buffer.from(privateKey, 'base64').toString('ascii');
  try {
    jwt.decode(decoded, { complete: true });
    return decoded;
  } catch (error) {
    return privateKey;
  }
}

/**
 * Convert the raw permissions string to an object
 * @param {string} permissionsRaw The raw permissions string
 * @returns {object} The permissions object
 * @example const permissions = permissionsRawToObj('contents:read,actions:read');
 */
function permissionsRawToObj(permissionsRaw) {
  return permissionsRaw.split(',').reduce((acc, permission) => {
    const [key, value] = permission.split(':');
    acc[key] = value;
    return acc;
  }, {});
}

/**
 * Get the input from the workflow file
 * @returns {object} The input from the workflow file or the environment variables as a fallback
 * @throws {Error} If the required inputs are missing
 */
export function getInput() {
  if (process.env.GITHUB_ACTIONS) {
    const privateKey = core.getInput('application_private_key', { required: true });
    const appId = core.getInput('application_id', { required: true });
    const permissionsRaw = core.getInput('permissions');
    const org = core.getInput('org', { required: false });
    const owner = core.getInput('owner', { required: false });
    const repo = core.getInput('repo', { required: false });
    const baseApiUrl = core.getInput('base_api_url', { required: false });
    const debug = core.getInput('debug', { required: false });
    // convert the string (e.g. "contents:read,actions:read" to an object, e.g. { contents: 'read', actions: 'read' })
    const permissionsInput = permissionsRaw ? permissionsRawToObj(permissionsRaw) : undefined;
    const tokenLifetime = core.getInput('token_lifetime', { required: false }) ?? 600;

    return {
      privateKey,
      appId,
      permissionsInput,
      org,
      owner,
      repo,
      baseApiUrl,
      debug,
      tokenLifetime,
    };
  } else {
    if (!process.env.GITHUB_APPLICATION_PRIVATE_KEY || !process.env.GITHUB_APPLICATION_ID) {
      core.error('Required inputs are missing: privateKey or appId is undefined');
      throw new Error('Required inputs are missing');
    }
    const privateKey = process.env.GITHUB_APPLICATION_PRIVATE_KEY.replace(/\\n/g, '\n');
    const appId = process.env.GITHUB_APPLICATION_ID;
    const org = process.env.GITHUB_APPLICATION_ORG ?? undefined;
    const owner = process.env.GITHUB_APPLICATION_OWNER ?? undefined;
    const repo = process.env.GITHUB_APPLICATION_REPO ?? undefined;
    const baseApiUrl = process.env.GITHUB_APPLICATION_BASE_API_URL ?? undefined;
    const debug = process.env.DEBUG ?? false;
    const permissionsRaw = process.env.GITHUB_APPLICATION_PERMISSIONS ?? undefined;
    const permissionsInput = permissionsRaw ? permissionsRawToObj(permissionsRaw) : undefined;
    const tokenLifetime = process.env.GITHUB_APPLICATION_TOKEN_LIFETIME ?? 600;

    return {
      privateKey,
      appId,
      permissionsInput,
      org,
      owner,
      repo,
      baseApiUrl,
      debug,
      tokenLifetime,
    };
  }
}

/**
 * Main function
 */
export async function run() {
  if (process.env.DEBUG) {
    core.setCommandEcho(true);
  }

  try {
    const { privateKey, appId, permissionsInput } = getInput();
    const permissions = permissionsInput;
    const installationId = await getInstallationId(privateKey, appId);
    const jwtToken = generateJwtToken(privateKey, appId);
    const octokit = getOctokit(jwtToken);

    if (!privateKey || !appId) {
      const message = 'Required inputs are missing: privateKey or appId is undefined';
      core.error(message);
      throw new Error(message);
    }

    // create an installation access token
    const {
      data: { token },
    } = await octokit.rest.apps.createInstallationAccessToken({
      installation_id: installationId,
      permissions,
    });

    // output the permissions actually granted in the token
    const installation = await octokit.rest.apps.getInstallation({
      installation_id: installationId,
    });

    const permissionsGranted = installation.data.permissions;

    // set the Github Actions outputs
    core.startGroup('GitHub App Installation');
    core.setSecret(token);
    core.setSecret(jwtToken);
    core.setSecret(`${installationId}`);
    core.setOutput('token', token);
    core.setOutput('expires_at', new Date().toISOString());
    core.setOutput('permissions_requested', JSON.stringify(permissions));
    core.setOutput('permissions_granted', JSON.stringify(permissionsGranted));
    core.endGroup();
  } catch (error) {
    const message = 'Error getting installation access token';
    core.error(message, error.message);
    console.error(message, error.message);
    core.setFailed(error.message);
  }
}

/**
 * @param {jwt.Secret} privateKey
 * @param {any} appId
 */
export function generateJwtToken(privateKey, appId) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 10 * 60; // JWT expiration time set to 10 minutes
  const payload = { iat, exp, iss: appId };
  try {
    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  } catch (error) {
    const message = 'Error generating JWT token';
    core.error(message, error.message);
    console.error(message, error.message);
    throw new Error(message);
  }
}

// The run function is the entry point for the GitHub Action
run();
