---
name: content-pipeline
description: Draft and refine content items for a tenant's content motion, and capture learnings. Use when asked to "Fulfil content request", "Draft the next suggested content piece", "Refine content item", or "Apply learning" for a tenant.
---

# Content pipeline

You produce and refine content for a tenant's content motion. The dashboard writes intent to
`data/content/<tenant>/`; you read it, act, and write results back. Files are the source of truth.

## Inputs you read
- `data/content/<tenant>/requests/*.json` with `status: "pending"` — batches to fulfil.
- `data/content/<tenant>/items/*.json` — items; those in `in_review` with a new last `refineLog`
  entry summarised as "pending" need a refine pass.
- `data/content/<tenant>/cadence.json` — pillars and weekly targets.
- Init artifacts under `data/setup/<tenant>/`: `voice.md`, `icp.md`, `vertical.md`,
  `competitor-research.md`, and `design-system/tokens.json`.
- The shared rules in `skills/marketing-setup/writing-rules.md`. Apply them to every piece of copy.

## Drafting a piece (ContentItem)
1. Choose channel, format, angle, and pillar (fulfil the request, or the suggested gap).
2. Write the item to `data/content/<tenant>/items/<id>.json` matching the ContentItem shape:
   `assets[]` with routes. Copy and blog bodies are `route: "local-harness"` with `content`. Visuals,
   images, and video are `route: "external-tool"` with a `package` and `status: "needed"`, `tool`
   set to the intended image generator (for example `nano-banana` or `chatgpt`).
3. Set `state: "in_review"`. For a carousel, add a `carousel-visual` external asset whose package
   carries a `treatment` and self-contained per-slide image prompts built from
   `design-system/tokens.json`; see `skills/carousel-builder/SKILL.md`.
4. For a carousel, image post, or video, also write `caption`: the post's LinkedIn caption, one per
   post. Ground it, follow the writing rules, and cite any study or statistic it references. When the piece cites a study, report, or survey, also populate `citations` with a `{ label, url }` entry for each source, and name it in the caption.
5. Person voice matches the tenant type: a personal brand speaks as "I", an agency or company as "we", a product addressing its audience as "you/your".

## Link tagging (UTM)
When a piece links back to a property the tenant owns (a blog post, a landing page), suggest
appending UTM parameters so the click is attributable. Propose them; the user confirms. Map:
- `utm_source` — where the click came from (the platform), e.g. `linkedin`.
- `utm_medium` — the channel type, e.g. `social`.
- `utm_campaign` — a name for the push, e.g. `local-agent-post`.
- `utm_content` (optional) — to tell two links in the same piece apart, e.g. `bio-link` vs `comment-link`.

Example: `https://example.dev/post?utm_source=linkedin&utm_medium=social&utm_campaign=local-agent-post&utm_content=bio-link`

Only tag links the tenant owns; never add UTMs to external citations.

## Refining
Read the last pending `refineLog` entry, apply it to the relevant asset, and rewrite its `summary`
to describe what changed. Never invent facts; use the canonical facts in `voice.md`.

## Capturing learnings (write to `data/content/<tenant>/learnings.jsonl`)
- Performance signals -> `target: "cadence"`, `gate: "auto"`: apply the weight change to
  `cadence.json` immediately and record it in `cadence.updatedBy`.
- A repeated correction, a new fact, or a competitor observation -> `target` one of
  `voice|icp|vertical|competitor-research|profile`, `gate: "gated"`, `status: "pending"`, with a
  precise `proposedChange` (a before/after). Do NOT edit the identity artifact until an
  "Apply learning" instruction arrives (the user accepted it).

## Applying an accepted learning
On "Apply learning <id>": read the learning, edit the named artifact exactly as `proposedChange`
says, and set the learning `status: "accepted"` with `resultRef` pointing at the artifact.
