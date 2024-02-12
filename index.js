import process from 'process';
import { getInput, info, setSecret, setOutput, setFailed } from '@actions/core';
import { createGitHubApplication } from './lib/github-application.js';

async function run() {
  try {
    const privateKeyInput = getInput('application_private_key', { required: true }).replace(/\\n/g, '\n');
    // output a the number of characters in the private key
    info(`Redacted Private Key: ${'*'.repeat(privateKeyInput.length - 10)}${privateKeyInput.substring(privateKeyInput.length - 10)}`);
    const applicationId = getInput('application_id', { required: true });
    // output the first number of the application id
    info(`Redacted Application id: ${applicationId.substring(0, 3)}...`);
    const githubApiBaseUrl = 'https://api.github.com';
    info(`GitHub API Base URL: ${githubApiBaseUrl}`);

    console.log('Creating GitHub Application...');
    const app = await createGitHubApplication(privateKeyInput, applicationId, githubApiBaseUrl);
    console.log(`GitHub Application created: ${app.metadata.name} (id: ${app.metadata.id})`);

    const userSpecifiedOrganization = getInput('organization');
    info(`Organization: ${userSpecifiedOrganization}`);
    const repository = process.env['GITHUB_REPOSITORY'] ?? '';
    info(`Repository: ${repository}`);
    const repoParts = repository.split('/');
    let installationId;

    if (userSpecifiedOrganization) {
      console.log(`Obtaining installation for organization: ${userSpecifiedOrganization}...`);
      const installation = await app.getOrganizationInstallation(userSpecifiedOrganization);
      if (!installation || !installation.id) {
        throw new Error(`App not installed for organization: ${userSpecifiedOrganization}`);
      }
      installationId = installation.id;
    } else if (repository) {
      console.log(`Obtaining installation for repository: ${repository}...`);
      const installation = await app.getRepositoryInstallation(repoParts[0], repoParts[1]);
      if (!installation || !installation.id) {
        throw new Error(`App not installed for repository: ${repository}`);
      }
      installationId = installation.id;
    } else {
      throw new Error('No organization or repository specified.');
    }

    const permissionsInput = getInput('permissions');
    info(`Permissions: ${permissionsInput}`);
    const permissions = permissionsInput.split(',').reduce((acc, curr) => {
      const [name, level] = curr.split(':').map(part => part.trim());
      acc[name] = level;
      return acc;
    }, {});

    console.log(`Requesting access token with permissions: ${JSON.stringify(permissions)}...`);
    const accessToken = await app.getInstallationAccessToken(installationId, permissions);
    setSecret(accessToken);
    setOutput('token', accessToken);
    console.log('Access token successfully generated.');
  } catch (err) {
    console.error(`Error: ${err.message}`);
    setFailed(`Action failed: ${err.message}`);
  }
}

run();
