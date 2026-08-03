/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Types for `@conduction/nextcloud-vue/eslint`.
 *
 * Flat-config entries are typed loosely (`Record<string, unknown>`) rather
 * than against ESLint's own `Linter.FlatConfig`: `eslint` is an OPTIONAL peer
 * dependency here, so referencing its types would make this declaration file
 * fail to resolve in any consumer that has not installed it.
 */

/** A single ESLint flat-config entry. */
export type CnFlatConfigEntry = Record<string, unknown>

/**
 * The ECMAScript syntax FLOOR every Conduction app may rely on, as a number —
 * for tooling that refuses the `'latest'` string. NOT the value the preset
 * sets; see {@link ECMA_LANGUAGE_LEVEL}.
 */
export const ECMA_VERSION: number

/**
 * The level the preset actually configures: `'latest'`. A shared preset that
 * pins a year can only ever LOWER a consumer.
 */
export const ECMA_LANGUAGE_LEVEL: 'latest'

/** `parserOptions` for `<script>` blocks in `.vue` files (object-form parser). */
export const vueSfcParserOptions: Record<string, unknown>

/** The whole `vue/no-deprecated-*` family at `error`, plus the `filters:` guard. */
export const vueDeprecationRules: Record<string, unknown>

/** `vue/v-on-event-hyphenation` with `update:modelValue` excluded. */
export const vueEventCasingRules: Record<string, unknown>

/**
 * The three Vue-2 rules that forbid syntax Vue 3 requires or permits, switched
 * off: `vue/no-v-model-argument`, `vue/no-v-for-template-key` and
 * `vue/no-multiple-template-root` (Vue 3 fragments). The Vue-3 half of the key
 * pair (`vue/no-v-for-template-key-on-child`) stays armed.
 */
export const vueInvertedVue2Rules: Record<string, unknown>

/** Composable fix layer — registers no plugins; spread it LAST. */
export const conductionVue3Fixes: CnFlatConfigEntry[]

/** Standalone preset: eslint-plugin-vue's flat/essential + the fix layer. */
export const conductionVue3: CnFlatConfigEntry[]
