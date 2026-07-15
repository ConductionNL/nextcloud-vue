/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Barrel for `@conduction/nextcloud-vue`'s testing utilities.
 *
 * Deliberately NOT re-exported from `src/index.js` — see the docblock in
 * `./a11y.js` for why (keeps `axe-core` out of the production bundle).
 * Import it directly:
 *
 * ```js
 * import { expectAccessible, WCAG_AA_TAGS } from '@conduction/nextcloud-vue/testing'
 * // or, the raw-source form used elsewhere in this package (see
 * // src/composables/index.js consumers, src/icons/ATTRIBUTION.md):
 * import { expectAccessible } from '@conduction/nextcloud-vue/src/testing'
 * ```
 *
 * @module testing
 */

export { expectAccessible, WCAG_AA_TAGS } from './a11y.js'
