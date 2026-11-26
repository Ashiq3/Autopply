# Security Policy

AutoApply AI handles job-search information, resume content, and third-party AI provider credentials. Please report suspected security issues responsibly so they can be investigated without exposing users or their data.

## Supported Versions

Security fixes are prioritized for the latest code on the repository's default branch (`main`). This project does not currently publish a formal backport or long-term support policy for older releases.

## Reporting a Vulnerability

**Please do not report an exploitable vulnerability in a public GitHub issue, pull request, discussion, or social post.**

1. If GitHub's **Private vulnerability reporting** is enabled for this repository, use the **Report a vulnerability** option on the repository's **Security** tab.
2. If that option is unavailable, contact the maintainer privately through the [Ashiq3 GitHub profile](https://github.com/Ashiq3) and ask for a secure channel. Do not include exploit details, credentials, or private user data in a public message.
3. Include, where safe:
   - A short description and the affected file, endpoint, version, or commit.
   - The potential impact and the conditions needed to reproduce it.
   - Clear reproduction steps or a minimal proof of concept.
   - Any suggested mitigation and a way to contact you.

Please use test accounts and synthetic data. Do not access, modify, download, or disclose another person's resume, account, API key, or application history. Do not perform denial-of-service testing, broad scanning, or testing against third-party provider systems without their permission.

The maintainer will acknowledge and investigate a credible report as soon as reasonably possible. We will coordinate a fix and disclosure timeline with the reporter. No fixed response-time guarantee or bug bounty is currently offered. Please allow time for users to receive a fix before making technical details public.

## API Key and Secret Handling

AutoApply AI supports server-configured provider credentials and credentials entered by an individual through the web interface. Handle both as secrets.

### Server-side credentials

- Keep provider keys in the deployment platform's secret/environment-variable manager or in local, untracked server-side files such as `.env`, `.env.local`, and `.provider-keys.json`.
- Never commit real values from those files. The repository's `.gitignore` excludes these local secret files, but always review `git status` and the staged diff before committing; ignore rules do not remove a file that is already tracked.
- Use `.env.example` only as a template with placeholder values. Do not put working keys in examples, screenshots, logs, issues, pull requests, or documentation.
- Do not place server credentials in frontend source code, browser-visible build variables, or public configuration.

### Credentials entered in the browser

- When a user connects a provider in **Settings → AI Model Provider**, the key is sent to this app's backend in the `X-LLM-API-Key` request header so the backend can call the selected provider.
- The **Remember connection in this browser** option is enabled by default. When enabled, the credential is saved in that browser's `localStorage`. When disabled, the current implementation keeps it in page memory for the current session rather than persisting it in browser storage.
- Only enter a key on an app instance and site origin you trust. Use HTTPS for deployed instances, protect access to your device/browser profile, and avoid saving credentials on shared or public computers.
- The AI provider receives the prompts and any content needed for the requested operation. Review that provider's own privacy, retention, and data-use terms before sending resume or other personal information.

### If a key is exposed

1. Revoke or rotate the key with its provider immediately; deleting it from the latest file does not invalidate a leaked key.
2. Review provider usage and billing for unexpected activity.
3. Remove the exposed value from local files, logs, screenshots, and any affected issue or pull request. If it entered Git history, treat it as compromised even after a later commit removes it.
4. Report the exposure privately if repository history or a published release may contain it.

Use provider-side spending limits and least-privilege credentials where available. Never ask another contributor to paste a real API key into an issue or pull request.

## Personal and Resume Data

Resumes can contain names, email addresses, phone numbers, addresses, employment history, and other sensitive information. Use synthetic or properly redacted examples in bug reports, tests, screenshots, and pull requests. Do not commit real resumes, candidate records, job application exports, or provider responses containing personal data.

## Security Checks for Contributors

Before submitting a change:

- Run `npm run lint` and `npm run build` when the change affects the application.
- Review the full staged diff for secrets, personal information, and accidentally included local files.
- Keep vulnerability fixes focused and explain the validation performed without publishing exploit details before a fix is available.

This policy describes the project's intended handling practices; it is not a guarantee that the application or a deployment has undergone an independent security audit.
