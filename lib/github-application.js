import jsonwebtoken from 'jsonwebtoken';
import { getOctokit } from '@actions/github';

/**
 * @param {string} privateKey
 * @param {string} applicationId
 * @param {string} baseApiUrl
 */
export async function createGitHubApplication(privateKey, applicationId, baseApiUrl) {
  const app = new GitHubApplication(privateKey, applicationId, baseApiUrl);
  await app.connect();
  return app;
}

export class GitHubApplicationToken {
  /**
   * @param {any} privateKey
   * @param {any} applicationId
   */
  constructor(privateKey, applicationId) {
    this.privateKey = privateKey;
    this.applicationId = applicationId;
  }

  generateToken() {
    const payload = {
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now // TODO: make this configurable
      iss: this.applicationId,
    };
    return jsonwebtoken.sign(payload, this.privateKey, { algorithm: 'RS256' });
  }
}

export class GitHubApplicationAPIClient {
  /**
   * @param {string} token
   * @param {any} baseApiUrl
   */
  constructor(token, baseApiUrl) {
    this.octokit = getOctokit(token, { baseUrl: baseApiUrl });
  }

  /**
   * @param {string} method
   * @param {{ mediaType: { previews: string[]; } | { previews: string[]; } | { previews: string[]; } | { previews: string[]; } | { previews: string[]; }; owner?: any; repo?: any; org?: any; installation_id?: any; permissions?: {}; }} url
   */
  async request(method, url, options = {}) {
    try {
      const response = await this.octokit.request(`${method} ${url}`, options);
      return response.data;
    } catch (error) {
      // Enhanced error logging
      console.error(`Failed GitHub API request details: ${method} ${url} with options ${JSON.stringify(options, null, 2)}`);
      throw new Error(`GitHub API request failed: ${method} ${url} - ${error.message}`);
    }
  }
}

export class GitHubApplication {
  /**
   * @param {any} privateKey
   * @param {any} applicationId
   * @param {any} baseApiUrl
   */
  constructor(privateKey, applicationId, baseApiUrl) {
    this.token = new GitHubApplicationToken(privateKey, applicationId);
    this.apiClient = null;
    this.baseApiUrl = baseApiUrl;
    this.metadata = null;
  }

  async connect() {
    const token = this.token.generateToken();
    this.apiClient = new GitHubApplicationAPIClient(token, this.baseApiUrl);
    const data = await this.apiClient.request('GET /app', {
      mediaType: { previews: ['machine-man'] },
    });
    this.metadata = data;
  }

  async getApplicationInstallations() {
    if (!this.apiClient) {
      throw new Error('API client is not initialized.');
    }
    return this.apiClient.request('GET /app/installations', {
      mediaType: { previews: ['machine-man'] },
    });
  }

  /**
   * @param {string} owner
   * @param {string} repo
   */
  async getRepositoryInstallation(owner, repo) {
    if (!this.apiClient) {
      throw new Error('API client is not initialized.');
    }
    return this.apiClient.request('GET /repos/{owner}/{repo}/installation', {
      owner,
      repo,
      mediaType: { previews: ['machine-man'] },
    });
  }

  /**
   * @param {string} org
   */
  async getOrganizationInstallation(org) {
    if (!this.apiClient) {
      throw new Error('API client is not initialized.');
    }
    return this.apiClient.request('GET /orgs/{org}/installation', {
      org,
      mediaType: { previews: ['machine-man'] },
    });
  }

  /**
   * @param {any} installationId
   */
  async getInstallationAccessToken(installationId, permissions = {}) {
    if (!this.apiClient) {
      throw new Error('API client is not initialized.');
    }
    return this.apiClient.request('POST /app/installations/{installation_id}/access_tokens', {
      installation_id: installationId,
      permissions,
      mediaType: { previews: ['machine-man'] },
    });
  }
}
