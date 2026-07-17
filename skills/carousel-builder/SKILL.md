---
name: carousel-builder
description: Turn a content angle into a LinkedIn carousel slide sequence in the tenant's design system. Use when drafting or refining a carousel content item.
---

# Carousel builder

Turn one angle into 4-6 slides for a `carousel` ContentItem. A carousel is a deck of images, so
write every slide for the image it will become, not as a text post split into frames. Slides are
infographics: each one teaches a single point, and the strongest slide is usually a chart or a
diagram, not a paragraph.

## Slide copy

- Slide 1 is the hook: a claim or a question, no filler. The middle slides develop it with one
  instructional idea each, in one or two short sentences. The final slide is the takeaway plus the
  tenant URL.
- Lead with the most surprising, verifiable fact in the material and turn it into a visual. A
  number that changes direction (predicted up, measured down) makes a chart worth the whole post.
  Any figure on a slide needs its context on that slide and its named source in the caption.
- Write slides into the `copy` local-harness asset as `content.slides[]` of
  `{ heading, body?, bullets?, visual?, dark? }`. When a slide's content is a list, put a
  full-sentence lead-in in `body` and the items in `bullets` (one short item each); never punctuate
  fragments as sentences inside `body`. Use `visual` to describe the infographic (for example
  "diverging bar chart from a zero axis" or "two contrasting panels"). Alternate `dark` sparingly
  (at most one or two dark slides), and give the dark slide to the chart when there is one.

## Rendering (HTML first)

Render slides from HTML in the tenant design system; do not ask a generative image model to draw
typographic slides, because generated images garble text and drift off-brand.

1. Build one HTML file with a 1080x1080 `.slide` section per slide, styled from
   `design-system/tokens.json` (paper, ink, accent, display and body fonts). Save it to
   `data/<tenant>/content/renders/<item>/slides.html` so it can be edited and re-rendered.
2. Give each slide a real infographic layout: bar charts sized so the bars are proportional to
   their values, checklists, comparison panels, numbered cards. Load brand fonts and wait for
   `document.fonts.ready` before capturing.
3. Serve the folder locally and screenshot each `.slide` element at 1080x1080 with Playwright,
   saving as `slide-NN.png` (1-based, zero-padded) into `data/<tenant>/content/assets/<item>/`,
   which is where the dashboard's slide panel reads images from.
4. Export the deck as a multi-page PDF, because LinkedIn uploads carousels as PDF documents. Add
   `@page { size: 1080px 1080px; margin: 0; }` and a print rule giving each `.slide` a
   `page-break-after`, then print the page to `<item>.pdf` in the same assets directory (Playwright
   `page.pdf` with `printBackground: true` and `preferCSSPageSize: true`, or headless Chrome's
   `--print-to-pdf`). Text stays vector, one slide per page. Verify the page count matches the
   slide count.
5. Set the `carousel-visual` asset's `resultRef` to that assets directory, put a short render note
   in `package.prompt` (source HTML path and what each slide shows), and set `status: "ready"`.

Generative images are for background art only (`treatment: "text-on-art"`), when a piece wants an
atmospheric backdrop behind design-system text. Keep those prompts loose and artistic; never pack
copy, hex codes, or font names into a generative prompt. `package.slidePrompts` exists for that
external handoff and stays unset for HTML-rendered decks.

## Caption and citations

- Write the post `caption` on the item: the LinkedIn feed text that sits above the slides. One
  caption per post, not one per slide. Ground it in the tenant's real material, keep it short, end
  with the tenant URL, and follow `skills/marketing-setup/writing-rules.md`.
- When the carousel cites a study, report, or survey, add each source to the item's `citations`
  array as `{ label, url }` (label is the source name, url is the link) and name it in the caption.
  Verify every on-slide figure against the source before rendering.
- Apply `skills/marketing-setup/writing-rules.md`: plain punctuation, no em dashes, no
  rule-of-three cadence, no negative parallelism, defensible claims only.
