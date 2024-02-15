import jsonwebtoken from 'jsonwebtoken';
import { getOctokit } from '@actions/github';

/**
 * This module provides various utilities for working with GitHub Apps.
 * Not all of the functionality is used in index.js yet, but may be useful in the future.
 */

/**
 * A GitHub Application Token.
 * @param {string} privateKey - The private key for the GitHub App.
 * @param {string} applicationId - The ID of the GitHub App.
 * @optional {number} tokenLifetime - The expiration time for the token, in minutes.
 * @returns {object}
 * @throws {Error} If the token cannot be created.
 */
class GitHubApplicationToken {
  /**
   * @param {any} privateKey
   * @param {any} applicationId
   * @param {number} tokenLifetime in minutes
   */
  constructor(privateKey, applicationId, tokenLifetime) {
    this.privateKey = privateKey;
    this.applicationId = applicationId;
    this.tokenLifetime = tokenLifetime;
  }

  isTokenExpired() {
    const currentTime = Math.floor(Date.now() / 1000);
    return this.tokenExpiration && currentTime >= this.tokenExpiration;
  }

  generateToken() {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expirationTime = issuedAt + this.tokenLifetime;
    const payload = { iat: issuedAt, exp: expirationTime, iss: this.applicationId };

    this.tokenExpiration = expirationTime;
    // console.debug(`Token expiration: ${this.tokenExpiration}`);

    return jsonwebtoken.sign(payload, this.privateKey, { algorithm: 'RS256' });
  }

  toString() {
    return this.generateToken();
  }
}

/**
 * A GitHub API client.
 * @param {string} jwt - The JSON Web Token for the GitHub App.
 * @param {string} baseApiUrl - The base URL for the GitHub API.
 * @returns {object}
 * @throws {Error} If the API client cannot be created.
 */
class GitHubAPIClient {
  constructor(jwt, baseApiUrl) {
    this.octokit = getOctokit(jwt, { baseUrl: baseApiUrl });
  }

  async githubRequest(method, url, options = {}) {
    try {
      const response = await this.octokit.request(`${method} ${url}`, options);
      return response.data;
    } catch (error) {
      console.error(`Error making GitHub API request: ${method} ${url}`, error);
      throw error;
    }
  }
}

/**
 * A GitHub Application.
 * @param {string} privateKey - The private key for the GitHub App.
 * @param {string} applicationId - The ID of the GitHub App.
 * @param {string} baseApiUrl - The base URL for the GitHub API.
 * @optional {object} permissions - The permissions to request.
 * @throws {Error} If the metadata cannot be fetched.
 * @returns {Promise<object>} The Github application object.
 */
export class GitHubApplication {
  /**
   * @param {string} privateKey
   * @param {string} applicationId
   * @param {string} baseApiUrl
   * @optional {string} permissions - The permissions to request.
   */
  constructor(privateKey, applicationId, baseApiUrl, tokenLifetime = 600) {
    this.token = new GitHubApplicationToken(privateKey, applicationId, tokenLifetime);
    this.apiClient = new GitHubAPIClient(this.token.toString(), baseApiUrl);
    this.metadata = null;
  }

  async connect() {
    await this.fetchMetadata();
  }

  /**
   * Fetch metadata for the GitHub App.
   * @throws {Error} If the metadata cannot be fetched.
   * @returns {Promise<object>}
   */
  async fetchMetadata() {
    try {
      const data = await this.apiClient.githubRequest('GET', '/app');
      this.metadata = data;
    } catch (error) {
      console.error('Error fetching GitHub App metadata', error);
      throw error;
    }
  }

  /**
   * Get the installation ID for the given GitHub App.
   * @param {string} appId - The ID of the GitHub App.
   * @returns {Promise<number>} The installation ID.
   * @throws {Error} If the installation ID cannot be found.
   */
  async getAppInstallation(appId) {
    try {
      const data = await this.apiClient.githubRequest('GET', '/app/installations', {
        app_slug: appId,
        mediaType: { previews: ['machine-man'] },
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      return data[0]?.id; // Assuming the first installation is the target
    } catch (error) {
      console.error('Error fetching app installation', error);
      throw error;
    }
  }

  /**
   * Get the installation ID for the given organisation.
   * @param {string} org - The name of the organisation.
   * @returns {Promise<number>} The installation ID.
   * @throws {Error} If the installation ID cannot be found.
   */
  async getOrgInstallation(org) {
    try {
      const data = await this.apiClient.githubRequest('GET', `/orgs/${org}/installation`, {
        mediaType: { previews: ['machine-man'] },
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      return data.id;
    } catch (error) {
      console.error('Error fetching org installation', error);
      throw error;
    }
  }

  /**
   * Get the installation ID for the given user.
   * @param {string} username - The name of the user.
   * @returns {Promise<number>} The installation ID.
   * @throws {Error} If the installation ID cannot be found.
   */
  async getUserInstallation(username) {
    try {
      const data = await this.apiClient.githubRequest('GET', `/users/${username}/installation`, {
        mediaType: { previews: ['machine-man'] },
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      return data.id;
    } catch (error) {
      console.error('Error fetching user installation', error);
      throw error;
    }
  }

  /**
   * Get the installation ID for the given repository.
   * @param {string} owner - The name of the repository owner.
   * @param {string} repo - The name of the repository.
   * @returns {Promise<number>} The installation ID.
   * @throws {Error} If the installation ID cannot be found.
   */
  async getRepositoryInstallation(owner, repo) {
    try {
      const data = await this.apiClient.githubRequest(
        'GET',
        `/repos/${owner}/${repo}/installation`,
        {
          mediaType: {
            previews: ['machine-man'],
          },
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );
      return data.id;
    } catch (error) {
      console.error('Error fetching repository installation', error);
      throw error;
    }
  }

  /**
   * Get an access token for the given installation ID.
   * @param {number} installationId - The ID of the installation.
   * @param {object} permissions - The permissions to request.
   * @returns {Promise<object>} The access token.
   */
  async getInstallationAccessToken(installationId, permissions = {}) {
    try {
      const data = await this.apiClient.githubRequest(
        'POST',
        `/app/installations/${installationId}/access_tokens`,
        {
          permissions,
          mediaType: { previews: ['machine-man'] },
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );
      return data;
    } catch (error) {
      console.error('Error fetching installation access token', error);
      throw error;
    }
  }
}

/**
 * Get the installation ID for the given GitHub App.
 * @param {string} privateKey - The private key for the GitHub App.
 * @param {string} appId - The ID of the GitHub App.
 * @optional {string} owner - The name of the repository owner.
 * @optional {string} repo - The name of the repository.
 * @optional {string} org - The name of the organisation.
 * param {string} org - The name of the organisation.
 */
export async function getInstallationId(privateKey, appId, org = '', owner = '', repo = '') {
  const github = new GitHubApplication(privateKey, appId, 'https://api.github.com');
  await github.connect();
  let installationId;

  if (org !== '') {
    installationId = await github.getOrgInstallation(org);
  } else if (appId && !org) {
    installationId = await github.getAppInstallation(appId);
  } else if (!appId && !org && !repo && owner) {
    installationId = await github.getUserInstallation(owner);
  } else if (!appId && !org && owner && repo) {
    installationId = await github.getRepositoryInstallation(owner, repo);
  } else {
    throw new Error('Insufficient parameters provided to find an installation ID');
  }

  // console.debug('Installation ID:', installationId);
  return installationId;
}
