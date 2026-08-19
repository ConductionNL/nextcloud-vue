# Tasks: public-manifest-runtime

> Boot/transport only (ADR-032 `kind: code`). No component changes.
> Checkbox budget: 3 tasks × 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation Tasks

### Task 1: Host mode in bootstrapCnApp
- **spec_ref**: `openspec/changes/public-manifest-runtime/specs/public-manifest-runtime/spec.md#requirement-bootstrapcnapp-must-accept-a-host-mode-and-default-to-nextcloud`
- **files**: `src/bootstrap/bootstrapCnApp.js`, `src/bootstrap/__tests__/bootstrapCnApp.spec.js`
- **acceptance_criteria**:
  - `host` defaults to `'nextcloud'`; an app calling without it boots byte-identically to before — asserted against a recorded pre-change boot, not by inspection
  - `'public'` mounts the caller-supplied element and never looks for `#app-content`
  - An unrecognised value throws naming the accepted set; it does NOT fall back to either mode
- [ ] Implement
- [ ] Test

### Task 2: Public transport in cnFetch
- **spec_ref**: `openspec/changes/public-manifest-runtime/specs/public-manifest-runtime/spec.md#requirement-public-transport-must-use-a-bearer-credential-and-must-not-leak-it`
- **files**: `src/utils/cnFetch.js`, `src/utils/__tests__/cnFetch.public.spec.js`
- **acceptance_criteria**:
  - Public mode sends the bearer credential and NO `requesttoken`; nextcloud mode is unchanged
  - URLs resolve from the configured base; `generateUrl` is not called in public mode
  - The credential appears in no URL, log line or error payload — asserted on a deliberately failing request, since that is the path that serialises context
- [ ] Implement
- [ ] Test

### Task 3: Globals-free integration test with a positive control
- **spec_ref**: `openspec/changes/public-manifest-runtime/specs/public-manifest-runtime/spec.md#requirement-a-manifest-must-render-with-no-nextcloud-globals-present`
- **files**: `tests/integration/publicHostBoot.spec.js`, `src/components/**` (fixes only where a component reaches for a global)
- **acceptance_criteria**:
  - The environment DELETES `OC`, `OCA`, `OCP` and the `requesttoken` element before booting
  - The control runs FIRST: the same manifest booted with `host: 'nextcloud'` in that environment must FAIL, and that failure is asserted — otherwise a green public-mode test proves only that the environment supplied the globals anyway
  - A component reaching for a Nextcloud global fails the test by name; the fix goes into the component, and a `host` prop is not added
  - The test covers at least one page of each type the portal will serve, so the pass is not a single-page result generalised
- [ ] Implement
- [ ] Test
