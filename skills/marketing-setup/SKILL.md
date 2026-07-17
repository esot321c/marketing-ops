---
name: marketing-setup
description: Initialize a local Marketing-Ops workspace by asking setup questions, researching the market, creating a visual brand guide, listing or connecting marketing accounts, building public profile guidance, and only then preparing content. Use for first-time setup, onboarding a new tenant, preparing a marketing workspace, creating account/profile setup plans, or deciding what must happen before posting. Do not manage leads, sales accounts, outreach, deals, or CRM follow-up.
---

# Marketing Setup

Use this skill before content production begins.

## Boundary

Marketing setup prepares brands, profiles, accounts, guides, and content systems.

Do not manage:

- leads
- contacts
- sales accounts
- deals
- outreach cadences
- CRM follow-up

If setup reveals sales-ready context, note it for handoff to the user's CRM instead of tracking it here.

## Required Sequence

Do these steps in order:

1. Ask setup questions.
2. Research competitors, audience language, SERPs, and content patterns.
3. Build the visual brand guide.
4. List or connect necessary marketing accounts.
5. Build or refresh public profiles.
6. Start the posting/content pipeline.

Do not skip to posting until steps 1-5 are complete or explicitly waived by the user.

## Workspace Folders (create on first init)

A fresh clone ships with **no private workspace folders** — the repo only contains the app, skills, templates, and anonymous examples under `data.example/`. On first init, create the user's local, gitignored working folders (they never get committed):

- `data/` — the live workspace the app reads and writes. Seed it by copying the shape of `data.example/` (tenant-first folders, plus tenants, accounts, guides, research, calendar). Per-tenant init state lives at `data/<tenant>/setup/init.json`.
- `strategy/` — optional. Long-form working strategy documents the user maintains by hand (positioning, brand plans, content calendars). One markdown file per topic.
- `docs/` — optional. Architecture notes, design specs, and implementation plans for the user's own workspace.

Confirm `.gitignore` already excludes `data/`, `strategy/`, and `docs/` before writing anything into them, so private context never lands in a commit. Create only the folders the user actually needs; `data/` is the only required one.

## Intake Questions

Ask one batch of concise questions:

- What tenants or brands should this workspace manage?
- Which tenant is highest priority right now?
- What outcome matters most for each tenant?
- Which websites, blogs, and social accounts already exist?
- Which accounts need to be created or refreshed?
- What content assets already exist?
- Who are the main competitors or reference accounts?
- What should the visual style feel like?
- What topics, claims, or tactics should be avoided?
- What would make the first 30 days successful?

## Outputs

Create or update:

- `data/tenants/`
- `data/accounts/`
- `data/guides/`
- `data/research/`
- `data/calendar/`
- `data/<tenant>/content/`

Use `data.example/` only for anonymous public examples.

---

## 7-Stage Tenant Init Procedure

The Init wizard walks a tenant from zero to `readyToPost` through seven ordered stages. Each stage must be approved before the next one can begin. The dashboard wizard shows a copy-paste handoff prompt for agent stages in this exact format:

```
Run Init step "<stage-id>" (<Stage Label>) for <Tenant Name>
```

Paste that string into the chat to trigger the relevant agent work for that stage and tenant. The dashboard displays this string verbatim — the chat trigger must match it exactly.

Once a stage is saved (`in-review`), the wizard offers a second trigger alongside the Approve button, so the user can evaluate and refine the saved artifact in chat instead of approving blind:

```
Evaluate and refine Init step "<stage-id>" (<Stage Label>) for <Tenant Name>
```

When you receive this, read the saved artifact for that stage, assess it against the prior approved stages, and discuss or revise it with the user rather than treating it as final. The stage stays `in-review` until the user approves.

Status values: `not-started | in-progress | in-review | approved`

State is persisted at `data/<tenant>/setup/init.json`.

---

### Stage 1: `import-intake` — Import & intake

**Type:** Input (user fills; no agent handoff)

