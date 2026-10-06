# Tasks: Field help in place

Woo row 13.18. Wave 1. Every test named here fails on `development` today:
`fieldsFromSchema()` emits no `help`, and `CnFieldHelper` has no `help` prop
and hides its button on error.

- [ ] 1. `src/utils/schema.js`: read `x-help` in `fieldsFromSchema()`, emit `help`, warn once on a bad type. Test: `tests/utils/fieldsFromSchemaHelp.spec.js` (string, language map with fallback, absent, malformed). Show the string case failing on `development` first; paste the line in the PR body.
- [ ] 2. `src/components/CnFieldHelper/CnFieldHelper.vue`: the `help` prop, the toggletip (name "About {label}" through a new optional `label` prop, `aria-expanded`, Enter, Space, click, Escape with focus return, polite live region), help kept on error, unchanged markup without help or more. Test: `tests/components/CnFieldHelper.spec.js` extended (keyboard, Escape and focus, error state, a snapshot of the no-help case taken on `development` before the change and asserted after).
- [ ] 3. Pass `help` and `label` through `CnFormDialog.vue`, `CnAdvancedFormDialog.vue` and every other component that renders `CnFieldHelper` (find them with `grep -rl CnFieldHelper src/components`, and list them in the PR body). Test: `tests/components/CnFormDialogHelp.spec.js` mounts `CnIndexPage`'s create dialog over a schema with `x-help` and opens the help; this is the caller-side proof that the prop reaches a real form.
- [ ] 4. Accessibility. Run `npm run check:a11y` and the axe check in `tests/components/CnFormDialog.spec.js` with a help-bearing field; WCAG 2.2 AA, no new violation.
- [ ] 5. Docs: `CnFieldHelper` docs and `docs/components` (what `x-help` is, how it differs from `description`, the language map), regenerated with `npm run check:docs` and `npm run check:docs-fresh` green. l10n: the "About {label}" string in the library's translation sources.
- [ ] 6. Release: commit as `feat(CnFieldHelper): ...`. No `BREAKING CHANGE:` footer, no `!`, no major version. After the minor is released, record in the PR body which consuming apps pick it up on `^2` (the list in `proposal.md`).

## Verification

The building agent follows `openspec/woo-build-rules.md` where it applies to a JavaScript library:

- [ ] Own clone, `git checkout --no-track -b <branch> origin/development`, `TMPDIR` a sibling outside the clone.
- [ ] Once before push: `npm run lint`, `npm run stylelint`, `npm test`, `npm run check:a11y`, `npm run check:public-safe`, `npm run check:docs`, `npm run check:docs-fresh`, `npm run check:vue3-compile`, `npm run build`. Read each exit code and the test summary, not a match count.
- [ ] `openspec validate field-help-in-place --type change --strict` passes.
- [ ] One PR, `--base development`; merge `development` in, never rebase; no `Co-Authored-By` trailer.
- [ ] Done means merged on `development` with CI green and released as a `2.x` minor.
