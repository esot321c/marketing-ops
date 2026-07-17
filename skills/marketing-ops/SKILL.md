---
name: marketing-ops
description: Coordinate local AI marketing operations for brand strategy, market research, website/blog/SEO planning, content pipelines, creative production, publishing prep, and analytics review. Use when the user asks for marketing ops, content operations, campaign planning, brand presence, social presence, marketing dashboard work, or a multi-step marketing workflow. Do not use for sales pipeline, account management, CRM, outbound outreach, contacts, leads, or deal tracking; those belong in the user's CRM.
---

# Marketing-Ops Router

Route the user's request to the right marketing workflow.

## Boundaries

Marketing-Ops owns marketing systems, not sales operations.

Do not manage:

- leads
- contacts
- accounts
- deal stages
- outbound outreach
- CRM follow-up

If the task becomes sales/account work, leave it for the user's CRM instead of tracking it here.

## Workflow Routing

- Market, competitor, audience, or SERP research: use `market-research`.
- Blog, SEO, social calendar, or campaign production: use `content-pipeline`.
- Turning one source asset into many posts: use `social-repurposer`.
- LinkedIn or Instagram cards/slides: use `carousel-builder`.
- Reels, TikTok, Shorts, or video scripts: use `video-script-builder`.

## Operating Sequence

For multi-step campaigns:

1. Confirm brand and objective.
2. Gather current context from `data/`, the user's local `strategy/` notes (if present), website pages, or user notes.
3. Research market and competitors.
4. Create or update the campaign/content brief.
5. Produce channel-specific drafts.
6. Run review checks.
7. Prepare publishing assets for human approval.
8. After publishing, review analytics and update next actions.

## Login-Gated Marketing Surfaces

For research or analytics on platforms such as LinkedIn, Instagram, TikTok, Meta, YouTube, Google Business Profile, Search Console, or social account dashboards, expect login gates.

If login is required, open the relevant page, pause, ask the user to log in manually, and resume only after confirmation. Do not replace the gated source with weaker public data unless the user chooses to skip login.

Use small batches on logged-in platforms. Do not run rapid repeated searches, infinite scroll loops, or broad automated scraping. Capture the current page, save notes, and resume in later passes when more authenticated research is needed.

## Capability outputs

When the user asks for marketing work matching one of these phrases, run the associated workflow and save the result to the specified path. The dashboard lists and renders files from these locations, so saving to the exact path with the frontmatter makes them appear.

| When the user asks | Run | Save to |
|---|---|---|
| `Plan a campaign for <Tenant Name>` | the campaign operating sequence | `data/<tenant>/work/campaigns/<slug>.md` |
| `Draft an SEO and content strategy for <Tenant Name>` | content-pipeline (with market-research input) | `data/<tenant>/work/strategy/<slug>.md` |
| `Research keywords for <Tenant Name>` | market-research | `data/<tenant>/work/keywords/<slug>.md` |
| `Run competitor research for <Tenant Name>` | market-research | `data/<tenant>/work/research/<slug>.md` |
| `Review analytics for <Tenant Name>` | analytics review then next actions | `data/<tenant>/work/analytics/<slug>.md` |

Each saved file starts with frontmatter fields `title`, `created` (ISO date), and `status` (`draft`, `active`, or `done`), followed by the body.

### Next steps after Init

Once a tenant is `readyToPost`, run the prep capabilities in order: competitor research, keyword research, content and SEO strategy, then a first campaign. Analytics follows once there are live posts. Surface the outstanding prep to the user proactively and when asked what is next; do not leave it for the user to find. Save each output to `data/<tenant>/work/<type>/<slug>.md` with the `title`, `created`, and `status` frontmatter.

## Human Review

Never publish, send, schedule, or externally submit content without explicit user approval at action time.
