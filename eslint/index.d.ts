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

/** ECMAScript level every Conduction app is linted against. */
export const ECMA_VERSION: number

/** `parserOptions` for `<script>` blocks in `.vue` files (object-form parser). */
export const vueSfcParserOptions: Record<string, unknown>

/** The whole `vue/no-deprecated-*` family at `error`, plus the `filters:` guard. */
export const vueDeprecationRules: Record<string, unknown>

/** `vue/v-on-event-hyphenation` with `update:modelValue` excluded. */
export const vueEventCasingRules: Record<string, unknown>

/** Composable fix layer — registers no plugins; spread it LAST. */
export const conductionVue3Fixes: CnFlatConfigEntry[]

/** Standalone preset: eslint-plugin-vue's flat/essential + the fix layer. */
export const conductionVue3: CnFlatConfigEntry[]
