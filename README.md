# Marketing-Ops

Direct an AI agent to run your marketing.

Marketing-Ops is an open-source system for the awareness (tofu) stage of your funnel, whether that means generating ads or keeping a steady social presence. Working with an AI usually scatters your marketing across separate chats that each start from nothing, so the voice drifts and the context resets.

Here the agent works from one structured filesystem on your machine, so chats stay context aware and the output stays on brand. Curated skills guide the agent through the work within that structure, and the dashboard presents it all visually so you can track everything in one place.

## What it does

You start by setting the foundations. The init flow helps you define your ideal customer profile (ICP), set the voice your agent writes in, and get your branding right. Those become the bases everything else builds on.

From there you generate media against those foundations. Your agent can guide Claude Design to produce carousels for Instagram and LinkedIn, write scripts for videos you generate on another AI platform, and prep posts for publishing. Marketing-Ops then sets a cadence and a release schedule so the posting stays steady.

It also runs market and competitor research to inform those foundations, so the ICP and positioning reflect your actual market.

The same agent handles the wider loop. It can plan a campaign from an objective, shape website, blog, and SEO strategy, and review analytics after each push to set the next actions.

Because the files sit on your machine, an agent like Claude Code or Codex works from them directly, and you can edit them by hand. The dashboard updates as those files change.

## What it's not

Marketing-Ops works the awareness stage. In AIDA terms it builds Attention through brand and top-of-funnel content. It does not manage leads, deal stages, or sales follow-up.

Once your content creates demand and a contact is ready for lead management, that belongs in a CRM. [PI6](https://pi6.app) is built for that next step.

## How It Works

Marketing-Ops is a monorepo with three moving parts:

- **A dashboard app** (`apps/dashboard/`) — a local single-page app plus a small API server that owns all reads and writes to your `data/` folder. It runs a multi-tenant, gated onboarding wizard and stays live-synced with the filesystem, so when an agent (or you) edits a file, the UI updates with no refresh.
- **Agent skills** (`skills/`) — the marketing playbooks an AI agent follows: a router, a setup/init procedure, market research, content pipelines, repurposing, carousels, and video scripts.
- **Templates** (`templates/`) — reusable briefs and documents (brand profiles, campaign briefs, content briefs, and more).

You drive it by asking an agent to run a skill (for example, "run marketing-setup for my workspace"), and you review the files it produces in the dashboard.

## Quick Start

```bash
pnpm install
pnpm dev
```

Then open the dashboard URL printed in the terminal.

Requirements: Node 20+ and pnpm.

## First Init

A fresh clone contains no private data. Initialize a workspace before content production starts:

1. Ask the agent to run `marketing-setup`, which asks the setup questions and creates your local `data/` workspace.
2. Research competitors, audience language, SERPs, and social patterns.
3. Build the visual brand guide.
4. List or connect the marketing accounts you use.
5. Build or refresh public profiles.
6. Start preparing and publishing content.

Your private workspace folders (`data/`, and optionally `strategy/` and `docs/`) are gitignored and stay on your machine. Use `data.example/` as an anonymous reference for the shape of `data/`.

## Project Structure

```text
marketing-ops/
  apps/dashboard/        # Local dashboard app + API server
  skills/                # Agent skills (marketing playbooks)
  templates/             # Reusable briefs and documents
  data.example/          # Anonymous example data (safe to share)
  data/                  # Your private local workspace (gitignored)
```

## Data Model

See [DATA_CONTRACT.md](DATA_CONTRACT.md) for how Marketing-Ops separates reusable system files, anonymous public examples, and your private user data.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
