# Woo build queue for this repository

2 OpenSpec changes in this repository close gaps in the Woo capability programme. Each has a change folder under `openspec/changes/` and an issue titled `[OpenSpec] <change-name>` that the OpenSpec workflow keeps in step with the spec.

## How to pick up a change

1. Take the first change below whose dependencies are all merged on `development`. A dependency in another repository is linked to its issue there; check that issue's linked PR is merged.
2. Inside a wave, the order below is the order to build. Statutory rows come first.
3. Read `openspec/woo-build-rules.md` before the first command, then the change's `proposal.md`, its specs and its `tasks.md`.
4. The decisions the specs cite (D1 to D13) are in `openspec/woo-decisions.md`. A spec never contradicts one. If a task seems to, stop and say so in the issue.
5. Work on the branch the issue names, open one PR with `--base development`, and close the issue through the PR.

Two things need a person, not an agent: settling the Woo refusal grounds against the law (dossiq `woo-refusal-grounds-list`, task 1, blocks seeding), and the screen-reader pass for row 15.5.

## Wave 1

| change | rows | depends on |
|---|---|---|
| [nextcloud-vue/environment-banner](https://github.com/ConductionNL/nextcloud-vue/issues/1320) | 13.30 | nothing |
| [nextcloud-vue/field-help-in-place](https://github.com/ConductionNL/nextcloud-vue/issues/1321) | 13.18 | nothing |
