import process from 'process';
import { getInput, info, setSecret, setOutput, setFailed } from '@actions/core';
import { createGitHubApplication } from './lib/github-application.js';

async function run() {
  try {
    const privateKeyInput = getInput('application_private_key', { required: true });
    const applicationId = getInput('application_id', { required: true });
    const githubApiBaseUrl = getInput('github_api_base_url') ?? process.env.GITHUB_API_URL ?? 'https://api.github.com';

    console.log('Attempting to create GitHub Application...');
    const app = await createGitHubApplication(privateKeyInput, applicationId, githubApiBaseUrl);
    console.log(`GitHub Application created: ${app.metadata.name} (id: ${app.metadata.id})`);

    const userSpecifiedOrganization = getInput('organization');
    const repository = process.env['GITHUB_REPOSITORY'] ?? '';
    const repoParts = repository.split('/');
    let installationId;

    if (userSpecifiedOrganization) {
      console.log(`Looking up installation for organization: ${userSpecifiedOrganization}...`);
      const installation = await app.getOrganizationInstallation(userSpecifiedOrganization);
      if (!installation || !installation.id) {
        throw new Error(`GitHub Application not installed for organization: ${userSpecifiedOrganization}`);
      }
      installationId = installation.id;
    } else if (repository) {
      console.log(`Looking up installation for repository: ${repository}...`);
      const installation = await app.getRepositoryInstallation(repoParts[0], repoParts[1]);
      if (!installation || !installation.id) {
        throw new Error(`GitHub Application not installed for repository: ${repository}`);
      }
      installationId = installation.id;
    } else {
      throw new Error('No organization or repository specified for installation lookup.');
    }

    const permissionsInput = getInput('permissions');
    let permissions = {};
    if (permissionsInput) {
      permissions = permissionsInput.split(',').reduce((acc, curr) => {
        const [name, level] = curr.split(':').map(part => part.trim());
        if (name && level) acc[name] = level;
        return acc;
      }, {});
    }

    console.log(`Requesting access token with permissions: ${JSON.stringify(permissions)}...`);
    const accessToken = await app.getInstallationAccessToken(installationId, permissions);
    console.log('Access token successfully generated.');

    setSecret(accessToken);
    setOutput('token', accessToken);
  } catch (err) {
    console.error(`Error encountered: ${err.message}`);
    setFailed(`Action failed with error: ${err.message}`);
  }
}

run();
