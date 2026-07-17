# Changelog

All notable changes to Marketing-Ops are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-07-17

BREAKING: the data directory is now tenant-first. Everything for a tenant lives under one folder.

### Changed

- **Tenant-first layout.** `data/<tenant>/{setup, work, content, analytics}/...` replaces the type-first layout; LinkedIn export imports move to `data/<tenant>/analytics/imports/`. A tenant is any top-level directory under `data/` containing a `setup/` subdirectory; other top-level folders are ignored.
- **Shared globals.** Cross-tenant files live in `data/shared/`.
- **Migration.** Run `node scripts/migrate-tenant-first.mjs` (supports `--dry-run`). It is idempotent, aborts before moving anything on conflicts or reserved/invalid tenant names, reports partial progress if a move fails mid-run, and never touches folders outside the four managed roots. See DATA_CONTRACT.md.
- All skills, docs, and `data.example/` reflect the new layout.

## [0.7.1] - 2026-07-17

Ideas become reviewable where they live: a review popup on the pipeline board, and X joins the content channels.

### Added

- **Idea review popup.** Clicking a card in the board's Ideas column opens a popup with the item's full angle, pillar and format pills, and its source constraints, with "Move to drafting" (the do-it bucket) and "Open in Composer" actions. Other columns keep their click-through behavior, and drag-and-drop is unchanged.
- **X as a content channel.** Content items can target `x` alongside linkedin, blog, tiktok, and instagram.

### Fixed

- Failed board state changes (from the popup or drag-and-drop) surface an error instead of failing silently.

## [0.7.0] - 2026-07-16

Analytics become real: structured per-post captures, LinkedIn export imports, and a charts dashboard. Work docs gain an approve/archive lifecycle.

### Added

- **Analytics store.** Per-tenant `data/analytics/<tenant>/posts.json` holds every post's capture history (impressions, reach, engagement breakdown, profile views, follows, viewer demographics). Writes are atomic and serialized per tenant, and re-imported duplicates dedupe.
- **LinkedIn export import.** Drop LinkedIn single-post XLSX exports into `data/analytics/imports/<tenant>/` and the dashboard server parses them into captures automatically, moving files to `processed/` (or `failed/` when unreadable). The parser reads row labels rather than positions and recognizes ugcPost, activity, and share URN types.
- **Analytics charts.** The analytics page renders impressions over time per post, a sortable per-post table, a conversion funnel (impressions through follows), a format comparison of medians, and an audience panel aggregating viewer demographics. Titles resolve from linked pipeline items, tooltips and axes are themed and readable, and posts carry a channel badge.
- **Work doc lifecycle.** Approve, archive, and restore work docs from the dashboard; the status writes back into the file's frontmatter, and archived docs leave the default list and sidebar counts.
- **Effective format pills.** Content items display what actually ships: a text post with an attached image reads image-post, a carousel reads carousel.
- **Recording rule.** Manually shared analytics are recorded into the structured store, with the markdown log kept as the narrative layer (documented in CLAUDE.md and the data contract).

### Fixed

- An item's angle renders as a readable text block in the Composer and Today views instead of being crammed into a pill chip.
- Failed status actions in the work view surface an error instead of failing silently.

## [0.6.0] - 2026-07-15

Carousel slides become images: structured slide copy, HTML-rendered infographics, and a slide-image workflow in the Composer.

### Added

- **Structured slide copy.** Carousel slides can carry `bullets` (rendered as a real list in the preview and in the copyable slide text) and `visual`, a one-line art direction for the slide image.
- **Slide image workflow.** The server lists and serves per-item asset files, and the Composer shows a slide-by-slide panel with an upload slot per slide. When every slide has an image, a swipeable image deck becomes the primary preview and the text mock steps aside.
- **ImageDeck component.** A design-system deck that pages through rendered slide images with the same dot navigation as the text deck.
- **Base writing rules in CLAUDE.md.** The always-on core (verify claims against recent primary sources before writing, never fabricate or embellish, register and banned-shape rules) now binds every session and every proposed line, not just saved drafts.

### Changed

- **HTML-first carousel rendering.** Slides render from brand-system HTML screenshotted at 1080x1080, and the deck exports as a multi-page PDF for LinkedIn document posts. Generative image models are reserved for background art; the per-slide generator prompts (`slidePrompts`) remain only for that hand-off. The carousel and content-pipeline skills teach the new flow.
- **Visual packages carry intent.** A carousel's image package records a `treatment` (finished infographic versus text over generated art) alongside its render notes.
- **Shared writing rules.** "Not a bolt-on" joins the banned AI-ism list.

