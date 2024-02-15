// {
// set mode to jest

// Assuming Jest and Babel or SWC are configured to handle ES Modules in your Jest config.
import * as core from '@actions/core';
import pkg from '@jest/globals';
const { jest } = pkg;
import * as appModule from '../index.js'; // Adjust the import path as necessary.

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setFailed: jest.fn(),
  setOutput: jest.fn(),
  setSecret: jest.fn(),
}));

const it = jest.fn();
const describe = jest.fn();
const expect = jest.fn();
const beforeEach = jest.fn();

jest.mock('@actions/github', () => ({
  getOctokit: jest.fn(() => ({
    rest: {
      apps: {
        getAuthenticated: jest.fn().mockResolvedValue({ data: { id: 12345 } }),
        createInstallationAccessToken: jest.fn().mockResolvedValue({
          data: { token: 'test-token', expires_at: new Date().toISOString() },
        }),
        getInstallation: jest.fn().mockResolvedValue({
          data: { permissions: { contents: 'write', issues: 'write' } },
        }),
      },
    },
  })),
}));

describe('GitHub Actions Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete successfully with valid inputs', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'application_private_key') return 'test-private-key';
      if (name === 'application_id') return 'test-app-id';
      if (name === 'permissions') return 'contents:write,issues:write';
      return '';
    });

    await expect(appModule.run()).resolves.toBeUndefined();
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledTimes(4);
    expect(core.setSecret).toHaveBeenCalledWith('test-token');
  });

  it('should fail with missing inputs', async () => {
    core.getInput.mockImplementation(() => '');
    await expect(appModule.run()).rejects.toThrow();
    expect(core.setFailed).toHaveBeenCalled();
  });
});
