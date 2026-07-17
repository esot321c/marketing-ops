# Example Data

This folder is safe to commit and share publicly.

Real workspaces should use `data/`, which is gitignored by default.

Layout is tenant-first, mirroring `data/`: each tenant is a top-level directory containing its own
`setup/`, `work/`, `content/`, and `analytics/` subfolders (for example `data.example/example-agency/setup/`).
Global, non-tenant files live under `data.example/shared/`. The `data.example/tenants/*.json` files
are a separate id/name registry, not part of the per-tenant folders.

Use `data.example/` for:

- anonymous tenants
- demo campaigns
- template content
- public onboarding examples

Use `data/` for:

- private tenants
- actual accounts
- real content drafts
- analytics exports
- private guides
