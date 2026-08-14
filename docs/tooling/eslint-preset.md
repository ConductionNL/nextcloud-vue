---
id: eslint-preset
title: Shared ESLint preset
---

# Shared ESLint preset (`@conduction/nextcloud-vue/eslint`)

`@conduction/nextcloud-vue` publishes the Conduction fleet's Vue 3 ESLint
configuration, so fourteen apps stop maintaining fourteen copies of it.

## Why this lives in the library

This is not a tidiness argument. A per-app lint config is a per-app chance to
get the Vue 3 gate *wrong*, and that has already shipped bugs:

- **openconnector finished its Vue 3 migration with a Vue 2 lint config.**
  `npx eslint --print-config` confirmed that **not one `vue/no-deprecated-*`
  rule was active**. Four `beforeDestroy` hooks therefore survived the
  migration untouched. Vue 3 does not call, warn about, or error on
  `beforeDestroy` — it silently ignores the hook name — so each surviving hook
  was a **live memory leak**: a 1 Hz `setInterval` per mounted
  `CircuitBreakerBadge`, and `releaseLiveSubscription()` in a mixin backing
  four detail pages. Zero console errors. Nothing in the app looked wrong.
- The same config pinned `ecmaVersion: 6`, which left `eslint-plugin-import`
  unable to parse `?.`, `??` and object spread and **manufactured 20 warnings
  about perfectly valid code**.

When the library ships the config, arming those rules is a one-line import
instead of a judgement call each app has to get right independently.

## Adopting it

`eslint`, `eslint-plugin-vue` and `vue-eslint-parser` are **optional peer
dependencies** — only apps that import this subpath need them:

```bash
npm install --save-dev eslint eslint-plugin-vue vue-eslint-parser
```

### Standalone

For an app with no other Vue lint config:

```js
// eslint.config.js
const { conductionVue3 } = require('@conduction/nextcloud-vue/eslint')

module.exports = [
	{ ignores: ['dist/**', 'node_modules/**'] },
	...conductionVue3,
	{ name: 'app/overrides', rules: {} },
]
```

### On top of `@nextcloud/eslint-config/vue3`

Most Conduction apps already extend the Nextcloud preset. Spread the **fix
layer** last — it registers no plugins, so it composes cleanly, and later
entries win in flat config:

```js
const { FlatCompat } = require('@eslint/eslintrc')
const { conductionVue3Fixes } = require('@conduction/nextcloud-vue/eslint')

const compat = new FlatCompat({ baseDirectory: __dirname })

module.exports = [
	...compat.extends('@nextcloud/eslint-config/vue3'),
	...conductionVue3Fixes,
]
```

This is exactly what `@conduction/nextcloud-vue`'s own `eslint.config.js`
does — the library eats its own dog food, so a regression in the preset breaks
this repository's `npm run lint` first.

### If your config is `eslint.config.mjs`

The package deliberately ships **no `exports` map** (existing deep subpaths
such as `.../src/composables` and `.../src/types` depend on its absence), and
Node's native ESM resolver does no directory-index resolution. From a `.mjs`
config, spell the subpath with its file:

```js
// eslint.config.mjs
import { conductionVue3Fixes } from '@conduction/nextcloud-vue/eslint/index.js'
```

The extensionless form works from `eslint.config.js` (CommonJS) and from any
bundler; only native Node ESM needs the `/index.js`.

## What it guarantees

### 1. The whole `vue/no-deprecated-*` family, at `error`

All 21 rules `eslint-plugin-vue` ships, listed explicitly rather than
inherited. Two of them — `vue/no-deprecated-delete-set` and
`vue/no-deprecated-model-definition` — are **not** in
`plugin:vue/vue3-essential`, so only an explicit list catches them. (Arming
them on this library immediately found two dead `model: { prop, event }`
options in its own source.)

An explicit list is also what makes the guarantee auditable:
`eslint --print-config src/App.vue` shows every rule by name.

Plus `vue/no-restricted-component-options` for the `filters:` **component
option**. `vue/no-deprecated-filter` only inspects templates — it reports
`{{ msg | upper }}` but says nothing about the `filters: { … }` block that
declared it, so a half-migrated component lints clean while carrying dead
Vue 2 API.

### 2. A modern language level

`ecmaVersion: 'latest'` and `sourceType: 'module'`, set on **both**
`languageOptions` and `languageOptions.parserOptions`. The second one is not
redundant: `eslint-plugin-import` resolves the language level from
`context.parserOptions`, which in flat config maps to
`languageOptions.parserOptions` and *not* to `languageOptions.ecmaVersion`.
Omitting it is how a stale `ecmaVersion` keeps manufacturing warnings about
`?.` and `??`.

