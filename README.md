# Marketing-Ops

Marketing-Ops is a local, open-source AI marketing command center for founder-led and small-team marketing systems.

It helps agents and humans run the marketing side of a business:

- Market and competitor research
- Brand positioning
- Website, blog, SEO, and AEO strategy
- Campaign planning
- Content calendars
- LinkedIn and Instagram carousel briefs
- Reels, TikTok, Shorts, and long-form video scripts
- Publishing preparation
- Analytics review and next-action planning

It runs fully on your machine. Your marketing data lives in local files you own; nothing is sent anywhere unless you wire it up yourself.

## Product Boundary

Marketing-Ops is a marketing system, not a CRM and not a sales pipeline manager.

Marketing-Ops owns:

- Brands
- Campaigns
- Content ideas
- Website/blog strategy
- Creative assets
- Publishing prep
- Marketing analytics

It intentionally stays out of:

- Leads and contacts
- Sales accounts and deal stages
- Outreach and follow-up cadences
- CRM workflow

When Marketing-Ops creates demand or identifies a sales-ready handoff, the correct next step is to pass that context to your CRM. Marketing-Ops does not manage the sales relationship itself.

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
