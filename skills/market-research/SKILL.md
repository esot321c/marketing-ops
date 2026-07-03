---
name: market-research
description: Research competitors, content patterns, SERPs, social formats, audience language, positioning gaps, and marketing opportunities. Use for competitor research, market research, SEO/AEO research, social pattern analysis, content gap analysis, and campaign research. Do not manage prospect accounts, outreach, lead lists, or sales pipeline.
---

# Market Research

Use this skill to produce marketing intelligence, not sales account intelligence.

## Inputs

Use the available context:

- brand profile from `data/brands/`
- campaign brief from `data/campaigns/`
- website pages
- competitor URLs
- search results
- social examples supplied by the user

## Output

Create a research brief with:

- market question
- audience being studied
- competitors or examples reviewed
- messaging patterns
- content formats that appear to work
- SEO/AEO opportunities
- creative opportunities
- risks and sameness traps
- recommended next marketing actions

## Rules

- Cite sources when browsing.
- Distinguish observed facts from inferences.
- Do not scrape private data.
- Do not build lead lists.
- Do not recommend outreach cadences.

## Auth-Gated Sources

Some high-value research sources require a logged-in browser session, including LinkedIn organic search, Instagram, TikTok detail pages, Meta Ads Library details, YouTube Studio, Google Search Console, and social analytics.

When a source redirects to login or hides the needed data:

1. Navigate to the exact source or search URL.
2. Tell the user what source needs login and why.
3. Pause and let the user log in manually.
4. Continue only after the user confirms they are in.
5. Capture only visible/public or user-authorized information.
6. Record login limitations in the research notes.

Do not switch sources silently when login would materially improve the research.

## Authenticated Source Throttling

For LinkedIn, Instagram, TikTok, Meta, YouTube, and other logged-in or rate-sensitive sources:

- use small batches,
- prefer the current visible page before running new searches,
- avoid rapid multi-query loops,
- save screenshots and notes so research can resume later,
- stop if the platform shows checkpoint, captcha, suspicious activity, or session-warning UI,
- use public/non-auth sources for broader collection when logged-in collection is not essential.