:::danger Never pin a year here

The preset used to set `ecmaVersion: 2022`. openconnector adopted it over a
config carrying a top-level `ecmaVersion: 'latest'`, and the adoption silently
**lowered** it. Harmless in that repository — and the exact class of failure the
pin was introduced to fix.

A shared preset that pins a year can only ever downgrade a consumer, and the
downgrade is not cosmetic. Measured against ESLint 8.57 / espree 9.6, with the
ES2024 `v` (unicodeSets) regexp flag as the probe:

| `ecmaVersion` | Result |
| --- | --- |
| `2022` | `Parsing error: Invalid regular expression flag` (**fatal**) |
| `'latest'` | clean |

A file ESLint cannot parse gets a `fatal` message and **no other rule runs on
it** — so the `vue/no-deprecated-*` gate this preset exists to arm goes silent
on exactly the files using modern syntax.

An app that genuinely wants a pin can spread its own layer after the preset;
flat config's last-wins ordering makes that a one-liner. That is the consumer's
call to make, not the shared preset's.

`tests/eslint/preset.spec.js` pins this: `tests/fixtures/eslint-preset/modern-syntax.js`
must lint clean through the preset, and a positive control re-lints the same
fixture at `2022` to prove it still fatals there.
:::

### 3. `vue/v-on-event-hyphenation` with `update:modelValue` excluded

:::danger Never let this rule autofix `@update:modelValue`

`@nextcloud/vue` v9's field components (`NcTextField`, `NcInputField`,
`NcPasswordField`, …) are built on Vue's `useModel()`, which only recognises a
parent binding under the **camelCase** prop key `onUpdate:modelValue`. Handed
the hyphenated `@update:model-value`, `useModel` falls back to LOCAL-ONLY mode:
the field still renders, still accepts typing, and **never emits back**. Every
keystroke is dropped, silently, with nothing in the console.

The rule's autofix rewrites `@update:modelValue` → `@update:model-value`, so
`eslint --fix` at the rule's default setting is an automated way to break every
two-way-bound field in an app. It has already happened once, across 42
listeners.
:::

The preset keeps the rule **enabled** for every other event and carves out only
`update:modelValue`.

### 4. The object form of `parserOptions.parser`

`@nextcloud/eslint-config/vue3` sets `parserOptions.parser` to the bare string
`'@typescript-eslint/parser'`. `vue-eslint-parser` then routes **template**
expressions through it as well, and its scope analysis does not carry `v-for`
iteration variables into the template scope. Every `:key` in a `v-for` then
looks like a reference to something the loop never declared — **385 false
positives** in this library alone, on code as plain as:

```html
<Segment v-for="seg in viewSegments" :key="seg.mode" />
```

The preset uses vue-eslint-parser's documented object form
(`{ js, ts }`), which repairs the scope analysis while leaving the rules
**armed**. That distinction is the whole point: the other way to make those
errors go away is to switch `vue/valid-v-for` off, which silences the gate
instead of fixing it. `tests/eslint/preset.spec.js` includes a control fixture
whose genuinely bad `:key` must **still** error.

### 5. It changes **how** you lint, never **which files** you lint

The preset scopes exactly one layer with a `files` glob — `**/*.vue`, the one
extension it supplies a parser for. Every other layer omits `files` entirely.

That is deliberate, and it is the fix for a shipped regression. In flat config a
`files` glob does two jobs at once:

1. it **scopes** the layer — "apply my options to these files"; and
2. it **enrols** them — a path matched by any layer's `files` becomes a file
   ESLint lints, even though ESLint's own default set is only `**/*.js`,
   `**/*.mjs` and `**/*.cjs`.

Earlier releases scoped the language-level and deprecation layers to a nine-entry
glob including `.jsx`, `.ts`, `.tsx`, `.mts` and `.cts`. Adopting the preset
therefore dragged those extensions into the consuming app's lint run — while
supplying a parser for `.vue` alone. Measured on portaliq's base
(`@nextcloud/eslint-config/vue3`, whose non-SFC parser is `@babel/eslint-parser`
with no JSX plugin):

```
base alone         + Probe.jsx  → NOT LINTED  (0 findings — a vacuous zero)
base alone         + Probe.js   → linted, 1 no-unused-vars      (positive control)
base + preset      + Probe.jsx  → linted, FATAL "requires … parser plugin(s): jsx"
standalone preset  + Probe.ts   → linted, FATAL
standalone preset  + Probe.tsx  → linted, FATAL
```

