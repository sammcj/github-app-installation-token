import { env } from 'process';

import { platform } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
const data = loadData();

export function getApplicationId(appName) {
  return getAppTestValue(appName, 'applicationId');
}
export function getApplicationPrivateKey(appName) {
  return getAppTestValue(appName, 'privateKey');
}
export function getTestRepository(appName) {
  return getAppTestValue(appName, 'repo.repo');
}
export function getTestRepositoryOwner(appName) {
  return getAppTestValue(appName, 'repo.owner');
}
export function getTestOrganization(appName) {
  return getAppTestValue(appName, 'org');
}

function loadData() {
  const testDataFile = getTestDataFileName();

  let data = null;
  if (existsSync(testDataFile)) {
    try {
      const fileContent = readFileSync(testDataFile, 'utf8'); // Convert buffer to string
      data = JSON.parse(fileContent);
    } catch (err) {
      console.error(`Failed to parse data file ${testDataFile}: ${err.message}`);
      // raise the error
      throw err;
    }
  }

  return data;
}

function getTestDataFileName() {
  if (platform() === 'win32') {
    return join(env.LOCALAPPDATA || '', '.github_application');
  } else {
    return join(env.HOME || '', '.github_application');
  }
}

function getAppTestValue(name, key) {
  if (!data) {
    console.error(
      `No data for tests has been loaded, please ensure you have a valid file for testing at ${getTestDataFileName()}.`,
    );
    return null;
  }

  const application = data[name];
  // console.log(`DATA:: ${JSON.stringify(application)}`);

  if (application) {
    if (key) {
      const keyPath = key.split('.');

      let target = application;
      keyPath.forEach((key) => {
        if (target) {
          target = target[key];
        }
      });
      return target;
    }
  }
  return null;
}
