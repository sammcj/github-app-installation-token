import process from 'process';
import { getOctokit } from '@actions/github';
import jwt from 'jsonwebtoken';
import * as core from '@actions/core';
import { getInstallationId } from './lib/github-application.js';

export function getInput() {
  if (process.env.GITHUB_ACTIONS) {
    const privateKey = core.getInput('application_private_key', { required: true });
    const appId = core.getInput('application_id', { required: true });
    const permissionsRaw = core.getInput('permissions');
    // convert the string (e.g. "contents:read,actions:read" to an object, e.g. { contents: 'read', actions: 'read' })
    const permissionsInput = permissionsRaw
      ? permissionsRaw.split(',').reduce((acc, permission) => {
          const [key, value] = permission.split(':');
          acc[key] = value;
          return acc;
        }, {})
      : {};

    return { privateKey, appId, permissionsInput };
  } else {
    if (!process.env.GITHUB_APPLICATION_PRIVATE_KEY || !process.env.GITHUB_APPLICATION_ID) {
      throw new Error('Required inputs are missing');
    }
    const privateKey = process.env.GITHUB_APPLICATION_PRIVATE_KEY.replace(/\\n/g, '\n');
    const appId = process.env.GITHUB_APPLICATION_ID;
    const permissionsRaw = process.env.GITHUB_PERMISSIONS ?? '{}';
    const permissionsInput = permissionsRaw
      ? permissionsRaw.split(',').reduce((acc, permission) => {
          const [key, value] = permission.split(':');
          acc[key] = value;
          return acc;
        }, {})
      : {};
    return { privateKey, appId, permissionsInput };
  }
}

export async function run() {
  try {
    // get the variables from the if/else block
    const { privateKey, appId, permissionsInput } = getInput();

    if (!privateKey || !appId) {
      throw new Error('Required inputs are missing: privateKey or appId is undefined');
    }

    const permissions = permissionsInput;

    // Ensure getInstallationId is correctly awaited and check its result before proceeding
    const installationId = await getInstallationId(privateKey, appId);
    if (!installationId) {
      throw new Error('Failed to retrieve installation ID');
    }
    // console.debug('Retrieved Installation ID:', installationId);

    const jwtToken = generateJwtToken(privateKey, appId);
    const octokit = getOctokit(jwtToken);

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

    core.setSecret(token);
    core.setOutput('token', token);
    core.setOutput('expires_at', new Date().toISOString());
    core.setOutput('permissions_requested', JSON.stringify(permissions));
    core.setOutput('permissions_granted', JSON.stringify(permissionsGranted));
  } catch (error) {
    console.error('Error:', error.message);
    core.setFailed(error.message);
  }
}

export function generateJwtToken(privateKey, appId) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 10 * 60; // JWT expiration time set to 10 minutes
  const payload = { iat, exp, iss: appId };
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

run();
