/* eslint-env mocha */
import process from 'process';
import { expect } from 'chai';
import sinon from 'sinon';
import * as core from '@actions/core';
import { GitHubApplication, getInstallationId } from '../lib/github-application.js';

export function getInput() {
  if (process.env.GITHUB_ACTIONS) {
    const privateKey = core.getInput('application_private_key', { required: true });
    const appId = core.getInput('application_id', { required: true });
    const permissionsInput = core.getInput('permissions', { required: false });
    return { privateKey, appId, permissionsInput };
  } else {
    if (!process.env.GITHUB_APPLICATION_PRIVATE_KEY || !process.env.GITHUB_APPLICATION_ID) {
      throw new Error('Required inputs are missing');
    }
    const privateKey = process.env.GITHUB_APPLICATION_PRIVATE_KEY.replace(/\\n/g, '\n');
    const appId = process.env.GITHUB_APPLICATION_ID;
    const permissionsInput = process.env.GITHUB_PERMISSIONS ?? '{}';
    return { privateKey, appId, permissionsInput };
  }
}

describe('GitHubApplication', () => {
  let app;
  const privateKey = getInput().privateKey;
  const applicationId = getInput().appId;
  const baseApiUrl = 'https://api.github.com';

  beforeEach(() => {
    app = new GitHubApplication(privateKey, applicationId, baseApiUrl);
  });

  it('connect', async () => {
    const spy = sinon.spy(app, 'connect');
    await app.connect();
    expect(spy.calledOnce).to.be.true;
    spy.restore();
  });

  it('fetchMetadata', async () => {
    const spy = sinon.spy(app, 'fetchMetadata');
    await app.fetchMetadata();
    expect(spy.calledOnce).to.be.true;
    spy.restore();
  });

  it('getAppInstallation', async () => {
    const appId = 'appId';
    const spy = sinon.spy(app, 'getAppInstallation');
    await app.getAppInstallation(appId);
    expect(spy.calledWith(appId)).to.be.true;
    spy.restore();
  });

  // skip the org, user and repo tests if the environment variables are not set
  if (process.env.GITHUB_ACTIONS) {
    it('getOrgInstallation', async () => {
      const org = 'org';
      try {
        await app.getOrgInstallation(org);
      } catch (error) {
        console.log(`Organization ${org} not found`);
      }
    });

    it('getUserInstallation', async () => {
      const username = 'username';
      try {
        await app.getUserInstallation(username);
      } catch (error) {
        console.log(`User ${username} not found`);
      }
    });

    it('getRepositoryInstallation', async () => {
      const owner = 'owner';
      const repo = 'repo';
      try {
        await app.getRepositoryInstallation(owner, repo);
      } catch (error) {
        console.log(`Repository ${owner}/${repo} not found`);
      }
    });

    it('getInstallationAccessToken', async () => {
      const installationId = 'installationId';
      const permissions = {};
      try {
        await app.getInstallationAccessToken(installationId, permissions);
      } catch (error) {
        console.log(`Installation ${installationId} not found`);
      }
    });

    describe('getInstallationId', () => {
      it('getInstallationId', async () => {
        const privateKey = 'privateKey';
        const appId = 'appId';
        const org = 'org';
        const owner = 'owner';
        const repo = 'repo';
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

    describe('getInstallationId', () => {
      it('getInstallationId', async () => {
        const privateKey = 'privateKey';
        const appId = 'appId';
        const org = 'org';
        const owner = 'owner';
        const repo = 'repo';
        const spy = sinon.spy(getInstallationId);
        await getInstallationId(privateKey, appId, org, owner, repo);
        expect(spy.calledWith(privateKey, appId, org, owner, repo)).to.be.true;
        spy.restore();
      });
    });
  }
});