### Fixed

- Text post and slide bodies preserve paragraph breaks instead of collapsing into one block.
- Composer state buttons surface failures inline and record the date when a piece is marked posted.
- The learnings page constrains its width for readability.

## [0.5.0] - 2026-07-13

Content pieces carry their own caption and cited sources, the pipeline board is draggable, and refine becomes one clear action.

### Added

- **Captions and readable slide text.** A content item now carries a `caption`, the post body that accompanies a carousel or other media, shown and copyable in the Composer. Carousel slide copy also renders as plain, copyable text beside the on-brand slide preview, so the words are not trapped inside an image.
- **Sources on a piece.** A content item can carry a `citations` list of named links. The Composer shows a Sources panel under the caption where each source is a link with a copy button, so a cited study is easy to verify and to drop into the first comment. The content skills now record a cited study in `citations` and name it in the caption.
- **Study-citation rule.** The shared writing rules require naming the source for any study, report, survey, or statistic, with a matching self-check, so a claim drawn from research is verifiable rather than vague.
- **App favicon.** The dashboard sets a favicon, so the browser tab shows the app icon.

### Changed

- **The pipeline board is draggable.** Cards move between lifecycle columns by dragging, which changes the piece's state. Dropping a card into Scheduled dates it today, and clicking a card still opens it in the Composer.
- **Refine is one action.** The Composer's refine panel replaces the separate "Queue refine note" and "Run" steps with a single Run that saves the note to the piece and hands the agent an instruction naming the queued note, or stating that none is queued.
- **Work views are expandable.** A capability's saved documents now list as expandable rows that can be open several at a time, with the newest opened by default. Opening a document no longer replaces the whole list.

## [0.4.0] - 2026-07-07

The agent's work becomes visible in the dashboard: capability views, a real Cadence page, and the outstanding prep the agent still owes after Init.

### Added

- **Capability work views.** Five views (Research, SEO / Keywords, Strategy, Campaigns, Analytics) surface the agent's marketing outputs. Each capability's files live under a per-tenant `data/work/<tenant>/<type>/` area as markdown with `title`, `created`, and `status` frontmatter, read through a hardened `/api/work` file adapter. Every view carries a one-line description and a copy-paste prompt to run that capability, and an Ask panel lists them all in a suggested order.
- **Outstanding prep, surfaced everywhere.** After Init, the prep the agent still owes (research, keyword research, strategy, and a first campaign, in that order) shows as "to do" markers in the sidebar, a Next steps card on Today, and a per-page banner that recommends the earlier steps when you open a later one. Analytics is treated as post-publish, so it is never flagged. Guidance in the marketing-ops skill and the project instructions tells the agent to surface and do this proactively rather than leaving it for the user to find.
- **Richer Cadence page.** Cadence now shows the real cadence: weekly targets per channel and format, the pillar weights the learning loop tunes, the engagement routine, and the tuning history, plus a prompt to ask the agent to adjust it.

### Changed

- Capabilities are ordered research, keywords, strategy, campaigns, then analytics, and each carries a short description shown in the Ask panel and its view.

## [0.3.0] - 2026-07-03

Setup runs strategy-first, saved stages can be refined in chat, and the workspace lives at real URLs.

### Added

- **Approve-or-refine on saved setup stages**: once a stage is saved (in-review), the workspace offers a second path beside Approve — a copy-paste prompt to evaluate and refine the saved artifact in chat before committing to it. It applies to every setup stage through one shared control, and the refine trigger is documented in the setup skill.
- **Real URLs for the workspace**: the app now uses client-side routing, so your position survives a page refresh and every view is linkable. The page is the path (`/board`, `/icp`, `/composer/:item`) and the active tenant is a query parameter (`?tenant=`), so switching brand keeps you on the same page. Sidebar entries are real links (middle-click and open-in-new-tab work), and a production SPA fallback serves deep links.

### Changed

- **Setup is now strategy-first.** The Init sequence runs ICP, vertical, and competitor research before the design system and voice, so brand expression follows a settled strategy instead of preceding it. Profile build stays last. (Previously voice ran third, ahead of ICP.) Stages already approved under the old order are preserved.

### Fixed

- Markdown lists in the setup artifact view render their bullets and numbers again; a base CSS reset had been stripping the list markers.

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
