import jsonwebtoken from 'jsonwebtoken';
import { getOctokit } from '@actions/github';

/**
 * Manages GitHub Application token generation and lifecycle.
 */
class GitHubApplicationToken {
  /**
   * Constructs a GitHubApplicationToken instance.
   * @param {string} privateKey The private key for the GitHub application.
   * @param {string} applicationId The ID of the GitHub application.
   */
  constructor(privateKey, applicationId) {
    this.privateKey = privateKey;
    this.applicationId = applicationId;
    this.token = null;
    this.tokenExpiration = null;
  }

  /**
   * Generates a new token if the current token is expired or not yet created.
   */
  generateTokenIfNeeded() {
    const currentTime = Math.floor(Date.now() / 1000);
    if (!this.tokenExpiration || currentTime >= this.tokenExpiration) {
      const issuedAt = currentTime;
      const expirationTime = issuedAt + 600; // Token valid for 10 minutes
      const payload = { iat: issuedAt, exp: expirationTime, iss: this.applicationId };
      this.token = jsonwebtoken.sign(payload, this.privateKey, { algorithm: 'RS256' });
      this.tokenExpiration = expirationTime;
    }
  }

  /**
   * Returns the current token, generating a new one if necessary.
   * @returns {string} The GitHub application token.
   */
  getToken() {
    this.generateTokenIfNeeded();
    return this.token ?? '';
  }
}

/**
 * A client for making authenticated requests to the GitHub API.
 */
class GitHubAPIClient {
  /**
   * Constructs a GitHubAPIClient instance.
   * @param {string} privateKey The private key for the GitHub application.
   * @param {string} applicationId The ID of the GitHub application.
   * @param {string} baseApiUrl The base URL for the GitHub API.
   */
  constructor(privateKey, applicationId, baseApiUrl = 'https://api.github.com') {
    this.tokenManager = new GitHubApplicationToken(privateKey, applicationId);
    const token = this.tokenManager.getToken() || ''; // Ensure token is a string, default to empty string if null
    this.octokit = getOctokit(token, { baseUrl: baseApiUrl });
  }

  /**
   * Makes a request to the GitHub API.
   * @param {string} method The HTTP method to use for the request.
   * @param {string} url The URL path for the request.
   * @param {Object} options Additional options for the request.
   * @returns {Promise<Object>} The response data from the GitHub API.
   * @throws {Error} Throws an error if the GitHub API request fails.
   */
  async githubRequest(method, url, options = {}) {
    try {
      const response = await this.octokit.request(`${method} ${url}`, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${this.tokenManager.getToken()}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`GitHub API request failed: ${method} ${url}`, error);
      throw new Error(`GitHub API request failed: ${method} ${url} - ${error.message}`);
    }
  }
}

/**
 * Represents a GitHub Application and provides methods to interact with the GitHub API.
 */
export class GitHubApplication {
  /**
   * Constructs a GitHubApplication instance.
   * @param {string} privateKey The private key for the GitHub application.
   * @param {string} applicationId The ID of the GitHub application.
   */
  constructor(privateKey, applicationId) {
    this.apiClient = new GitHubAPIClient(privateKey, applicationId);
  }

  /**
   * Example method to demonstrate connecting to GitHub.
   * @returns {Promise<void>} Resolves when connection and metadata fetch are successful.
   */
  async connect() {
    try {
      await this.fetchMetadata(); // Assuming this method exists and fetches necessary metadata
      console.log('Successfully connected and fetched metadata');
    } catch (error) {
      console.error('Failed to connect or fetch metadata', error);
      throw error; // Rethrow or handle error as needed
    }
  }

  /**
   * Fetches metadata for the GitHub application.
   * @returns {Promise<Object>} The metadata for the GitHub application.
   */
  async fetchMetadata() {
    return this.apiClient.githubRequest('GET', '/app');
  }

  /**
   * Gets the installation for a specific application.
   * @param {string} appId The ID of the application.
   * @returns {Promise<Object>} The installation details.
   */
  async getAppInstallation(appId) {
    return this.apiClient.githubRequest('GET', '/app/installations', { app_slug: appId });
  }

  /**
   * Gets the organization installation details.
   * @param {string} org The organization name.
   * @returns {Promise<Object>} The installation details.
   */
  async getOrgInstallation(org) {
    return this.apiClient.githubRequest('GET', `/orgs/${org}/installation`);
  }

  /**
   * Gets the user installation details.
   * @param {string} username The GitHub username.
   * @returns {Promise<Object>} The installation details.
   */
  async getUserInstallation(username) {
    return this.apiClient.githubRequest('GET', `/users/${username}/installation`);
  }

  /**
   * Gets the repository installation details.
   * @param {string} owner The owner of the repository.
   * @param {string} repo The repository name.
   * @returns {Promise<Object>} The installation details.
   */
  async getRepositoryInstallation(owner, repo) {
    return this.apiClient.githubRequest('GET', `/repos/${owner}/${repo}/installation`);
  }

  /**
   * Gets an installation access token for a specific installation.
   * @param {number} installationId The ID of the installation.
   * @param {Object} permissions The permissions to request for the token.
   * @returns {Promise<Object>} The access token details.
   */
  async getInstallationAccessToken(installationId, permissions = {}) {
    return this.apiClient.githubRequest(
      'POST',
      `/app/installations/${installationId}/access_tokens`,
      { permissions },
    );
  }
}

/**
 * Retrieves the GitHub installation ID based on provided parameters.
 * @param {string} privateKey The private key for the GitHub application.
 * @param {string} appId The ID of the GitHub application.
 * param {string} org The organization name, if applicable.
 * param {string} owner The repository owner name, if applicable.
 * param {string} repo The repository name, if applicable.
 * @returns {Promise<number|null>} The installation ID or null if not found.
 * @throws {Error} Throws an error if insufficient parameters are provided.
 */
export async function getInstallationId(privateKey, appId, org, owner, repo) {
  const github = new GitHubApplication(privateKey, appId);
  let installationId;

  if (org) {
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

  return installationId?.id || null;
}
