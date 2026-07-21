# Proposal: wcag-a11y-anchor

## Summary

Anchor WCAG/accessibility checking ONCE in `@conduction/nextcloud-vue`
so every consuming app inherits it org-wide, instead of each app
hand-rolling (or, more realistically, skipping) accessibility testing.
The anchor is a runner-agnostic `expectAccessible(wrapperOrElement,
options?)` helper — backed by `axe-core` as a **devDependency / optional
peer, never a bundle dependency** — exported from a stable subpath
(`@conduction/nextcloud-vue/testing`) that consuming apps import in their
own Jest/Vitest suites. It runs axe against a mounted component's DOM and
asserts zero violations for a configurable rule set defaulting to WCAG
2.1 A + AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`).

The change also ships a `check:a11y` npm lane (a dedicated Jest project
over `tests/a11y/`) that applies the anchor to a meaningful sample of the
fleet's core interactive components, and fixes every real violation that
sample surfaced.

## Motivation

This is an ABSTRACTION leaf, not app code. NL Design System theming
already commits the fleet to "WCAG AA compliance" (project CLAUDE.md),
but nothing shared made accessibility *testable*: an app wanting an axe
check had to pick a library, wire a matcher, choose a rule set, and keep
it current — 13 apps each solving the same problem differently or not at
all. The Hydra gate `hydra-gate-nc-input-labels` already enforces one
narrow ARIA rule mechanically; this change gives apps the general,
reusable primitive to assert the rest against real rendered DOM.

Building the sample lane immediately proved its worth: it surfaced three
real, shipped WCAG violations in core components (see below) that no
existing test caught.

## What the anchor exposes

- `expectAccessible(target, options?)` — `async`, throws a formatted
  `Error` listing each violation (rule id, impact, help URL, offending
  selectors) on failure; returns the full axe `results` on success.
  Runner-agnostic (a thrown error fails the test in both Jest and
  Vitest — the fleet runs both), so no `expect.extend` coupling.
- `WCAG_AA_TAGS` — the frozen default tag set.
- Both re-exported from `src/testing/index.js` and the root shim
  `testing/index.js`, so consumers write
  `import { expectAccessible } from '@conduction/nextcloud-vue/testing'`.
- `check:a11y` npm script — `jest --config jest.a11y.config.js`.

## Real violations fixed

- **`CnDataTable`** loading state rendered a bare `<NcLoadingIcon>` =
  an unlabelled `role="img"` (axe `role-img-alt`, WCAG 1.1.1). Fixed by
  `aria-hidden="true"` (the adjacent `<p>` already carries the text).
- **`CnNotesTab`** loading state had the same bare-spinner defect —
  fixed by giving it an accessible name (`loadingLabel`).
- **`CnNotesTab`** rendered `<NcListItem>` (an `<li>`) inside a plain
  `<div>` (axe `listitem`, WCAG 1.3.1). Fixed by making the wrapper a
  `<ul>` (with a list-style reset).

## Affected Projects

- [x] `nextcloud-vue` — new testing helper + subpath, `check:a11y`
      lane, `axe-core` optional-peer devDependency, three source fixes,
      adoption docs. No runtime/bundle dependency added.
- [ ] Consumer apps — no code change required; they OPT IN by adding
      `axe-core` to their own devDependencies and importing
      `expectAccessible`. Documented in `docs/`.

## Backward compatibility

Fully compatible. No public component API changes (the three fixes are
markup-internal: an `aria-hidden`, a new optional `loadingLabel` prop
with a translated default, and a `<div>`→`<ul>` swap). No runtime
dependency added — `axe-core` is confined to the test lane and proven
absent from the built bundle.

## Theming impact

None. The lane runs under jsdom, which has no layout/paint engine, so
axe's `color-contrast` rule returns "incomplete" (never a violation)
there; real contrast auditing remains the job of the fleet's Playwright
visual passes. Documented in `design.md`.