**Input artifact:** User supplies LinkedIn URL, website URL, existing brand assets (logos, PDFs, images), and free-text notes via the wizard intake form and asset uploader.

**Agent writes:** `data/<tenant>/setup/intake.md` (structured intake notes) and uploads to `data/<tenant>/setup/assets/`.

**Review gate:** User reviews the saved intake notes and asset manifest, then approves in the wizard.

**Loop-back:** If information is missing or incorrect, the user edits the intake form and re-saves before approving.

---

### Stage 2: `icp` — ICP

**Type:** Input / agent-assisted

**Handoff prompt:** `Run Init step "icp" (ICP) for <Tenant Name>`

**Input artifact:** Approved intake (stage 1), user-supplied audience notes.

**Agent writes:** `data/<tenant>/setup/icp.md` — Ideal Customer Profile covering job titles, industries, pain points, goals, objections, and where the audience spends time online.

**Review gate:** User reviews the ICP document and approves in the wizard.

**Loop-back:** If the ICP needs refinement, user provides corrections and the agent updates `icp.md` before re-approval.

---

### Stage 3: `vertical` — Vertical

**Type:** Input / agent-assisted

**Handoff prompt:** `Run Init step "vertical" (Vertical) for <Tenant Name>`

**Input artifact:** Approved ICP (stage 2), intake notes.

**Agent writes:** `data/<tenant>/setup/vertical.md` — vertical/niche definition: the specific market category, positioning statement, key proof points, and differentiation from adjacent verticals.

**Review gate:** User reviews the vertical definition and approves in the wizard.

**Loop-back:** If the vertical is wrong or too broad/narrow, user provides context and the agent revises before re-approval.

---

### Stage 4: `competitor-research` — Competitor research

**Type:** Review (agent produces; user approves)

**Handoff prompt:** `Run Init step "competitor-research" (Competitor research) for <Tenant Name>`

**Input artifact:** Approved ICP (stage 2), approved vertical (stage 3), list of competitor names/URLs from intake.

**Agent writes:** `data/research/<tenant>/competitors/` — per-competitor profiles covering positioning, content themes, posting cadence, engagement patterns, and strategic gaps. Login-gated competitor content (e.g. premium LinkedIn pages, paywalled posts) is captured using the auth-gated browser capture pattern from the `market-research` skill — the agent navigates through authenticated sessions rather than skipping gated content.

**Review gate:** User reviews the competitor profiles, then approves in the wizard.

**Loop-back:** If key competitors are missing or profiles are shallow, user adds URLs and the agent re-researches before re-approval.

---

### Stage 5: `design-system` — Design style & Design System

**Type:** Review (agent produces; user approves)

**Handoff prompt:** `Run Init step "design-system" (Design style & Design System) for <Tenant Name>`

**Input artifact:** Approved intake (stage 1), approved ICP (stage 2), approved vertical (stage 3), approved competitor research (stage 4), existing brand assets in `data/<tenant>/setup/assets/`.

**Agent writes:** The tenant's design system as **user-owned data** at `data/<tenant>/setup/design-system/` — brand tokens (`tokens.json`) and `@dsCard` HTML previews under `previews/`. The reusable, token-driven components live in the app (`apps/dashboard/src/design-system/`, system layer) and render any tenant's tokens; only the tenant's tokens and previews are written here. The agent uses the **frontend-design** skill to design the palette/type and author the previews with distinctive, production-grade styling. After authoring, the agent runs `/design-sync` to sync the `@dsCard` preview files (from `data/<tenant>/setup/design-system/previews/`) to a claude.ai/design Design System project for visual review.

**Design variation (do not generate cookie-cutter re-skins).** The `frontend-design` skill bans predictable, repeated layouts and converging on the same patterns. Enforce it here, because the default failure mode is theming one shared template across every tenant:

