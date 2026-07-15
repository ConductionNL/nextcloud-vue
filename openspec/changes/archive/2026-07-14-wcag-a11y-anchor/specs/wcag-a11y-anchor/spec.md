wcag-a11y-anchor
---
status: draft
---
# WCAG accessibility anchor

## Purpose

Anchor WCAG/accessibility checking once in `@conduction/nextcloud-vue` so
every consuming app inherits a single, runner-agnostic
`expectAccessible` primitive backed by `axe-core` — with `axe-core`
confined to the test lane and proven absent from the shipped bundle — plus
a `check:a11y` lane that applies it to core components and keeps them free
of WCAG 2.1 A+AA violations.

## ADDED Requirements

### Requirement: The library MUST export an `expectAccessible` helper from a stable testing subpath

`@conduction/nextcloud-vue` MUST export an async
`expectAccessible(target, options?)` function and a `WCAG_AA_TAGS`
constant from `src/testing/index.js`, re-exported through a package-root
`testing/` shim so consumers can import them as
`@conduction/nextcloud-vue/testing`. The helper MUST accept a
`@vue/test-utils` wrapper, a Vue instance, or a raw DOM node, run
`axe-core` against the resolved DOM node, and MUST NOT be re-exported
from `src/index.js`.

#### Scenario: Helper importable from the testing subpath
- GIVEN a consumer test file
- WHEN it runs `import { expectAccessible, WCAG_AA_TAGS } from '@conduction/nextcloud-vue/testing'`
- THEN both symbols MUST resolve, `expectAccessible` a function and `WCAG_AA_TAGS` an array

#### Scenario: Helper accepts a Vue Test Utils wrapper
- GIVEN a component mounted with `@vue/test-utils` and attached to `document`
- WHEN `expectAccessible(wrapper)` is awaited
- THEN axe MUST run against `wrapper.element` (the mounted root node)

#### Scenario: Helper accepts a raw DOM node
- GIVEN a connected `Element` (e.g. a teleported popover menu)
- WHEN `expectAccessible(element)` is awaited
- THEN axe MUST run against that element directly

#### Scenario: Non-DOM target is rejected
- GIVEN a value that is neither a wrapper, a Vue instance, nor a DOM node
- WHEN `expectAccessible(value)` is called
- THEN it MUST throw a `TypeError` naming the accepted target types

#### Scenario: Helper is absent from the main entry
- GIVEN `src/index.js`
- WHEN its exports are inspected
- THEN `expectAccessible` MUST NOT be among them (so `axe-core` stays out of the Rollup entry graph)

### Requirement: `expectAccessible` MUST default to the WCAG 2.1 A + AA rule set and pass/fail on axe violations

The helper MUST scope the axe run with `runOnly: { type: 'tag', values }`
where `values` defaults to `WCAG_AA_TAGS` (`wcag2a`, `wcag2aa`,
`wcag21a`, `wcag21aa`). It MUST resolve (returning the full axe `results`)
when there are zero violations and MUST throw an `Error` describing every
violation when there are any.

#### Scenario: Accessible component passes
- GIVEN a mounted component with no WCAG 2.1 AA violations
- WHEN `expectAccessible(wrapper)` is awaited
- THEN it MUST resolve to the axe `results` object without throwing

#### Scenario: Violation fails with a descriptive error
- GIVEN a mounted component with at least one WCAG 2.1 AA violation
- WHEN `expectAccessible(wrapper)` is awaited
- THEN it MUST throw an `Error` whose message names each violated rule id, its impact, its help URL, and the offending selector(s)

#### Scenario: Default tag set is WCAG 2.1 A + AA
- GIVEN no `options.tags` override
- WHEN the helper runs
- THEN axe MUST be invoked with `runOnly.values` equal to `['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']`

#### Scenario: Caller can override the tag set
- GIVEN `options.tags = ['wcag2a']`
- WHEN the helper runs
- THEN axe MUST be invoked with `runOnly.values` equal to `['wcag2a']`

#### Scenario: Caller can exclude a specific rule with a reason
- GIVEN `options.excludeRules = ['color-contrast']`
- WHEN the helper runs
- THEN axe MUST be invoked with that rule disabled (`rules['color-contrast'].enabled === false`) and all other rules unchanged

### Requirement: `axe-core` MUST be a test-only dependency, never in the runtime bundle

`axe-core` MUST be declared as a `devDependency` and an OPTIONAL
`peerDependency` (`peerDependenciesMeta.axe-core.optional = true`), and
MUST NOT appear in `dependencies`. It MUST NOT be present in the built
`dist/` output.

