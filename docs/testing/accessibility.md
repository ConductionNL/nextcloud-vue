---
id: accessibility
title: Accessibility testing
---

# Accessibility testing (`expectAccessible`)

`@conduction/nextcloud-vue` anchors WCAG/accessibility checking once, so
every app inherits the same check instead of hand-rolling its own. The
anchor is a single helper — `expectAccessible` — that runs
[`axe-core`](https://github.com/dequelabs/axe-core) against a mounted
component's DOM and fails your test if there are any violations.

It works **unchanged under both Jest and Vitest** (the helper throws a
plain `Error` on violations rather than relying on a runner-specific
matcher), so it drops into any app's existing unit-test suite.

## Adopting it in your app

### 1. Add `axe-core` to your own devDependencies

`axe-core` is an **optional peer dependency** of
`@conduction/nextcloud-vue` — it is deliberately **not** installed
transitively, and it is **never** part of the shipped component bundle.
Apps that want the helper install it themselves:

```bash
npm install --save-dev axe-core
```

If you call `expectAccessible` without `axe-core` installed, it throws a
clear error telling you to add it.

### 2. Import and use it

```js
import { mount } from '@vue/test-utils'
import { expectAccessible } from '@conduction/nextcloud-vue/testing'
import MyView from '../src/views/MyView.vue'

describe('MyView — accessibility', () => {
  it('has no WCAG 2.1 AA violations', async () => {
    const wrapper = mount(MyView, {
      attachTo: document.body, // axe needs a connected DOM node
      propsData: { /* … */ },
    })

    await expectAccessible(wrapper)

    wrapper.destroy()
  })
})
```

`expectAccessible` accepts:

- a `@vue/test-utils` wrapper (it scans `wrapper.element`),
- a raw Vue instance (it scans `vm.$el`), or
- a raw DOM node — useful for teleported content such as a popover menu
  that renders outside the component root:

  ```js
  const menu = document.querySelector('[role="menu"]')
  await expectAccessible(menu)
  ```

> **Attach to the document.** `axe-core` cannot scan a detached tree
> (`getComputedStyle` only resolves for connected nodes). Always mount
> with `attachTo: document.body` (or an attached container) for a11y
> assertions, and `destroy()` afterwards to clean up.

## The default rule set

By default the helper runs the **WCAG 2.1 Level A + AA** rule set —
axe-core tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` — exposed as the
`WCAG_AA_TAGS` constant. This is the fleet's stated conformance bar (NL
Design System theming).

Override per call when you need to:

```js
import { expectAccessible, WCAG_AA_TAGS } from '@conduction/nextcloud-vue/testing'

// Widen to AAA for one critical view:
await expectAccessible(wrapper, { tags: [...WCAG_AA_TAGS, 'wcag2aaa', 'wcag21aaa'] })
```

## Excluding a rule (rarely, and always with a reason)

Fix violations in your markup — do not silence them. The **only**
legitimate exclusion is a rule that is a genuine false positive or lives
entirely upstream in `@nextcloud/vue`. When you must, name the rule and
the reason inline:

```js
await expectAccessible(wrapper, {
  // color-contrast can't be evaluated under jsdom (no paint engine); it's
  // covered by our Playwright visual pass instead. See note below.
  excludeRules: ['color-contrast'],
})
```

## jsdom and colour contrast

Unit tests run under **jsdom**, which has no layout or paint engine, so
it cannot compute real rendered colours. Axe therefore reports the
`color-contrast` rule as **"incomplete"** — never a violation — under
jsdom, and `expectAccessible` only fails on definite violations. So this
helper does **not** and cannot assert real contrast ratios in a unit
test. Real contrast auditing belongs to browser-based (Playwright)
accessibility passes; keep using those for contrast.

You do not need to exclude `color-contrast` for a passing unit test — it
simply never fails there. Exclude it only to silence axe's console probes
if they bother you.

## How the library tests itself

The library's own `check:a11y` lane (`npm run check:a11y`, a dedicated
Jest project over `tests/a11y/`) applies `expectAccessible` to a sample
of core interactive components — `CnConfirmDialog`, `CnDataTable`,
`CnSavedViewsControl`, `CnIndexPage`, `CnFormPage`, `CnNotesTab` —
mounted with **real** `@nextcloud/vue` components so axe inspects real
ARIA markup. Building that lane surfaced (and fixed) three real WCAG
violations. Use those spec files under `tests/a11y/` as worked examples
for your own app suite.
