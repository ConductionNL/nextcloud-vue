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
 * NOTE FOR PLAYWRIGHT USERS: this barrel is ES-module source in a `.js`
 * file — a bundler handles that, plain Node does not — and importing it
 * also reaches the `axe-core`-backed a11y helper, which a browser e2e
 * suite has no use for. Import the e2e helpers from the CommonJS,
 * dependency-free subpath instead:
 *
 * ```js
 * const { dismissFirstVisitOverlays } = require('@conduction/nextcloud-vue/testing/playwright')
 * // or, from an ESM / TypeScript spec:
 * import { dismissFirstVisitOverlays } from '@conduction/nextcloud-vue/testing/playwright'
 * ```
 *
 * @module testing (root shim)
 */

export { expectAccessible, WCAG_AA_TAGS } from '../src/testing/index.js'

export {
	SUPPORT_DIALOG_STORAGE_PREFIX,
	WALKTHROUGH_STORAGE_PREFIX,
	seedSupportDialogSeen,
	seedWalkthroughSeen,
	seedFirstVisitOverlaysSeen,
	dismissWalkthrough,
	dismissSupportDialog,
	dismissFirstVisitOverlays,
	mountedAppIds,
	mountedComponents,
	mountedComponentNames,
	findMounted,
	readComponentProp,
} from './playwright.js'
