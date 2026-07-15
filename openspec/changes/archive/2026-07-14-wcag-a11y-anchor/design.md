# Design: wcag-a11y-anchor

## Goal

Make accessibility checking a shared, one-line primitive that every
Conduction app inherits from `@conduction/nextcloud-vue`, rather than a
per-app concern each team re-solves or skips. The library already anchors
the fleet's components, its store, its manifest renderer — this adds the
accessibility *contract* to that same foundation.

After this change an app writes, in its own test suite:

```js
import { mount } from '@vue/test-utils' // or @vue/test-utils for Vitest
import { expectAccessible } from '@conduction/nextcloud-vue/testing'
import MyView from '../src/views/MyView.vue'

it('MyView meets WCAG 2.1 AA', async () => {
  const wrapper = mount(MyView, { attachTo: document.body, propsData: { … } })
  await expectAccessible(wrapper)
  wrapper.destroy()
})
```

…and gets the same rule set, the same failure formatting, and the same
WCAG tag defaults as every other app, for the cost of one import.

## Why the anchor lives in nc-vue

Three reasons this is an abstraction leaf, not app code:

1. **Single rule set, org-wide.** WCAG 2.1 A+AA is the fleet's stated
   bar (NL Design System theming, project CLAUDE.md). Encoding it once
   (`WCAG_AA_TAGS`) means an app can't silently drift to a weaker set,
   and a fleet-wide bar change is a one-line edit here.
2. **The components under test already live here.** `CnIndexPage`,
   `CnDataTable`, dialogs, form inputs — the interactive surface most
   apps render is nc-vue's. Anchoring the check next to the components
   means the library ships already-audited, and a violation introduced
   in a shared component is caught in the shared repo's own lane, not
   discovered independently by six downstream apps.
3. **Runner neutrality is a library concern.** The fleet runs BOTH Jest
   (openregister, opencatalogi, docudesk) and Vitest (procest,
   pipelinq). A per-app helper would be written against one runner; a
   shared one has to work on both — which drove the wrapper design below.

## The `axe-core` wrapper — runner-agnostic by construction

`jest-axe` / `vitest-axe` both hang their assertion off a *runner-specific*
custom matcher (`expect.extend({ toHaveNoViolations })`). A helper built
on either would only work in that runner. Instead `expectAccessible`
wraps `axe-core` directly and signals failure by **throwing a formatted
`Error`**. A thrown error inside a test body fails the test identically
in Jest and Vitest, with no `expect.extend` registration — so the exact
same helper, imported from the exact same subpath, works in every
consumer's suite regardless of runner.

The thrown message lists, per violation: rule id, impact, help URL, and
every offending selector with axe's `failureSummary` — enough to fix
without re-running axe locally.

## The WCAG tag set

`WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']` (frozen).
These are axe-core rule *tags*, passed as `runOnly: { type: 'tag',
values: … }`, which is the precise, forward-compatible way to scope a run
to a conformance target: it selects Level A + AA rules from both WCAG 2.0
and 2.1 and automatically picks up new rules axe later tags into those
buckets. Callers can widen (e.g. add `wcag21aaa` or `best-practice`) or
narrow via `options.tags`, and disable a specific rule via
`options.excludeRules` — always with an inline reason (see the exclusion
policy below).

## Bundle safety — axe-core never ships

The single most important constraint: `axe-core` is a **test-only**
dependency and must never enter the shipped component bundle.

- It is declared as a `devDependency` and an *optional* `peerDependency`
  (`peerDependenciesMeta.axe-core.optional = true`), never a runtime
  `dependency`.
- The helper lives at `src/testing/a11y.js` and is re-exported ONLY from
  `src/testing/index.js` + the root `testing/` shim — **never from
  `src/index.js`**, which is Rollup's single `input`
  (`rollup.config.js`). Anything unreachable from that entry is simply
  absent from `dist/`. The build is grepped to prove `axe-core` (and the
  `testing/` helper) appear nowhere in the emitted bundle.
