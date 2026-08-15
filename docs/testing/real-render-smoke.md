# Real-render smoke sweep (`check:smoke`)

Mounts **every `Cn*` component exported from `src/index.js`** against the real
`@nextcloud/vue` component tree and asserts each one renders without throwing
and without a single Vue warning.

```bash
npm run check:smoke              # the gate
npm run smoke-baseline:update    # re-record known failures (use sparingly)
```

## Why it exists

`npm test` maps `@nextcloud/vue` to a generic `<div class="stub">`
([`tests/__mocks__/nextcloud-vue.js`](../../tests/__mocks__/nextcloud-vue.js)).
That is the right call for behavioural specs — it isolates the component under
test — but it has a consequence worth stating plainly: **the entire main suite is
structurally incapable of catching a broken `@nextcloud/vue` API contract**,
because the stub accepts any prop, emits nothing and validates nothing.

On a library that moved Vue 2 → Vue 3 and `@nextcloud/vue` 8 → 9, that is the
largest blind spot there is. All of these fail silently against a permissive stub
and loudly against the real component:

| Vue 2 / v8 | Vue 3 / v9 |
|---|---|
| `type="primary"` on NcButton | `variant="primary"` |
| `:value` / `@input` | `:model-value` / `@update:model-value` |
| `this.$set(obj, k, v)` | direct assignment |
| `this.$scopedSlots` | `this.$slots` |
| `this._uid` | removed — evaluates to `undefined` |
| moment format `YYYY-MM-DD` | date-fns `yyyy-MM-dd` (throws on `YYYY`) |

It is also the only lane with **breadth**: 122 of the 250 components had no spec
of any kind when this lane was written, so for roughly half the library the
question "does it even render?" had never been asked by anything.

## What counts as a failure

- a throw during mount **or** unmount;
- any `console.warn` / `console.error` that is not harness noise.

Warnings are failures deliberately. In Vue 3 a warning is precisely how a removed
Vue 2 API, a bad prop type or an unresolved child announces itself, so treating
warnings as cosmetic would give the whole lane away.

## What it does *not* check

**Correctness.** It mounts with minimal synthesised props and asserts nothing
about the output. A component can pass here and still be wrong. Behaviour belongs
in `tests/components/`, ARIA in [`tests/a11y/`](accessibility.md), and real layout
and paint in the Playwright lane.

It also only exercises the **default render path**. A component whose root is
gated (`v-if="totalPages > 1 || …"` in `CnPagination`) renders nothing under
minimal props and passes trivially. The lane reports the count of such
components on every run so it never overstates its own coverage:

```
[smoke] @nextcloud/vue: 41 real, 5 stubbed (NcAvatar, NcRichText, …)
[smoke] components swept: 233, baselined as known-failing: 7
[smoke] rendered EMPTY under minimal props (mounted clean, but internals not exercised): 15
```

## How props are synthesised

There is no hand-written fixture file. `Component.props` is **introspected at
runtime** and a value derived from each declared `type`
([`tests/smoke/support/propSynth.js`](../../tests/smoke/support/propSynth.js)).
A static map would be wrong the moment anyone added a required prop, and
silently wrong — the sweep would blame the component when the fixture was stale.

Two documented exceptions:

- **`OVERRIDES`** — components that index into a prop during first render
  (`steps[0].id`, `item.title`), where a type-shaped-but-empty value throws.
  Keep these minimal; a rich fixture starts duplicating the component's own specs.
- **`GATE_PROP_NAMES`** — `open` / `show` / `visible` / … are set to `true` even
  when optional. On a dialog such a prop is not a mode, it is whether the
  component renders at all; left `false`, every dialog in the library mounted to
  an empty tree and passed without executing a line of its own template.

## The baseline

[`tests/smoke/.smoke-baseline.json`](../../tests/smoke/.smoke-baseline.json)
records components known to fail today, so the lane could land as a gate before
every pre-existing defect was fixed — the same pattern as
`scripts/.jsdoc-baselines.json`.

It **ratchets in both directions**:

- a component that starts failing without being baselined fails the run;
- a **baselined component that starts passing also fails the run**, with an
  instruction to remove the entry.

Without that second half a baseline quietly becomes a permanent exemption list.

`knownFailing` is regenerated from a real run, so a recorded reason can never go
stale. `notes` is hand-written and **preserved across regeneration** — it carries
the judgement the script cannot re-derive: whether an entry is a real component
defect or a limit of the sweep, and where the fix belongs. Add a note whenever
you add an entry.

## Relationship to the other lanes

| Lane | Command | `@nextcloud/vue` | Checks |
|---|---|---|---|
| Unit / behaviour | `npm test` | stubbed | component logic, in depth |
| **Real-render smoke** | `npm run check:smoke` | **real** | every component mounts + renders clean |
| Accessibility | `npm run check:a11y` | **real** | axe-core against real ARIA |
| Vue 3 compile | `npm run check:vue3-compile` | n/a | every SFC compiles |
| Browser e2e | `npm run test:e2e` | real browser | interaction, stacking, layout |

`check:smoke` and `check:a11y` share every resolver and transform detail through
[`tests/support/realNcJestBase.js`](../../tests/support/realNcJestBase.js).
That config is shared rather than copied on purpose: loading `@nextcloud/vue` 9
under Jest takes ~100 lines of non-obvious detail, and two copies would drift —
silently, in the worst direction, since a lane whose mapping has fallen behind
renders empty placeholders and *passes*.

Both read the same curated component map,
[`tests/support/realNextcloudVue.js`](../../tests/support/realNextcloudVue.js):
41 components load for real, 5 are stubbed because they hit `@nextcloud/vue`'s
ESM-only `unist-builder` / `string-length` chains. The stubbed set is printed on
every run rather than left implicit — a lane that quietly stubs half of
`@nextcloud/vue` looks exactly as green as one that stubs none of it.
