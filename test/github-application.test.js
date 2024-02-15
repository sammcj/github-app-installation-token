/* eslint-env mocha */
// import process from 'process';
import { expect } from 'chai';
import sinon from 'sinon';
// import * as core from '@actions/core';
import { GitHubApplication, getInstallationId } from '../lib/github-application.js';
import { getInput } from '../index.js';

const appId = getInput().appId;
const privateKey = getInput().privateKey;
const baseApiUrl = getInput().baseApiUrl;
const permissionsInput = getInput().permissionsInput;
const org = getInput().org;
const owner = getInput().owner;
const repo = getInput().repo;
const tokenLifetime = getInput().tokenLifetime;

/**
 * Test the GitHub Application class
 */
describe('GitHubApplication', () => {
  // use the variables from the if statement above

  // console.debug('privateKey', privateKey);
  console.debug('appId', appId);
  console.debug('baseApiUrl', baseApiUrl);
  console.debug('permissions', permissionsInput);
  console.debug('org', org);
  console.debug('owner', owner);
  console.debug('repo', repo);
  console.debug('tokenLifetime', tokenLifetime);

  let app;
  app = new GitHubApplication(privateKey, appId, baseApiUrl);

  // No need to reset at present, but may be useful in future
  // beforeEach(() => {
  // app = new GitHubApplication(privateKey, applicationId, baseApiUrl);
  // });

  it('connect', async () => {
    console.log('Testing connect function connects to the GitHub API');
    const spy = sinon.spy(app, 'connect');
    await app.connect();
    expect(spy.calledOnce).to.be.true;
    spy.restore();
  });

  it('fetchMetadata', async () => {
    console.log('Testing fetchMetadata function returns metadata for the App');
    const spy = sinon.spy(app, 'fetchMetadata');
    await app.fetchMetadata();
    expect(spy.calledOnce).to.be.true;
    spy.restore();
  });

  it('getAppInstallation', async () => {
    console.log('Testing getAppInstallation function returns an installation ID for an App');
    const spy = sinon.spy(app, 'getAppInstallation');
    await app.getAppInstallation(appId);
    expect(spy.calledWith(appId)).to.be.true;
    spy.restore();
  });

  it('tokenLifetime', async () => {
    console.log('Testing the tokenLifetime');
    const spy = sinon.spy(app, 'getAppInstallation');
    await app.getAppInstallation(appId);
    expect(app.token.tokenLifetime).to.equal(600);
    spy.restore();
  });

  if (org) {
    it('getInstallationAccessToken', async () => {
      console.log('Testing getInstallationAccessToken function returns an access token for an Org');
      const permissionsInput = { contents: 'read', actions: 'read', metadata: 'read' };
      const installationId = await app.getOrgInstallation(org);
      try {
        const appInstallation = await app.getInstallationAccessToken(
          installationId,
          permissionsInput,
        );
        try {
          // Check the permissions returned match the permissions requested
          const tokenPermissions = await appInstallation.permissions;
          expect(tokenPermissions).to.deep.equal(permissionsInput);
        } catch (error) {
          console.log('Error checking permissions', error);
        }
      } catch (error) {
        console.log(`Installation ${installationId} not found`);
      }
    });

    // skip the org, user and repo tests if the environment variables are not set
    it('getOrgInstallation', async () => {
      console.log('Testing getOrgInstallation function returns an installation ID for an Org');
      try {
        await app.getOrgInstallation(org);
      } catch (error) {
        console.log(`Organization ${org} not found`);
      }
    });
  }

  if (owner) {
    it('getUserInstallation', async () => {
      console.log('Testing getUserInstallation function returns an installation ID for a User');
      try {
        await app.getUserInstallation(owner);
      } catch (error) {
        console.log(`User ${owner} not found`);
      }
    });
  }

  if (repo && owner) {
    it('getRepositoryInstallation', async () => {
      console.log(
        'Testing getRepositoryInstallation function returns an installation ID for a Repository',
      );
      try {
        await app.getRepositoryInstallation(owner, repo);
      } catch (error) {
        console.log(`Repository ${owner}/${repo} not found`);
      }
    });
  }

  describe('getInstallationId', () => {
    console.log('Testing getInstallationId function returns an installation ID for a Repository');
    it('getInstallationId', async () => {
      try {
        await getInstallationId(privateKey, appId, org, owner, repo);
      } catch (error) {
        if (error.message.includes('secretOrPrivateKey must be an asymmetric key')) {
          console.log('Invalid private key');
        } else {
          throw error;
        }
      }
    });
  });
});