- Consuming apps that want the helper add `axe-core` to their OWN
  devDependencies; it is never installed transitively through nc-vue's
  runtime graph.

## Why a curated real-component map for the lane

Accessibility testing is worthless against stubs: the repo's main
`jest.config.js` maps `@nextcloud/vue` to generic `<div class="stub">`
wrappers (correct for behavioural isolation), which carry none of the
real semantics axe inspects — real `<button>`, `<input>`/`<label for>`
pairing, `role="dialog"`/`aria-modal`, `<li>` list membership. Running
axe against those would pass almost everything: a false anchor.

So `jest.a11y.config.js` maps `@nextcloud/vue` to
`tests/a11y/support/realNextcloudVue.js`, which loads REAL components.
The obvious approach — `require('@nextcloud/vue')` — fails: the full
barrel eagerly requires every chunk including `NcAvatar`'s autolinker,
which pulls in the ESM-only `unist-builder` → `unist-util-visit-parents`
chain that Jest's CJS transform can't parse (widening
`transformIgnorePatterns` just uncovers the next ESM-only package). The
fix is `@nextcloud/vue`'s per-component subpath exports
(`@nextcloud/vue/dist/Components/<Name>.js`), each of which requires only
its own chunk. Every component the lane mounts was individually verified
to load cleanly this way; the five that DO hit the ESM chain
(`NcSelect`, `NcListItem`, `NcRichContenteditable`, and the `NcAvatar` /
`NcListItemIcon` they pull in) get documented hand stubs that reproduce
each component's real accessibility contract (real `role`/`aria-*`, real
label wiring, real `<li>` root) closely enough that a consumer which
forgets an accessible name still fails the way it would against the real
component.

Real `@nextcloud/vue` components call a handful of real `@vueuse/core`
composables (`useElementSize`, `useSwipe`, `useIntersectionObserver`,
`useFocusWithin`, `useVModel`, `whenever`, `toRef`, `toValue`) during
setup/mount. `@vueuse/core` is an uninstalled peer dep, so the lane maps
it to `tests/a11y/support/vueuseCoreStub.js` — inert stand-ins (none of
these gesture/measurement/observer utilities affect ARIA markup), with
reactive primitives delegated to Vue 2.7's built-ins.

## jsdom and color contrast

`color-contrast` (WCAG 1.4.3) is in the default AA tag set, but jsdom has
no layout or paint engine and cannot compute real rendered colors. Axe
therefore returns `color-contrast` as **"incomplete"**, never
"violation", under jsdom — and `expectAccessible` only fails on
`results.violations`. So this lane neither asserts nor can assert real
contrast ratios; that stays the job of the fleet's Playwright visual-a11y
passes, which run against a real browser. The rule is deliberately left
IN the tag set (not stripped) so the intent is documented and the day the
lane moves to a real-DOM runner it starts enforcing automatically. The
`jsdomEnvPolyfill` support file only silences jsdom's "not implemented"
console spam from axe probing canvas/pseudo-elements; it changes no
verdict.

## Exclusion policy

Real fixes only. A violation is fixed in the component, never silenced to
go green. The single legitimate use of `options.excludeRules` is a rule
that is a genuine false positive or lives entirely upstream in
`@nextcloud/vue` — and every such exclusion must carry an inline comment
naming the rule and the reason. No exclusions were needed for the initial
sample; all surfaced violations were real and fixed.

## Scope of the initial sample

Six components across the interactive surface most apps reuse: a
dialog/modal base (`CnConfirmDialog`), the tabular list primitive
(`CnDataTable`), an actions-menu control (`CnSavedViewsControl`), the
fleet's most-used page mounted with real sub-components (`CnIndexPage`),
the schema-driven form primitive exercising every input type
(`CnFormPage`), and a composer+list surface (`CnNotesTab`). Enough to
prove the anchor works end-to-end and to surface real defects; the lane
is designed to grow one `*.a11y.spec.js` file at a time.
