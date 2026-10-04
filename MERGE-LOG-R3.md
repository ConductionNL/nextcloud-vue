# MERGE-LOG-R3 (land-ncv-r3 lane, 2026-09-28)

- 1268 feat/store-page-action-visibility: start; branch HEAD 3bf9bec297 (= origin, no unpushed commits); origin/development 51e60c8c6 (4 commits ahead of the branch base: #1269, #1270, #1271, #1273)
- 1268 baseline: jest on detached origin/development 51e60c8c6, exit 0, 804 suites / 9936 tests / 0 failed (list .tmp/fail-baseline.txt, empty)
- 1268 merge development: conflicts no; no `<<<<<<<` markers; merge commit ca1f68ec7e (git default message, not the plain one; already pushed, not amended since force-push is forbidden)
- 1268 merged tree: jest exit 0, 804 suites / 9947 tests / 0 failed, new failures vs baseline 0; `npm run lint` exit 0 (1 inherited warning, CnMapWidget.vue:125 jsdoc/reject-any-type, not in this PR); `npm run build` exit 0; package.json version untouched (2.0.5)
- 1268 pushed ca1f68ec7e; `git ls-remote` = local HEAD
- 1268: `gh pr merge 1268 --squash --admin` REFUSED by ruleset ("3 of 3 required status checks are expected"). One checks read: 27 pending, 6 skipping, 0 failing (CI re-triggered by the push, run 36390345907; required jobs incl. "Dist sideEffects (tree-shaking)" and "Playwright (e2e)" pending). Not polled per rules. PREPARED, UNMERGED: re-run the same `gh pr merge` once CI is green.
- development tip after lane: 51e60c8c6 (unchanged)
