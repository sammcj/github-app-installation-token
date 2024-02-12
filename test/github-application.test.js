import { beforeEach, it, describe } from 'mocha';
import { expect } from 'chai';
import { getOctokit } from '@actions/github';
import { createGitHubApplication } from '../lib/github-application.js';
import {
  getApplicationId,
  getApplicationPrivateKey,
  getTestRepositoryOwner,
  getTestRepository,
  getTestOrganization,
} from './test-values.js';

describe('GitHubApplication', () => {
  const TEST_APPLICATION_NAME = 'test';

  describe('creation with invalid private keys', () => {
    it('should fail on an empty private key', () => {
      testPrivateKey('', 'privateKey must be provided');
    });

    it('should fail on a private key consisting of whitespace characters', () => {
      testPrivateKey(' \n \r\n ', 'privateKey must be provided');
    });

    it('should fail a null private key', () => {
      testPrivateKey(null, 'privateKey must be provided');
    });

    it('should fail on an undefined private key', () => {
      testPrivateKey(undefined, 'privateKey must be provided');
    });

    function testPrivateKey(value, message) {
      try {
        createGitHubApplication(
          value,
          getApplicationId(TEST_APPLICATION_NAME),
          'https://octodemo.com/api/v3',
        );
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message).to.contain(message);
      }
    }
  });

  describe('creation with invalid application id', () => {
    const TEST_APPLICATION_NAME = 'test';

    it('should fail on an empty application id', () => {
      testApplicationId('');
    });

    it('should fail on a application id consisting of whitespace characters', () => {
      testApplicationId(' \n \r\n ');
    });

    it('should fail a null application id', () => {
      testApplicationId(null);
    });

    it('should fail on an undefined application id', () => {
      testApplicationId(undefined);
    });

    function testApplicationId(value) {
      try {
        // output message
        getApplicationPrivateKey(TEST_APPLICATION_NAME), value, 'https://octodemo.com/api/v3';
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message);
      }
    }
  });

  describe('Installed Application - GHES', () => {
    const TEST_APPLICATION_NAME = 'test-ghes';

    let app = null;

    beforeEach(async () => {
      (app = getApplicationPrivateKey(TEST_APPLICATION_NAME)),
        getApplicationId(TEST_APPLICATION_NAME),
        'https://octodemo.com/api/v3';
    });

    it('should connect to GitHub', async () => {
      const result = await app.connect();
      expect(result).to.be.true;
    });

    it('should get application installations', async () => {
      const installations = await app.getApplicationInstallations();
      expect(installations).to.be.an.instanceOf(Array);
    });

    it('should get repository installation', async () => {
      const installation = await app.getRepositoryInstallation('owner', 'repo');
      expect(installation).to.have.property('id');
    });

    it('should get organization installation', async () => {
      const installation = await app.getOrganizationInstallation('org');
      expect(installation).to.have.property('id');
    });

    it('should get installation access token', async () => {
      const token = await app.getInstallationAccessToken('installationId');
      expect(token).to.be.a('string');
    });

    it('should be able to get installation for a repository', async () => {
      const data = await app.getRepositoryInstallation(
        getTestRepositoryOwner(TEST_APPLICATION_NAME),
        getTestRepository(TEST_APPLICATION_NAME),
      );

      expect(data).to.have.property('id');
      expect(data).to.have.property('permissions');
    });
  });
});

describe('Installed Application - GitHub.com', () => {
  const TEST_APPLICATION_NAME = 'test';

  let app = null;

  beforeEach(async () => {
    (app = getApplicationPrivateKey(TEST_APPLICATION_NAME)),
      getApplicationId(TEST_APPLICATION_NAME),
      'https://octodemo.com/api/v3';
  });

  it('should connect to GitHub.com', async () => {
    const appData = app.metadata;

    expect(appData).to.have.property('id').to.equal(getApplicationId(TEST_APPLICATION_NAME));
    expect(appData).to.have.property('owner');
    expect(appData).to.have.property('name');
    expect(appData).to.have.property('permissions');
    expect(appData).to.have.property('installations_count');
  });

  it('should be able to list application installations', async () => {
    const data = await app.getApplicationInstallations();

    expect(data).to.be.an.instanceOf(Array);
    expect(data).to.have.length.greaterThan(0);

    expect(data[0]).to.have.property('id');
  });

  it('should be able to get installation for a repository', async () => {
    const data = await app.getRepositoryInstallation(
      getTestRepositoryOwner(TEST_APPLICATION_NAME),
      getTestRepository(TEST_APPLICATION_NAME),
    );

    expect(data).to.have.property('id');
    expect(data).to.have.property('permissions');
  });

  it('should be able to get installation for an organization', async () => {
    const data = await app.getOrganizationInstallation(getTestOrganization(TEST_APPLICATION_NAME));

    expect(data).to.have.property('id');
    expect(data).to.have.property('permissions');
  });

  it('should fetch the requested permissions (read)', async () => {
    const data = await app.getOrganizationInstallation(getTestOrganization(TEST_APPLICATION_NAME));

    const accessToken = await app.getInstallationAccessToken(data.id, { issues: 'read' });

    expect(accessToken).to.have.property('permissions');
    expect(accessToken.permissions).to.eql({
      issues: 'read',
      metadata: 'read',
    });
  });

  it('should fetch the requested permissions (write)', async () => {
    const data = await app.getOrganizationInstallation(getTestOrganization(TEST_APPLICATION_NAME));

    const accessToken = await app.getInstallationAccessToken(data.id, { issues: 'write' });

    expect(accessToken).to.have.property('permissions');
    expect(accessToken.permissions).to.eql({
      issues: 'write',
      metadata: 'read',
    });
  });

  it('should be able to get access token for a repository installation', async () => {
    const repoInstall = await app.getRepositoryInstallation(
        getTestRepositoryOwner(TEST_APPLICATION_NAME),
        getTestRepository(TEST_APPLICATION_NAME),
      ),
      accessToken = await app.getInstallationAccessToken(repoInstall.id);
    expect(accessToken).to.have.property('token');

    // Use the token to access the repository
    const client = getOctokit(accessToken.token),
      repoName = getTestRepository(TEST_APPLICATION_NAME),
      ownerName = getTestRepositoryOwner(TEST_APPLICATION_NAME),
      repo = await client.rest.repos.get({
        owner: ownerName,
        repo: repoName,
      });

    expect(repo).to.have.property('status').to.equal(200);
    expect(repo).to.have.property('data');
    expect(repo.data).to.have.property('owner').to.have.property('login').to.equal(ownerName);
    expect(repo.data).to.have.property('name').to.equal(repoName);
  });
});
