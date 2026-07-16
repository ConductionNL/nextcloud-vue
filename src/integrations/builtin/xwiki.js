/**
 * XWiki integration registration ("Articles") — leaf.
 *
 * Mirrors OpenRegister's PHP `XwikiProvider` (id: `xwiki`, group:
 * `external`, storage: `external`, OpenConnector source: `xwiki`). The
 * sidebar tab (`CnXwikiTab`) lists linked pages with breadcrumbs and a
 * link-by-URL-or-path form; the widget (`CnXwikiCard`) is surface-aware
 * — a text preview on detail pages, a compact list on dashboards, a
 * title+breadcrumb chip for `referenceType: 'xwiki'` properties.
 *
 * This is a *leaf* registration, not a built-in: it is NOT included in
 * `builtinIntegrations` and `registerBuiltinIntegrations()` does not
 * register it. OpenRegister's main bundle calls
 * `registerXwikiIntegration()` explicitly (the integration only makes
 * sense when the `openconnector` app is installed — `requiredApp`
 * carries that hint for the admin UI). A consuming app may also
 * pre-register an `id: 'xwiki'` to override this (collision policy:
 * first wins).
 *
 * @module integrations/builtin/xwiki
 */

import { translate as t } from '@nextcloud/l10n'
import { integrations as defaultRegistry } from '../registry.js'
import CnXwikiTab from '../../components/CnXwikiTab/CnXwikiTab.vue'
import CnXwikiCard from '../../components/CnXwikiCard/CnXwikiCard.vue'

/**
 * `xwiki` integration descriptor — pass to `integrations.register()`.
 *
 * @type {object}
 */
export const xwikiIntegration = {
	id: 'xwiki',
	label: t('nextcloud-vue', 'Articles'),
	icon: 'FileDocumentMultiple',
	requiredApp: 'openconnector',
	order: 30,
	group: 'external',
	referenceType: 'xwiki',
	tab: CnXwikiTab,
	widget: CnXwikiCard,
	defaultSize: { w: 4, h: 4 },
}

/**
 * Register the `xwiki` integration onto a registry (default: the
 * singleton). Skips silently if an `id: 'xwiki'` is already registered
 * (collision policy: first wins — no dev-mode warning here).
 *
 * @param {object} [registry] Registry instance (default: the singleton).
 *
 * @return {boolean} True if newly registered, false if it was already present.
 */
export function registerXwikiIntegration(registry) {
	const target = registry || defaultRegistry
	if (target.has(xwikiIntegration.id) === true) {
		return false
	}
	return target.register(xwikiIntegration) !== null
}

export default xwikiIntegration