A `fatal` message stops ESLint evaluating **every other rule on that file**, so an
app with a React (or plain-TypeScript) surface silently lost lint coverage of all
of it — the same failure shape as the `ecmaVersion: 2022` pin in §2.

Note what the cause was **not**. Flat config *deep-merges*
`languageOptions.parserOptions`, so the preset never replaced a base's
`requireConfigFile` or `ecmaFeatures.jsx`; spreading it last yields the union.
"Merge instead of replace" would have been a no-op fix for a cause that was never
there. `tests/eslint/preset.spec.js` asserts the merge directly so nobody has to
re-derive it.

**What this means for you.** If your app has `.jsx`, `.ts` or `.tsx` files, enrol
them yourself, paired with a parser that can read them:

```js
module.exports = [
  ...conductionVue3,
  {
    name: 'app/jsx',
    files: ['**/*.jsx'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
]
```

The preset's layers then apply to those files automatically, because a layer with
no `files` matches whatever *you* lint. `eslint-plugin-vue` treats `.jsx` and
`.tsx` as Vue component files, so a render-function component in a `.jsx` gets the
full deprecation gate — verified by a `VueJsxLegacy.jsx` fixture whose
`beforeDestroy` and `this.$on` must still error.

### 6. The inverted Vue-2 rules are off

Three `eslint-plugin-vue` rules encode Vue **2** constraints that Vue 3 reverses.
Leaving them armed makes the preset reject code Vue 3 requires, so the preset
switches exactly these three off — and nothing else:

| Rule | Why it is wrong under Vue 3 |
| --- | --- |
| `vue/no-v-model-argument` | `v-model:foo="x"` is Vue 3's replacement for the removed `.sync` modifier — which `vue/no-deprecated-v-bind-sync` (armed at `error` by this same preset) forces you to migrate *to*. |
| `vue/no-v-for-template-key` | Vue 2 put the `:key` on the child of a `<template v-for>`; Vue 3 puts it on the `<template>` itself. |
| `vue/no-multiple-template-root` | Vue 3 has fragments. A multi-root template is valid and is the correct spelling for a component that contributes siblings to its parent's layout (table rows, toolbar buttons). |

The Vue-**3** half of the key pair, `vue/no-v-for-template-key-on-child`, is
untouched and stays armed: disabling both halves would silence the migration
entirely while looking identical from the app side.

`vue/no-multiple-template-root` was missed when the first two were switched off,
so consumers kept disabling it by hand — and the workaround people reach for
first is to reintroduce a wrapper `<div>`, which changes the rendered DOM and the
CSS written against it. Fixed in `2.1.0-vue3.16`; apps carrying a hand-written
`'vue/no-multiple-template-root': 'off'` can delete it.

None of the three is armed by `eslint-plugin-vue`'s Vue-3 `flat/essential`, so
`tests/eslint/preset.spec.js` proves the disables with fixtures linted through
the plugin's own `flat/vue2-essential` — which *does* arm them — first without
the preset (the control that the fixture triggers the rule at all), then with it.

## Exports

| Export | What it is |
| --- | --- |
| `conductionVue3` | Standalone flat-config array: `eslint-plugin-vue`'s `flat/essential` plus the fix layer. |
| `vueInvertedVue2Rules` | The three inverted Vue-2 rules, switched off, as a plain rules object. |
| `conductionVue3Fixes` | The fix layer alone. Registers no plugins — spread it **last** onto an existing config. |
| `vueDeprecationRules` | The armed `vue/no-deprecated-*` family (+ the `filters:` guard) as a plain rules object. |
| `vueEventCasingRules` | `vue/v-on-event-hyphenation` with the `update:modelValue` escape. |
| `vueSfcParserOptions` | The object-form `parserOptions` block for `.vue` files. |
| `ECMA_LANGUAGE_LEVEL` | `'latest'` — what the preset actually sets. |
| `ECMA_VERSION` | `2022` — the numeric syntax **floor**, for tooling that refuses the `'latest'` string. Reuse it rather than re-guessing a number; it is *not* what the preset configures. |

## Verifying an app actually adopted it

Configuration that *looks* adopted and configuration that *is* adopted are
different states. Check the effective config, not the file:

```bash
npx eslint --print-config src/App.vue | grep no-deprecated-destroyed
```

An empty result means the gate is not armed, whatever `eslint.config.js` says.
