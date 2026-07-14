---
name: carousel-builder
description: Turn a content angle into a LinkedIn carousel slide sequence in the tenant's design system. Use when drafting or refining a carousel content item.
---

# Carousel builder

Turn one angle into 4-6 slides for a `carousel` ContentItem. A carousel is a deck of images, so
write every slide for the image it will become, not as a text post split into frames.

- Slide 1 is the hook: a claim or a question, no filler. Slides 2-4 develop it with one
  instructional idea each, in one or two short sentences. The final slide is the takeaway plus the
  tenant URL.
- Write slides into the `copy` local-harness asset as `content.slides[]` of
  `{ heading, body?, bullets?, visual?, dark? }`. When a slide's content is a list, put a
  full-sentence lead-in in `body` and the items in `bullets` (one short item each); never punctuate
  fragments as sentences inside `body`. Use `visual` for a one-line art direction, for example
  "numbered checklist" or "two-column comparison". Alternate `dark` sparingly (at most one or two
  dark slides).
- Add a `carousel-visual` external asset whose `package` carries the image handoff:
  - `treatment: "infographic"` when the generator should produce the finished slide, or
    `"text-on-art"` when the generator produces only background art and the text layer stays in
    the tenant design system. Pick per piece.
  - `slidePrompts`: one self-contained prompt per slide (`{ slide, prompt }`, 1-based). Bake the
    brand tokens from `design-system/tokens.json` (paper, accent, display and body fonts), a 1:1
    aspect ratio, the layout, and that slide's content into every prompt, so pasting a single
    prompt into any image generator yields that slide and one slide can be re-generated alone.
  - `prompt`: the deck-level shared style summary.
  - `tool`: the intended generator, for example `nano-banana` or `chatgpt`; use `claude-design`
    only for composing the text layer of a text-on-art deck.
- The user pastes each prompt into the generator and drops the result onto the slide in the
  dashboard; images are stored as `slide-NN.png` under `data/content/<tenant>/assets/<item>/`.
- Write the post `caption` on the item: the LinkedIn feed text that sits above the slides. One
  caption per post, not one per slide. Ground it in the tenant's real material, keep it short, end
  with the tenant URL, and follow `skills/marketing-setup/writing-rules.md`. If the carousel cites
  a study or a statistic, name that source in the caption, and never put a number on a slide
  without its context.
- When the carousel cites a study, report, or survey, add each source to the item's `citations`
  array as `{ label, url }` (label is the source name, url is the link) and name it in the caption.
  The `citations` are the structured record of the study-citation rule.
- Apply `skills/marketing-setup/writing-rules.md`: plain punctuation, no em dashes, no
  rule-of-three cadence, no negative parallelism, defensible claims only.
