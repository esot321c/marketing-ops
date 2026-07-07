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

## Surfacing capabilities

When the user asks for a campaign, an SEO or content strategy, keyword research, competitor research, or an analytics review, save the result to `data/work/<tenant>/<type>/<slug>.md` with `title`, `created`, and `status` frontmatter so the dashboard shows it. The five types are `campaigns`, `strategy`, `keywords`, `research`, and `analytics`. When a workspace is ready, proactively tell the user these capabilities exist and how to ask, for example by pointing them at the Ask panel in the dashboard.

## Deleting or moving files

- Never delete or move a file without confirming with the human first. Private content may need to
  be PRESERVED by moving it into git-ignored `data/`, not deleted. When something private is found in
  a tracked location, propose whether to anonymize it in place or move the real version into `data/`,
  and get approval before acting.
