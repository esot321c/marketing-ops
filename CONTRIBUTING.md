# Contributing to Marketing-Ops

Thanks for your interest in improving Marketing-Ops. This guide covers how to get set up, what to work on, and how to submit changes.

## Ground Rules

- Marketing-Ops is a **marketing system, not a CRM.** Contributions should stay inside the product boundary described in the [README](README.md#product-boundary). Features for leads, contacts, sales pipelines, deal stages, or outreach cadences are out of scope.
- Keep the tool **local-first.** It should run fully on a user's machine without requiring a hosted backend or a model API key to operate.
- **Never commit private data.** Real workspace content lives in `data/` (and optional local `strategy/` and `docs/` folders), all of which are gitignored. Only anonymous examples belong in `data.example/`.

## Getting Started

Requirements: Node 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

The dashboard app and its API server start together; open the URL printed in the terminal.

## Development

The project is a pnpm workspace. Most work happens in `apps/dashboard/`.

Common commands (run from the repo root):

```bash
pnpm dev      # run the dashboard app + API server
pnpm build    # type-check and build the dashboard
pnpm test     # run the test suite (Vitest)
```

The dashboard uses Vite, React 19, TypeScript (strict), Tailwind, and shadcn/ui. Core logic in `apps/dashboard/src/lib/` is covered by Vitest tests — please add or update tests when you change that logic.

## Project Layout

- `apps/dashboard/` — local dashboard app and API server
- `skills/` — agent skills (marketing playbooks)
- `templates/` — reusable briefs and documents
- `data.example/` — anonymous example data (safe to share)

See [DATA_CONTRACT.md](DATA_CONTRACT.md) for how system files, examples, and private user data are separated.

## Submitting Changes

1. Fork the repo and create a topic branch (`feat/…` or `fix/…`).
2. Make your change, keeping it focused. Add tests where relevant.
3. Run `pnpm test` and `pnpm build` and make sure both pass.
4. Confirm no private data or personal details are included in the diff.
5. Open a pull request describing the change and the motivation.

## Conventions

- Commit messages follow the Conventional Commits style already used in the history (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
- Follow the writing rules in `skills/marketing-setup/writing-rules.md` for any user-facing copy the tool generates.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
