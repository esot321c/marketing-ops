# Changelog

All notable changes to Marketing-Ops are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-07-02

The content motion goes live, and the dashboard becomes one per-tenant workspace.

### Added

- **Content motion engine** (sub-project 2a): a channel-, format-, and media-agnostic pipeline for the daily posting loop, proven end-to-end on a real LinkedIn posting workflow.
  - Content lifecycle (idea, drafting, in_review, approved, scheduled, posted, measured), a pipeline board, and a Today view driven by a weighted cadence planner.
  - **Asset/route model**: each piece is a set of assets, produced by the local harness (the agent) or by an external tool via a ready-to-run generation package (Claude Design, Nano Banana, ChatGPT, an AI-video tool). Provider-agnostic, no vendor lock. text-post, blog-post, and carousel ship; image and video are modeled for later slices.
  - **Run modes**: every agent action runs via Chat (copy-paste) or Headless (`claude -p`, subscription or API key), chosen per action, with billing guardrails (never `--bare`; subscription mode strips a stray `ANTHROPIC_API_KEY`; the run route refuses an unavailable mode; every fire logged). Chat is always available.
  - **Learning loop**: performance and corrections feed back into Init. Cadence weights auto-tune; voice, ICP, vertical, competitor, and profile edits are gated behind your acceptance.
  - Composer with a live in-brand render, a refine loop, the generation package, and state actions. Content routes and a client API as thin, path-safe file adapters. A seeded example under `data.example/content/`.
- **One per-tenant Workspace** replacing the tabbed shell. Before a tenant is ready it runs as a guided setup that steps forward and back through the setup sections with each section's real view inline (the design system renders on its own step). Once ready, the content dashboard is home and the setup sections are revisitable as settings.
- **Brand-themed workspace**: the whole surface themes from each tenant's design tokens via CSS variables, with Fraunces and IBM Plex loaded.
- **Base/Brand theme toggle** by the tenant selector: switch the workspace between the tenant's own colors (Brand) and one neutral palette (Base), persisted.
- **Pluggable agent backend** seam: Claude Code is implemented; pointing it at Ollama, LM Studio, Bedrock, or Vertex is inherited configuration, and a different CLI such as Codex is documented, so the brain is not hard-wired.

### Changed

- The four-tab shell (Setup, Design System, Overview, Content) is replaced by the single Workspace. The Init wizard is now that workspace's guided mode.
- The header tagline is now "A steady content motion for every brand you run."
- The `content-pipeline` and `carousel-builder` skills are rewritten for the content-motion file contract.

### Removed

- The Overview placeholder tab.
- An external CRM handoff concept (it was never meant to be part of this build).

### Notes

- Frontend plus a thin file-adapter API. Still fully local and agent-driven; no server-held model key.

## [0.1.0] - 2026-06-29

First tagged release: a local, file-driven AI marketing command center with a working **Tenant Init** onboarding flow.

### Added

- **Dashboard (Vite + React 19 + TypeScript strict + Tailwind + shadcn/ui).** Single-page app with a tenant switcher, tabbed shell, and the product boundary front and center ("No CRM. No outreach. No sales pipeline.").
- **Tenant Init wizard.** A multi-tenant, 7-stage onboarding (Import & intake → Design style/Design System → Voice → ICP → Vertical → Competitor research → Profile build) with gated approvals and per-stage status.
  - **Intake form** with a working drag-and-drop asset upload.
  - **Per-stage input forms** (voice / ICP / vertical) and **review cards** for agent-produced stages.
  - **Copy-paste agent handoff prompts** that name the stage and tenant, bridging the dashboard to a chat agent.
- **Hono API server** that owns all `data/` reads/writes (init state, intake, stage input, approvals, asset upload, profile state, tenant list).
- **Live bidirectional filesystem sync.** The UI writes to `data/` over POST; a chokidar watcher broadcasts changes over Server-Sent Events, and the dashboard updates with no refresh when the agent (or anything else) writes files.
- **Strict-typed core libraries** with Vitest coverage: init-state logic and gating, profile-spec state machine, sandboxed setup paths, tenant registry, and the init store.
- **Design System scaffold** — a reusable, token-driven React component library with `@dsCard` preview markers ready for `/design-sync` to a claude.ai/design project. Each tenant's brand tokens and previews live as user-owned data.
- **Agent skills**: `marketing-ops` router, `marketing-setup` (documented 7-stage Init procedure), `market-research`, `content-pipeline`, `social-repurposer`, `carousel-builder`, `video-script-builder`.
- **Reusable templates** for briefs and documents (brand profiles, campaign briefs, content briefs, carousels, video scripts), plus anonymous example data under `data.example/`.
- **Data contract** separating reusable system files, public examples (`data.example/`), and private user data (`data/`, gitignored).

### Notes

- This release completes the Tenant Init onboarding flow. The content-motion / posting loop is planned but deferred.
- The dashboard runs fully locally and agent-driven; no model API key is required to operate it.

[0.2.0]: https://github.com/esot321c/marketing-ops/releases/tag/v0.2.0
[0.1.0]: https://github.com/esot321c/marketing-ops/releases/tag/v0.1.0
