# Production boundaries

Hamagiku and Shinba Report are separate products. Hamagiku is the POC and
production system; useful, reviewed capabilities may be ported to Shinba
Report deliberately, but the two products must never share a deployment
source or production target by accident.

## Fixed ownership

| Product | Source | Production surface | Google Cloud project | Supabase |
| --- | --- | --- | --- | --- |
| Hamagiku | `main` | Cloudflare Pages `hamagiku-reportapp` | `first-api-spread` / `hamagikureoprtapp2` | `srhthxknehzofuzjjrhh` |
| Shinba Report | `codex/shinba-production` | Cloud Run `shinba-report-frontend` + `shinba-report-backend` | `shinba-report` | `qlebmpirqfkhierfjqxv` |

## Required workflow

1. Hamagiku production changes are made on `main` and deployed only through
   the `hamagiku-reportapp` Cloudflare Pages production project.
2. Shinba changes are made on `codex/shinba-production` and deployed only to
   the two `shinba-report` Cloud Run services.
3. A Hamagiku worktree must never be used for a Shinba deployment, and a
   Shinba worktree must never be used for a Hamagiku deployment.
4. Before either production deployment, run:

   ```powershell
   .\scripts\guard-production-deploy.ps1 -Target hamagiku
   .\scripts\guard-production-deploy.ps1 -Target shinba
   ```

   The guard fails when the branch is wrong, the worktree is dirty, or the
   product data targets are not distinct.
5. Do not merge the entire Hamagiku POC into Shinba. Port a selected feature
   in a reviewed change on the Shinba branch, with a separate build and
   smoke test.

## Recovery points

- Hamagiku Pages production can be restored from its last known-good `main`
  commit or Cloudflare deployment history.
- Shinba Report is currently routed back to the pre-incident Cloud Run
  revisions `shinba-report-backend-00051-tkt` and
  `shinba-report-frontend-00166-rjb`.
