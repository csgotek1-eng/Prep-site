# BRANCH INTEGRATION PLAN

Current unmerged branches relative to `main`
(@ 6c3093e, Stage 3 head):

| Branch | Contents | Base |
| --- | --- | --- |
| `claude/website-stage-4-launch-readiness` | Docs only: legal input templates, privacy/terms drafts, launch checklist blocking items, env matrix, Vercel settings plan | main (Stage 3) |
| `claude/website-pricing-admin` | Pricing calculator + admin (code + docs) | main (Stage 3) |
| `claude/website-pricing-admin-production-foundation` | Production persistence + auth foundation (code + docs + SQL schema) | claude/website-pricing-admin |

## Conflict analysis (verified with git merge-tree)

Merging the Stage 4 branch with this pricing chain conflicts in exactly
one file:

- `docs/PROJECT_STATUS.md` — CONTENT CONFLICT. Both sides rewrote the
  "CURRENT STAGE" header block (Stage 4 status vs. pricing-stage
  status). Resolution is mechanical: keep BOTH stage sections, order
  them newest-first, and keep the union of NEXT / KNOWN ISSUES entries.

Everything else merges cleanly:

- Stage 4's new files (`LEGAL_INPUTS_REQUIRED.md`,
  `PRIVACY_POLICY_DRAFT.md`, `WEBSITE_TERMS_DRAFT.md`) don't exist on
  the pricing chain.
- Stage 4's edits to `DEPLOYMENT_ENV.md`, `PRODUCTION_CHECKLIST.md`,
  `LEGAL_REQUIREMENTS.md` touch sections the pricing chain never edits.
- README: Stage 4 did not modify README (its README-affecting work
  happened in Stage 3, already in main); the pricing chain's README
  additions are new sections — no conflict.
- No code files overlap: Stage 4 is documentation-only.

## Safest integration order

1. **Merge `claude/website-stage-4-launch-readiness` into `main`
   first** (fast-forward is possible only for the first merge; this one
   is docs-only and lowest-risk — review, then `--ff-only` works since
   main is still its base).
2. **Merge `claude/website-pricing-admin-production-foundation` into
   `claude/website-pricing-admin`** (fast-forward — it is a linear
   continuation), or treat the production-foundation branch as the
   review head for the whole pricing chain.
3. **Merge the pricing chain into `main`** (now containing Stage 4).
   This is a true merge, not a fast-forward, and hits the single
   `docs/PROJECT_STATUS.md` conflict — resolve by stacking both stage
   sections (pricing stage newest-first) and unioning NEXT / KNOWN
   ISSUES. Re-run `npm test && npm run lint && npm run typecheck &&
   npm run build` on the merge result before pushing.

Doing it in the opposite order (pricing first) is equally safe
technically, but Stage-4-first is preferred because the docs-only merge
is trivially reviewable and the conflict is then resolved once, on the
larger branch, where the stage narrative lives.

Do not delete any branch after merging until the user confirms.
