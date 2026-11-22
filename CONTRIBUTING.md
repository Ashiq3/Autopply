# Contributing to AutoApply AI

Thank you for your interest in improving **AutoApply AI**! Contributions of all sizes—from bug fixes and UI improvements to new job board integrations and documentation tweaks—are welcome.

## Development Setup

1. **Fork & Clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/autoapply-ai.git
   cd autoapply-ai
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey) into `.env`.

4. **Run Locally**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Before Submitting a Pull Request

- Run TypeScript type checking:
  ```bash
  npm run lint
  ```
- Verify the production build succeeds:
  ```bash
  npm run build
  ```
- Make sure no personal data, `.env` files, or API keys are committed.
- Keep PRs focused and include a short description of what changed and why.

## Reporting Issues

Use the GitHub Issue templates for **Bug Reports** or **Feature Requests**, and include steps to reproduce along with Node.js version and OS details.