1. **Pull the brand's real signature from the live site, not just its tokens.** Inspect the site and copy its distinctive treatment directly into the previews — for example a `repeating-linear-gradient` line texture, a gradient bar, a logo SVG. Color and font alone are not a design system; they are a palette.
2. **Vary structure per brand, not just theme.** Each brand must differ in its *marker mechanism* (icon chip / gradient bar / rule / none), *corner treatment* (rounded vs sharp), *composition and density*, and *accent device*, not only its colors. A device (for example a short accent rule, an icon chip, a gradient bar) belongs to at most one brand.
3. **Banned defaults.** Do not reach for a short accent rule or a rounded 4px top/left bar by default. They are overused crutches. Choose a fresh, brand-specific device each time and justify it from the brand.
4. **The distinguishability test.** Strip the text from two brands' assets. If you cannot tell them apart by structure alone, they are re-skins, so redo them before review.
5. **Example copy in the previews follows `writing-rules.md`** (same folder). Placeholder copy still has to model the rules; it gets reused.

**Review gate:** User reviews the rendered component previews (both in the dashboard design-system panel and in the synced claude.ai/design project), then approves in the wizard.

**Loop-back:** If visual style needs revision, the agent re-runs the **frontend-design** skill with feedback, updates the component files and previews, re-syncs with `/design-sync`, and awaits re-approval.

---

### Stage 6: `voice` — Voice / copy

**Type:** Input / agent-assisted

**Handoff prompt:** `Run Init step "voice" (Voice / copy) for <Tenant Name>`

**Input artifact:** Approved intake (stage 1), approved ICP (stage 2), approved vertical (stage 3), approved competitor research (stage 4), approved design system (stage 5), user-supplied voice notes and reference examples.

**Agent writes:** `data/<tenant>/setup/voice.md` — brand voice guide covering tone, vocabulary, sentence rhythm, what to avoid, and 3–5 example posts demonstrating the voice in practice.

The voice guide **inherits the shared `writing-rules.md`** (in this skill folder) — those rules are universal across brands and do not get rewritten per tenant. `voice.md` adds only what is brand-specific: the **person** (a personal brand uses "I", an agency/company uses "we", a product/SaaS uses "you/your"), the tone and vocabulary, the content pillars, and the example posts. Because voice now follows the strategy stages, the tone, vocabulary, and content pillars are derived from the approved ICP, vertical, and competitor research: the pillars must speak to the ICP's buyer rather than a broader audience. Every example post must pass the shared rules' self-check.

**Review gate:** User reads the voice guide and example posts, then approves in the wizard.

**Loop-back:** If the voice guide misses the mark, user provides feedback and the agent revises `voice.md` before re-approval.

---

### Stage 7: `profile-build` — Profile build

**Type:** Review (agent produces; user applies manually)

**Handoff prompt:** `Run Init step "profile-build" (Profile build) for <Tenant Name>`

**Input artifact:** All approved prior stages (intake, ICP, vertical, competitor research, design system, voice).

**Agent writes:** `data/<tenant>/setup/profile-linkedin.md` (and equivalents for other channels) — a complete, copy-paste-ready profile spec covering banner design brief, headline, tagline, about section, featured section copy, and an apply checklist. State is tracked in `data/<tenant>/setup/profile-linkedin.json` via the `/api/profiles/<tenant>/<channel>/state` route.

**Review gate:** User reviews the drafted profile sections and approves in the wizard (`approved` state).

**Final human action (`applied`):** The tool never edits a live profile directly. After approval, the user manually applies each section to LinkedIn (or the relevant platform) following the apply checklist. Once done, the user marks the profile as `applied` via the wizard. This is the only state transition that requires a human action outside the tool — it is intentional and permanent.

**Loop-back:** If drafted sections need revision before applying, user provides feedback, the agent revises the spec file, and the profile returns to `in-review` before re-approval.

---

### Stage completion and `readyToPost`

Once all seven stages reach `approved` (or `applied` for `profile-build`), the tenant's `init.json` returns `readyToPost: true` from the `/api/setup/<tenant>/state` route. The content pipeline (posting, scheduling, campaigns) should not begin until this flag is set.

