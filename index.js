import process from 'process';
import jwt from 'jsonwebtoken';
import * as core from '@actions/core';
import { getOctokit } from '@actions/github';

/**
 * Retrieves input from GitHub Actions environment or from the environment variables.
 * @returns {Object} The necessary inputs for running the action: privateKey, permissionsInput.
 */
function getInput() {
  const env = process.env;
  const isGithubActions = env.GITHUB_ACTIONS;

  const privateKey = (
    isGithubActions
      ? core.getInput('application_private_key', { required: true })
      : env.GITHUB_APPLICATION_PRIVATE_KEY
  )?.replace(/\\n/g, '\n');
  const appId = isGithubActions
    ? core.getInput('application_id', { required: true })
    : env.GITHUB_APPLICATION_ID;
  const permissionsRaw = isGithubActions
    ? core.getInput('permissions')
    : env.GITHUB_PERMISSIONS ?? '{}';

  if (!privateKey || !appId) {
    throw new Error('Required inputs are missing');
  }

  const permissionsInput = permissionsRaw.split(',').reduce((acc, permission) => {
    const [key, value] = permission.split(':');
    acc[key] = value;
    return acc;
  }, {});

  return { privateKey, permissionsInput };
}

/**
 * Generates a JWT token for GitHub App authentication.
 * @param {string} privateKey The private key of the GitHub App.
 * @returns {Promise<string>} A JWT token.
 */
async function generateJwtToken(privateKey) {
  const appId = process.env.GITHUB_APP_ID || core.getInput('application_id', { required: true });
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 10 * 60; // JWT expiration time set to 10 minutes
  const payload = {
    iat,
    exp,
    iss: appId,
  };
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

/**
 * Main function to run the GitHub Action.
 */
export async function run() {
  try {
    const { privateKey, permissionsInput } = getInput();
    const jwtToken = await generateJwtToken(privateKey);
    const octokit = getOctokit(jwtToken);

    const installationId = await getInstallationId(octokit);
    if (!installationId) {
      throw new Error('Failed to retrieve installation ID');
    }

    const tokenResponse = await octokit.rest.apps.createInstallationAccessToken({
      installation_id: installationId,
      permissions: permissionsInput,
    });

    const token = tokenResponse.data.token;
    const permissionsGranted = (
      await octokit.rest.apps.getInstallation({
        installation_id: installationId,
      })
    ).data.permissions;

    core.setSecret(token);
    core.setOutput('token', token);
    core.setOutput('expires_at', tokenResponse.data.expires_at);
    core.setOutput('permissions_requested', JSON.stringify(permissionsInput));
    core.setOutput('permissions_granted', JSON.stringify(permissionsGranted));
  } catch (error) {
    console.error('Error:', error.message);
    core.setFailed(error.message);
  }
}

/**
 * Retrieves the installation ID for the GitHub App.
 * @param {Object} octokit The Octokit instance.
 * @returns {Promise<number>} The installation ID.
 */
async function getInstallationId(octokit) {
  const { data } = await octokit.rest.apps.getAuthenticated();
  return data.id;
}

run();
