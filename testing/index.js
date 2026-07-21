/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Root-level shim so consuming apps can write the short subpath
 * `@conduction/nextcloud-vue/testing` instead of the longer
 * `@conduction/nextcloud-vue/src/testing`. `package.json` has no
 * "exports" map (a deliberate choice already relied on by
 * `@conduction/nextcloud-vue/src/composables`, `.../src/icons/rvo.js`,
 * `.../src/types` — see their docblocks), so Node/webpack's default
 * resolution needs an actual file at the package root for the short form
 * to work; this is that file. The real implementation lives in
 * `../src/testing/a11y.js`.
 *
 * @module testing (root shim)
 */

export { expectAccessible, WCAG_AA_TAGS } from '../src/testing/index.js'
