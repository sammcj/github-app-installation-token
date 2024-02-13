# GitHub App Token Authoriser

[![Build Status (latest push)](https://github.com/sammcj/github-app-installation-token/workflows/Bump%20version/badge.svg)](https://github.com/sammcj/github-app-installation-token/workflows/bump-version)
[![Stable Version](https://img.shields.io/github/v/tag/sammcj/github-app-installation-token)](https://img.shields.io/github/v/tag/sammcj/github-app-installation-token)
[![Latest Release](https://img.shields.io/github/v/release/sammcj/github-app-installation-token?color=%233D9970)](https://img.shields.io/github/v/release/sammcj/github-app-installation-token?color=%233D9970)

This [JavaScript GitHub Action](https://help.github.com/en/actions/building-actions/about-actions#javascript-actions) can be used to impersonate a GitHub App.

It is a fork of [Peter Murray's workflow-application-token-action](https://github.com/peter-murray/workflow-application-token-action).

- [GitHub App Token Authoriser](#github-app-token-authoriser)
  - [Use Cases](#use-cases)
  - [Example Workflows](#example-workflows)
    - [Inputs](#inputs)
    - [Outputs](#outputs)
  - [Requirements](#requirements)
    - [Creating a GitHub Application](#creating-a-github-application)
      - [Install the GitHub Application](#install-the-github-application)
  - [Contributions](#contributions)
    - [Development](#development)
  - [Security](#security)

## Use Cases

This is useful for when `secrets.GITHUB_TOKEN`'s limitations are too restrictive and a personal access token is not suitable.

The repo scoped [`secrets.GITHUB_TOKEN`](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token) has limitations such as:

- Cannot be used to checkout other private or internal repositories.
- Have their permissions scoped at the workflow level - not by admins.
- Cannot trigger a workflow run from another workflow.

A common workaround for individual use is to use a [Personal Access Token](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line) but this has significant security, maintenance and auditability issues.

Github recommends using [GitHub Apps](https://developer.github.com/apps/differences-between-apps/#machine-vs-bot-accounts) as a workaround to automate authentication to Github Services that isn't provided out of the box by Github / Actions.

## Example Workflows

Get a token with all the permissions of the GitHub Application

```yaml

jobs:
  get-temp-token:
    runs-on: ubuntu-latest
    steps:
      - name: Get Token
        id: get_workflow_token
        uses: sammcj/github-app-installation-token@main # or a specific version
        with:
          application_id: ${{ secrets.GHA_APPLICATION_ID }}
          application_private_key: ${{ secrets.GHA_APPLICATION_PRIVATE_KEY }}

      - name: Use Application Token to checkout a repository
        uses: actions/checkout@v3
        env:
          GITHUB_TOKEN: ${{ steps.get_workflow_token.outputs.token }}
        with:
          ....
```

Get a token with a limited subset of the permissions of the Github Application, in this case just the `actions:write` permission

```yaml
jobs:
  get-temp-token:
    runs-on: ubuntu-latest
    steps:
      - name: Get Token
        id: get_workflow_token
        sammcj/github-app-installation-token@main # or a specific version
        with:
          application_id: ${{ secrets.GHA_APPLICATION_ID }}
          application_private_key: ${{ secrets.GHA_APPLICATION_PRIVATE_KEY }}
          permissions: "actions:write"

      - name: Use Application Token to checkout a repository
        uses: actions/checkout@v3
        env:
          GITHUB_TOKEN: ${{ steps.get_workflow_token.outputs.token }}
        with:
          ....
```

Get a token with all the permissions of the Github Application that is installed on an organisation

```yaml
jobs:
  get-temp-token:
    runs-on: ubuntu-latest
    steps:
      - name: Get Token
        id: get_workflow_token
        uses: sammcj/github-app-installation-token@main # or a specific version
        with:
          application_id: ${{ secrets.GHA_APPLICATION_ID }}
          application_private_key: ${{ secrets.GHA_APPLICATION_PRIVATE_KEY }}
          organization: CattleDip

      - name: Use Application Token to checkout a repository
        uses: actions/checkout@v3
        env:
          GITHUB_TOKEN: ${{ steps.get_workflow_token.outputs.token }}
        with:
          ....
```

### Inputs

```yaml
inputs:
  application_private_key:
    description: GitHub Application Private Key value.
    required: true
  application_id:
    description: GitHub Application ID value.
    required: true
  permissions:
    description: "The permissions to request e.g. issues:read,secrets:write,packages:read. Defaults to all available permissions"
    required: false
  organization:
    description: The GitHub Organization to get the application installation for, if not specified will use the current repository instead
    required: false
  github_api_base_url:
    description: The GitHub API base URL to use, no needed it working within the same GitHub instance as the workflow as it will get picked up from the environment
    required: false
```

### Outputs

```yaml
outputs:
  token:
    description: A valid token representing the Application that can be used to access what the Application has been scoped to access.
```

## Requirements

- A new or existing GitHub Application with the access scopes required
- A private key for the GitHub Application
- The GitHub Application installed on the repository that the GitHub Actions Workflow will execute from

### Creating a GitHub Application

You will need to have a GitHub Application that is scoped with the necessary permissions for the token that you want to
retrieve at runtime.

To create a GitHub Application you can follow the steps available at <https://docs.github.com/en/developers/apps/creating-a-github-app>

The important configuration details for the application are:

- `GitHub App name` a human readable application name that is unique within GitHub.com
- `Description` some details about your application and what you intend to use it for
- `Homepage URL` needs to be set to something as long as it is a URL
- `Expire user authorization tokens` should be checked so as to expire any tokens that are issued
- `Webhook` `Active` checkbox should be unchecked
- `Repository permissions`, `Organization permissions` and/or `User permissions` should be set to allow the access required for the token that will be issued
- `Where can this GitHub App be installed?` should be scoped to your desired audience (the current account, or any account)

Once the application has been created you will be taken to the `General` settings page for the new application.
The GitHub Application will be issued an `App ID` which you can see in the `About` section, take note of this for later
use in the Actions workflow.

On the `General` settings page for the application, at the bottom there is a `Private keys` section that you can use to
generate a private key that can be utilized to authenticate as the application.
Generate a new private key and store the information for later use.

_Note: the private keys can and should be rotated periodically to limit the risks of them being exposed in use._

#### Install the GitHub Application

Once you have the GitHub Application defined, you will need to install the application on the target organization or repository/
repositories that you want it to have access to. These will be any repositories that you want to gather information
from or want the application to modify as per the scopes that were defined when the application was installed.

_Note: The GitHub Application will need to be installed on the organization and or repository that you are executing
the GitHub Actions workflow from, as the implementation requires this to be able to generate the access tokens_.

## Contributions

This action is built with inspiration from several sources, taking the best bits and adding some modernisation.

Credit to following projects:

- [tibdex's github app token Action](https://github.com/tibdex/github-app-token)
  - [jwenz's fork of tibdex](https://github.com/jwenz723/github-app-installation-token) but updated significantly.
- [peter-murray's workflow-application-token-action](https://github.com/peter-murray/workflow-application-token-action).

As always - pull requests are welcomed.

### Development

```shell
npm ci
npm run lint
npm run test
npm run build # Required as uses ncc to compile the action
```

## Security

This action is built using the official Github [Octokit](https://github.com/octokit) API library to authenticate with Github and generate a token.

If you have any concerns about the security of this action, please raise an issue.

- [Github Apps - Authenticating as an installation](https://docs.github.com/en/developers/apps/authenticating-with-github-apps#authenticating-as-an-installation)