#### Scenario: axe-core is an optional peer, not a runtime dependency
- GIVEN `package.json`
- WHEN its dependency fields are read
- THEN `axe-core` MUST appear under `devDependencies` and under `peerDependencies` with `peerDependenciesMeta.axe-core.optional === true`, and MUST NOT appear under `dependencies`

#### Scenario: axe-core is absent from the built bundle
- GIVEN a clean `npm run build`
- WHEN the emitted `dist/` files are grepped for `axe-core`
- THEN there MUST be no match

#### Scenario: Missing axe-core yields a clear error
- GIVEN a consumer that imports the helper without installing `axe-core`
- WHEN `expectAccessible` is called
- THEN it MUST throw an `Error` instructing the consumer to add `axe-core` to their devDependencies

### Requirement: A `check:a11y` lane MUST run the anchor against core components over real markup

The package MUST provide a `check:a11y` npm script running a dedicated
Jest project (`jest.a11y.config.js`) over `tests/a11y/**/*.spec.js`. That
project MUST mount REAL `@nextcloud/vue` components (not the behavioural
stub the main `jest.config.js` uses) so axe inspects real ARIA markup.
The default `npm test` MUST NOT run the a11y lane.

#### Scenario: check:a11y runs the a11y specs green
- GIVEN the `tests/a11y/` specs
- WHEN `npm run check:a11y` runs
- THEN every a11y spec MUST pass with zero axe violations

#### Scenario: a11y lane uses real @nextcloud/vue components
- GIVEN `jest.a11y.config.js`
- WHEN its `moduleNameMapper` for `@nextcloud/vue` is read
- THEN it MUST resolve to the real-component shim, not the generic `<div class="stub">` mock used by `jest.config.js`

#### Scenario: npm test excludes the a11y lane
- GIVEN `jest.config.js`
- WHEN `npm test` runs
- THEN it MUST NOT execute `tests/a11y/**` (they run only via `check:a11y`), so the lane is neither double-run nor evaluated against the stub tree

### Requirement: Core interactive components MUST have no WCAG 2.1 AA violations under the anchor

The sampled core components MUST pass `expectAccessible` in their
documented states. The sample MUST cover `CnConfirmDialog`,
`CnDataTable`, `CnSavedViewsControl`, `CnIndexPage`, `CnFormPage`, and
`CnNotesTab`. Any violation surfaced MUST be fixed in the component
itself, and MUST NOT be silenced by disabling a rule.

#### Scenario: Dialog base is accessible in confirm and result phases
- GIVEN `CnConfirmDialog` mounted in each of its phases (confirm, loading, success result, error result)
- WHEN `expectAccessible` runs against each
- THEN each MUST report zero violations (real `role="dialog"` with an accessible name)

#### Scenario: Data table is accessible with sortable columns and selectable rows
- GIVEN `CnDataTable` with sortable columns, selectable rows, a loading state, and a titled card state
- WHEN `expectAccessible` runs against each
- THEN each MUST report zero violations

#### Scenario: Loading spinners are not unlabelled images
- GIVEN a component rendering a bare `NcLoadingIcon` in its loading state (`CnDataTable`, `CnNotesTab`)
- WHEN `expectAccessible` runs
- THEN there MUST be no `role-img-alt` violation — the spinner is either `aria-hidden` (adjacent text present) or given an accessible name

#### Scenario: List items live inside a list
- GIVEN `CnNotesTab` rendering `NcListItem` (`<li>`) entries
- WHEN `expectAccessible` runs against the populated list
- THEN there MUST be no `listitem` violation — the entries are contained in a `<ul>`

#### Scenario: Form inputs are all labelled
- GIVEN `CnFormPage` rendering one control per field for string, textarea, boolean, number, password, and enum field types
- WHEN `expectAccessible` runs
- THEN there MUST be no violation for any input lacking an accessible name (WCAG 1.3.1 / 4.1.2)

#### Scenario: The fleet's most-used page is accessible
- GIVEN `CnIndexPage` mounted with real sub-components in its empty and populated states
- WHEN `expectAccessible` runs against each
- THEN each MUST report zero violations

### Requirement: Consumer adoption MUST be documented

The package MUST document how a consuming app adopts the anchor in its own
Jest or Vitest suite, including the opt-in dependency step, the default
tag set, the jsdom color-contrast caveat, and the exclusion policy.

#### Scenario: Adoption guide exists
- GIVEN the component docs
- WHEN a consumer looks for accessibility-testing guidance
- THEN a page MUST describe importing `expectAccessible` from `@conduction/nextcloud-vue/testing`, adding `axe-core` to the app's own devDependencies, and that the helper works unchanged under both Jest and Vitest
