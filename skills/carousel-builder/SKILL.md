---
name: carousel-builder
description: Turn a content angle into a LinkedIn carousel slide sequence in the tenant's design system. Use when drafting or refining a carousel content item.
---

# Carousel builder

Turn one angle into 4-6 slides for a `carousel` ContentItem.

- Slide 1 is the hook: a claim or a question, no filler. Slides 2-4 develop it with one idea each.
  The final slide is the takeaway plus the tenant URL.
- Write slides into the `copy` local-harness asset as `content.slides[]` of `{ heading, body?, dark? }`.
  Alternate `dark` sparingly for emphasis (at most one or two dark slides).
- Add a `carousel-visual` external asset with `tool: "claude-design"` and a package prompt that
  references the tenant's `design-system/tokens.json` (paper, accent, display and body fonts) and
  restates the slide copy, so the user can render the on-brand visual in Claude Design.
- Apply `skills/marketing-setup/writing-rules.md`: plain punctuation, no em dashes, no rule-of-three
  cadence, no negative parallelism, defensible claims only.
