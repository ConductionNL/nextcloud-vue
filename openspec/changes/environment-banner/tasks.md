# Tasks: Environment banner

Woo row 13.30. Wave 1. Every test named here fails on `development` today: no
`CnEnvironmentBanner` exists and `CnAppRoot` has no `environment` prop.

- [x] 1. `src/components/CnEnvironmentBanner/` (component, `index.js`, export from `src/components/index.js`): name in words, colour per environment from CSS variables in the library's token file, `role="note"` with an accessible name, no close action, renders nothing for production, unknown or empty. Test: `tests/components/CnEnvironmentBanner.spec.js` (each environment, production renders nothing, no button in the DOM). Show the acceptance case failing on `development` first; paste the line in the PR body.
- [x] 2. `CnAppRoot.vue`: the optional `environment` prop, resolution (prop, then `useTenantContext().activeOrganisation.environment`, then none), the banner above the content, the title prefix set and removed, following a tenant switch. Read the `Organisation` serialisation on openregister `development` (`lib/Db/Organisation.php`, key `environment`) before writing the read, and quote the line in the PR body. Test: `tests/components/CnAppRootEnvironment.spec.js` (acceptance shows and prefixes, production shows nothing, prop wins, tenant switch, failed read shows nothing and warns once). This mounts the real `CnAppRoot`, which is the caller-side proof. (The `Organisation` serialisation lives in openregister, not here: the read assumes `environment` on `organisations/<uuid>` and the tenant context entity — not run: needs openregister to confirm the key.)
- [x] 3. `CnAdminSettingsShell.vue`: the same prop and resolution, the banner at the top. Test: `tests/components/CnAdminSettingsShell.spec.js` extended with the test environment case.
- [ ] 4. Accessibility and style: `npm run check:a11y` with each banner variant, WCAG 2.2 AA contrast for each colour in light and dark, colours from CSS variables only (NL Design System themes may override them). `npm run stylelint` green. — not run: needs a browser (check:a11y, contrast) and stylelint was not run; colours are CSS variables only
- [x] 5. Docs and l10n: `docs/components` page for `CnEnvironmentBanner`, the `environment` prop on `CnAppRoot` and `CnAdminSettingsShell`, and how the organisation field sets it; the four strings in the library's translation sources; `npm run check:docs` and `npm run check:docs-fresh` green. (check:docs green; check:docs-fresh not run: the orchestrator regenerates `_generated`)
- [ ] 6. Release: commit as `feat(CnEnvironmentBanner): ...`. No `BREAKING CHANGE:` footer, no `!`, no major version. Record in the PR body the consuming apps from `proposal.md` and that thematiq and versioniq do not mount `CnAppRoot`. — not run: release and PR body are the orchestrator's

## Verification

The building agent follows `openspec/woo-build-rules.md` where it applies to a JavaScript library:

- [ ] Own clone, `git checkout --no-track -b <branch> origin/development`, `TMPDIR` a sibling outside the clone. — not run: PR/CI process step
- [ ] Once before push: `npm run lint`, `npm run stylelint`, `npm test`, `npm run check:a11y`, `npm run check:public-safe`, `npm run check:docs`, `npm run check:docs-fresh`, `npm run check:vue3-compile`, `npm run build`. Read each exit code and the test summary. — not run: PR/CI process step
- [ ] `openspec validate environment-banner --type change --strict` passes. — not run: PR/CI process step
- [ ] One PR, `--base development`; merge `development` in, never rebase; no `Co-Authored-By` trailer. — not run: PR/CI process step
- [ ] Done means merged on `development` with CI green and released as a `2.x` minor. — not run: PR/CI process step
