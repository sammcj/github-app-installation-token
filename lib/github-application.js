import jsonwebtoken from 'jsonwebtoken';
import { getOctokit } from '@actions/github';

class GitHubApplicationToken {
  constructor(privateKey, applicationId) {
    this.privateKey = privateKey;
    this.applicationId = applicationId;
  }

  isTokenExpired() {
    const currentTime = Math.floor(Date.now() / 1000);
    return this.tokenExpiration && currentTime >= this.tokenExpiration;
  }

  generateToken() {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expirationTime = issuedAt + 600; // 10 minutes from now
    const payload = { iat: issuedAt, exp: expirationTime, iss: this.applicationId };

    this.tokenExpiration = expirationTime;
    console.debug(`Token expiration: ${this.tokenExpiration}`);

    return jsonwebtoken.sign(payload, this.privateKey, { algorithm: 'RS256' });
  }

  toString() {
    return this.generateToken();
  }
}

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

export class GitHubApplication {
  constructor(privateKey, applicationId, baseApiUrl) {
    this.token = new GitHubApplicationToken(privateKey, applicationId);
    this.apiClient = new GitHubAPIClient(this.token.toString(), baseApiUrl);
    this.metadata = null;
  }

  async connect() {
    await this.fetchMetadata();
  }

  async fetchMetadata() {
    try {
      const data = await this.apiClient.githubRequest('GET', '/app');
      this.metadata = data;
    } catch (error) {
      console.error('Error fetching GitHub App metadata', error);
      throw error;
    }
  }

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
      return data.token; // Assuming we want the token, not the ID
    } catch (error) {
      console.error('Error fetching installation access token', error);
      throw error;
    }
  }
}

export async function getInstallationId(privateKey, appId, org, owner, repo) {
  const github = new GitHubApplication(privateKey, appId, 'https://api.github.com');
  await github.connect();
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

  // console.debug('Installation ID:', installationId);
  return installationId;
}
