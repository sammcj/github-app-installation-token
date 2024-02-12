import { it, describe } from 'mocha';
import { expect } from 'chai';
import { GitHubApplicationToken, createGitHubApplication } from '../lib/github-application.js';
import {
  getApplicationId,
  getApplicationPrivateKey,
  getTestRepositoryOwner,
  getTestRepository,
  getTestOrganization,
} from './test-values.js';

await describe('GitHub Application', () => {
  const TEST_APPLICATION_NAME = 'test-github';

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
        new GitHubApplicationToken(
          value,
          getApplicationId(TEST_APPLICATION_NAME),
        );
        expect.fail('privateKey must be provided');
      } catch (err) {
        const errorMessage = err.message;
        expect(errorMessage).to.contain(message);
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
});

const TEST_APPLICATION_NAME = 'test-github';
const github = await createGitHubApplication(
  getApplicationPrivateKey(TEST_APPLICATION_NAME),
  getApplicationId(TEST_APPLICATION_NAME),
  'https://api.github.com',
);

describe('GitHub Application', () => {
  it('should create a GitHub application', () => {
    expect(github).to.be.an('object');
  });

  if (github) {
    it('should be of type', () => {
      expect(github.metadata).to.be.an('object');
    });
    it('should have an apiClient object', () => {
      expect(github.apiClient).to.be.an('object');
    }
    );

    it('should have a token object', () => {
      expect(github.token).to.be.an('object');
    });

    it('should have a baseApiUrl string', () => {
      expect(github.baseApiUrl).to.be.a('string');
    });

    it('should have a valid applicationId', () => {
      expect(github.token.applicationId).to.equal(getApplicationId(TEST_APPLICATION_NAME));
    });

    it('should have a valid privateKey', () => {
      expect(github.token.privateKey).to.equal(getApplicationPrivateKey(TEST_APPLICATION_NAME));
    });

    // TODO: more tests!

  }
}
)
