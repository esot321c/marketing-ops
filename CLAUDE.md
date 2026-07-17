# CLAUDE.md — Marketing-Ops

## THIS IS A PUBLIC, OPEN-SOURCE REPOSITORY

Everything committed, pushed, tagged, or published here is world-readable and effectively
permanent. Treat every tracked file, commit message, CHANGELOG entry, GitHub release note, PR
title/body/comment, issue, and tag as public.

## Never publish private or personal information

Do NOT put any of the following into anything tracked or published (code, tests, fixtures, docs,
CHANGELOG, releases, PRs, tags, commit messages):

- The repo owner's or any real person's name, handle, or identity. Do not name a specific person
  or tenant (for example, do not write a real person's name in the CHANGELOG, release notes, code,
  tests, skills, or example data).
- Real personal or brand content treated as the owner's private data: voice/tone docs, ICPs, real
  post copy, real company or product names, real domains, real biographical or project details.
- Anything under `data/`. It is git-ignored, user-owned, and PRIVATE. Never copy or move `data/`
  content into tracked files, into `data.example/`, into code, tests, or docs.
- Secrets, tokens, API keys, or `.env` values.

## Use anonymous placeholders in anything tracked

- Public example data lives in `data.example/` and MUST be anonymized: use invented tenants like
  `example-agency`, domains like `example.com`, and invented copy. Never seed `data.example/` from a
  real `data/` tenant.
- Tests, fixtures, and default UI strings use neutral placeholders (`example-tenant`, `example.com`),
  never a real person, brand, or domain.
- The CHANGELOG and GitHub releases describe features generically. Never name a real tenant or person
  in them.

## Before ANY publish (commit, push, PR, release, tag)

- Scan the diff for real names, real domains, and private content. If anything looks personal, STOP
  and ask the human before publishing.

## Recording analytics

Post analytics arrive two ways and BOTH must land in the structured store
`data/<tenant>/analytics/posts.json`, which feeds the dashboard's analytics charts:

- Exported files (for example LinkedIn XLSX exports) dropped into
  `data/<tenant>/analytics/imports/` import automatically while the dashboard server runs.
- Numbers the user pastes or types into chat: the agent appends them to `posts.json` as a
  capture with `source: "manual"` on the matching post record (match by urn or postUrl when
  known, otherwise a stable slug id), never fabricating fields the paste does not contain
  (absent numbers are null). Link the post to its content item via `itemId` when one exists.

The markdown log under `data/<tenant>/work/analytics/` stays the narrative layer
(observations, hypotheses, capture schedules); it is not the database. Record numbers in
`posts.json` first, then update the narrative log.

## Surfacing capabilities

When the user asks for a campaign, an SEO or content strategy, keyword research, competitor research, or an analytics review, save the result to `data/<tenant>/work/<type>/<slug>.md` with `title`, `created`, and `status` frontmatter so the dashboard shows it. The five types are `campaigns`, `strategy`, `keywords`, `research`, and `analytics`. When a workspace is ready, proactively tell the user these capabilities exist and how to ask, for example by pointing them at the Ask panel in the dashboard.

### Next steps after Init

After Init reaches `readyToPost`, the prep work is not finished. The agent's next job is to run competitor research, research keywords, draft a first content and SEO strategy, and plan a first campaign, in that order. Analytics comes later, once posts are live. Do not wait for the user to ask. When Init completes, and whenever the user asks what is next, tell them which prep pieces are still outstanding and offer to do them. Ask any questions you need, then save each result to `data/<tenant>/work/<type>/` so the dashboard shows it. Treat the four prep pieces (research, keywords, strategy, campaigns) as the agent's outstanding work, not the user's. The user finished Init; surfacing and doing the prep is on the agent.

## Base writing rules: always on, everywhere

The full shared rules are `skills/marketing-setup/writing-rules.md`; a tenant's `voice.md` layers
persona (person, tone, vocabulary, canonical facts) on top. The core rules below bind ALWAYS: in
drafts, slides, captions, strategy docs, and any line of copy proposed in chat. A hook pitched in
conversation is copy. Run these checks before showing it, not after.

- Verify first, then write. Any claim about the world (what people do or say, dates, releases,
  study findings, statistics) needs a verified, recent, primary source, named where the claim
  appears. Check the source page for follow-ups and updates before citing it. If no evidence
  exists, cut the claim or label it explicitly as an assumption.
- Never invent or embellish. No fabricated behavior ("the reflex is to...", "teams treat..."),
  no invented recency ("just shipped" without a dated announcement), no story details beyond the
  source, no "every / most / always" without data.
- A generalizing filler sentence that would need a citation gets deleted, not sourced. The post
  works without it.
- Complete sentences in the tenant's register. No comma-spliced fragment cadence, no rule-of-three
  beats, no slogan-shaped or aphoristic punchlines, no negative parallelism, no cleft sentences.
  Punchiness comes from having something specific to say.
- Plain keyboard punctuation only. No em dashes, anywhere, including chat replies.
- Open with the reader's problem or with what happened, never with "I built". The takeaway follows
  the events that earn it, and every post gives the reader something they can use.

## Generating content: ground it in real material, never fabricate

When you generate posts, carousels, campaigns, strategy, example copy, or any content for a tenant,
ground every claim in real material. For a personal authority brand this is the whole game, because a
single fabricated claim, once posted, destroys the credibility the brand is built on.

- Never invent a first-person claim, experience, story, or insight and attribute it to the person. If
  they did not say it or do it, do not write it in their voice.
- Do not assert what a person uses, does, or has seen unless it is verified in their real sources.
  When the point is general advice rather than their verified practice, use educational or decision
  framing ("how to decide when to X"), not false first-person ("when I do X").
- Draw content only from the tenant's real sources (their site and blog, their voice and
  canonical-facts guide, their shipped work, their approved material under `data/`) or from a real,
  verifiable external source you have actually checked and can cite.
- Model formats and angles on real, high-performing examples from the competitor and reference
  research, not on invented patterns. Label any unconfirmed angle as a suggestion; never present an
  invention as the person's experience or as something people say.
- If you cannot ground a claim, cut it or ask. Do not fill the gap with a plausible fabrication.
- Cite studies and statistics. Any claim drawn from a study, report, or survey must name its source so
  a reader can verify it, and for a carousel the citation belongs in the caption. See
  `skills/marketing-setup/writing-rules.md`.

## Deleting or moving files

- Never delete or move a file without confirming with the human first. Private content may need to
  be PRESERVED by moving it into git-ignored `data/`, not deleted. When something private is found in
  a tracked location, propose whether to anonymize it in place or move the real version into `data/`,
  and get approval before acting.
