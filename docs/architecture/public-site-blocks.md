# Public site blocks — `@conduction/nextcloud-vue/public`

A second entry point, for components that must render **where there is no
Nextcloud**.

```js
import { siteBlockRegistry, CnSiteHero } from '@conduction/nextcloud-vue/public'
```

## What it is for

A portal served from a municipality's own domain — `portaal.gemeente.nl`, not
`cloud.gemeente.nl/apps/…` — has no `OC` global, no session, no CSRF token and
no translation bundle. Anything reaching for those fails **in a browser, on a
live page**, not at build time and not in a Nextcloud-hosted test.

The main entry cannot serve that host. Measured on the published build:

| package | files referencing it |
| --- | --- |
| `@nextcloud/axios` | 154 |
| `@nextcloud/router` | 157 |

That is correct for an app rendering inside Nextcloud. It is fatal outside it.

## Why these are separate components, not re-exports

Re-exporting the existing widgets was the original plan. A **direct** import
check supported it — 12 of 13 candidates had no `@nextcloud/*` import of their
own. A **transitive** check, following relative imports through the tree,
inverted the result completely:

| widget | reachable Nextcloud runtime |
| --- | --- |
| `CnTextWidget` | `@nextcloud/l10n` |
| `CnHeaderWidget` | `@nextcloud/l10n`, `@nextcloud/router` |
| `CnCardGrid` | `@nextcloud/l10n`, `@nextcloud/vue`, `@nextcloud/auth`, `@nextcloud/event-bus` |

Only `CnCard` was clean all the way down — **12 of 13 unsafe**. Publishing
those under a name promising public safety would have shipped a guarantee that
the first public deployment disproved.

`@nextcloud/l10n` is what almost all of them trip over. So **these blocks take
every string as a prop** instead of calling `t()`. That one decision is what
makes them portable, and it is the rule to follow when adding more.

## The guarantee is checked, not asserted

```
npm run check:public-safe
```

Walks the entry point's transitive imports and fails on any `@nextcloud/*`,
naming the chain that reached it. It also **fails when it inspects fewer than
two files** — "no violations found" and "nothing was read" must never be the
same outcome.

Both failure modes are verified by running them, not by reading the code.

## What is in the vocabulary

| key | component | notes |
| --- | --- | --- |
| `hero` | `CnSiteHero` | full-bleed band, optional search, optional background image |
| `search` | `CnSiteSearch` | real `<form>`, real `<label>`, **emits** its term |
| `section` | `CnSiteSection` | full-bleed band with a constrained `.container` |
| `cardGrid` | `CnSiteCardGrid` | `auto-fit` grid, reflows without media queries |
| `card` | `CnSiteCard` | icon, description, named link |
| `emptyState` | `CnSiteEmptyState` | loading / empty / error, with the right ARIA for each |
| `glossary` | `CnSiteGlossary` | `<dl>` of terms; renders synonyms, takes its rows as a prop |
| — | `CnSiteIcon` | closed icon vocabulary, inline SVG |

`siteBlockFor(key)` returns `null` for anything unknown — a renderer needs that
signal to show "unknown block" rather than silently omit content.

### Conventions these blocks follow

- **Strings are props.** No `t()`, ever. See above. That includes the small
  connective words — `CnSiteGlossary` takes its "Ook bekend als:" and "Bron:"
  labels as props, because this library is not entitled to choose the wording,
  or the language, on behalf of a Dutch government portal.
- **Data is a prop too.** A block never fetches. The host has already loaded
  the rows over its own contract; passing them down costs nothing and is what
  keeps the block renderable where there is no session to fetch with.
- **Heading levels are props, and the class tracks the level.** The design
  system styles `.utrecht-heading-2`, not `h2`; a bare tag renders unstyled.
  A fixed level also skips outline levels wherever the block is placed.
- **Icons are names from a closed set, never path data.** Page content is
  authored input, and raw SVG from an author is attacker-controlled markup
  inside an `<svg>` on a public government page.
- **Bands own their container.** `siteBlockIsBand(key)` tells a host which
  blocks must NOT be wrapped in its content column — rendering a hero inside
  one clamps it (measured 1168px against a design of 1280).
- **No colours in component styles.** A block lands on a surface it cannot
  know. Three separate defects in the consuming portal came from rules that
  coloured text without reference to its background.

## Consumers

### portaliq

[`ConductionNL/portaliq`](https://github.com/ConductionNL/portaliq) renders the
fleet's public portals from this entry point. Its `WidgetGrid` composes its
allow-list as `{ markdown: <its own>, ...siteBlockRegistry }`.

Two things worth knowing if you change anything here:

- **`markdown` stays portaliq's.** It renders untrusted authored content and
  its sanitisation posture is that app's decision, not a library default.
- **portaliq ships no design tokens.** It deleted its own copy of the VNG set
  in favour of the [`nldesign`](https://github.com/ConductionNL/nldesign) app
  owning them, so a portal needs `nldesign` installed. Its e2e suite provisions
  it and asserts the token layer is present, because a page with no tokens
  renders perfectly and is simply unstyled — no error, no failed request.

Adding a block here is enough for portaliq to render it; adding a **token** is
a change in `nldesign`, not this package.
