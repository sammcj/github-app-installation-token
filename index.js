import process from 'process';
import { getOctokit } from '@actions/github';
import jwt from 'jsonwebtoken';
import * as core from '@actions/core';
import { getInstallationId } from './lib/github-application.js';

/**
 * Get the input from the environment or action inputs.
 * @returns {Object} The private key, app ID, and permissions input.
 */
const getInput = () => {
  const environment = process.env.GITHUB_ACTIONS ? 'action' : 'environment';
  const requiredInputsMissing =
    !process.env.GITHUB_APPLICATION_PRIVATE_KEY || !process.env.GITHUB_APPLICATION_ID;
  if (environment === 'environment' && requiredInputsMissing) {
    throw new Error('Required inputs are missing');
  }

  const privateKey = (
    environment === 'action'
      ? core.getInput('application_private_key', { required: true })
      : process.env.GITHUB_APPLICATION_PRIVATE_KEY ?? ''
  ).replace(/\\n/g, '\n');
  const appId =
    environment === 'action'
      ? core.getInput('application_id', { required: true })
      : process.env.GITHUB_APPLICATION_ID;
  const permissionsRaw =
    environment === 'action'
      ? core.getInput('permissions')
      : process.env.GITHUB_PERMISSIONS ?? '{}';
  const permissionsInput = permissionsRaw.split(',').reduce((acc, permission) => {
    const [key, value] = permission.split(':');
    acc[key] = value;
    return acc;
  }, {});

  return { privateKey, appId, permissionsInput };
};

/**
 * Generate a JWT token.
 * @param {string} privateKey - The private key.
 * @param {string} appId - The app ID.
 * @returns {string} The JWT token.
 */
const generateJwtToken = (privateKey, appId) => {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 10 * 60; // JWT expiration time set to 10 minutes
  const payload = { iat, exp, iss: appId };
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
};

/**
 * The main function to run the action.
 * @returns {Promise<void>}
 */
const run = async () => {
  try {
    const { privateKey, appId, permissionsInput } = getInput();
    const installationId = await getInstallationId(privateKey, appId);
    if (!installationId) throw new Error('Failed to retrieve installation ID');

    const jwtToken = generateJwtToken(privateKey, appId);
    const octokit = getOctokit(jwtToken);

    const accessTokenResponse = await octokit.rest.apps.createInstallationAccessToken({
      installation_id: installationId,
      permissions: permissionsInput,
    });

    const permissionsGrantedResponse = await octokit.rest.apps.getInstallation({
      installation_id: installationId,
    });

    core.setSecret(accessTokenResponse.data.token);
    core.setOutput('token', accessTokenResponse.data.token);
    core.setOutput('expires_at', accessTokenResponse.data.expires_at);
    core.setOutput('permissions_requested', JSON.stringify(permissionsInput));
    core.setOutput(
      'permissions_granted',
      JSON.stringify(permissionsGrantedResponse.data.permissions),
    );
  } catch (error) {
    core.setFailed(`Error: ${error.message}`);
  }
};

run();
