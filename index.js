import process from 'process';
import { getInput, info, setSecret, setOutput, setFailed } from '@actions/core';
import { createGitHubApplication } from './lib/github-application.js';
import PrivateKey from './lib/private-key.js';

async function run() {
  try {
    const privateKeyInput = getInput('application_private_key', { required: true });
    const applicationId = getInput('application_id', { required: true });
    const githubApiBaseUrl =
      getInput('github_api_base_url') ?? process.env.GITHUB_API_URL ?? 'https://api.github.com';

    // Validate and decode privateKey using PrivateKey class
    let privateKey;
    try {
      privateKey = new PrivateKey(privateKeyInput).key;
    } catch (error) {
      throw new Error(`Invalid private key format: ${error.message}`);
    }

    const app = await createGitHubApplication(privateKey, applicationId, githubApiBaseUrl);
    if (!app.metadata || !app.metadata.id) {
      throw new Error(`Could not retrieve metadata for GitHub Application with ID: ${applicationId}`);
    }
    info(`Found GitHub Application: ${app.metadata.name} (id: ${app.metadata.id})`);

    const userSpecifiedOrganization = getInput('organization');
    const repository = process.env['GITHUB_REPOSITORY'] ?? '';
    const repoParts = repository.split('/');
    let installationId;

    if (userSpecifiedOrganization) {
      info(`Obtaining application installation for organization: ${userSpecifiedOrganization}`);
      const installation = await app.getOrganizationInstallation(userSpecifiedOrganization);
      if (!installation || !installation.id) {
        throw new Error(
          `GitHub Application is not installed on the specified organization: ${userSpecifiedOrganization}`,
        );
      }
      installationId = installation.id;
    } else if (repository) {
      info(`Obtaining application installation for repository: ${repository}`);
      const installation = await app.getRepositoryInstallation(repoParts[0], repoParts[1]);
      if (!installation || !installation.id) {
        throw new Error(`GitHub Application is not installed on repository: ${repository}`);
      }
      installationId = installation.id;
    } else {
      throw new Error('No organization or repository specified for installation lookup.');
    }

    const permissions = getInput('permissions')
      .split(',')
      .reduce((acc, curr) => {
        const [name, level] = curr.split(':').map((part) => part.trim());
        if (name && level) {
          acc[name] = level;
        }
        return acc;
      }, {});

    if (Object.keys(permissions).length > 0) {
      info(`Requesting limited permissions: ${JSON.stringify(permissions)}`);
    }

    const accessToken = await app.getInstallationAccessToken(installationId, permissions);
    setSecret(accessToken.token);
    setOutput('token', accessToken.token);
    info('Successfully generated an access token for application.');
  } catch (err) {
    setFailed(`Error in run: ${err.message || 'Unknown error occurred.'}`);
  }
}

run();
