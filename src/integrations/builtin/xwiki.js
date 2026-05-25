/**
 * Built-in `xwiki` integration registration (bespoke).
 *
 * Maps OpenRegister's external `XwikiProvider` (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\XwikiProvider`,
 * storage strategy `external` — all CRUD routed through
 * `ExternalIntegrationRouter` to an OpenConnector `xwiki` source) onto
 * bespoke `CnXwikiTab` and `CnXwikiCard` components that surface
 * XWiki-specific signals (page breadcrumb, last-modified, text preview
 * with macro-inert HTML strip, "Open in XWiki" deep-link, and prominent
 * configure/reconnect banners when the OpenConnector source is missing
 * or its credentials have expired) which the generic `CnIntegrationTab`
 * / `CnIntegrationCard` strip away.
 *
 * Registration ordering: this descriptor is exposed for consumers that
 * want the bespoke pair to win over the generic leaf-factory descriptor
 * (xwiki is NOT in `leaves.js` today — register `xwikiIntegration`
 * explicitly via OpenRegister's main bundle when OpenConnector is
 * installed; the AD-13 first-wins collision policy keeps the bespoke
 * pair if both end up being added).
 *
 * `requiredApp` is `openconnector` (NOT `xwiki` — XWiki itself runs
 * outside Nextcloud as an external HTTP service; OpenConnector is the
 * NC-side app that carries the `xwiki` source + credentials).
 *
 * @module integrations/builtin/xwiki
 */

import { translate as t } from '@nextcloud/l10n'
import CnXwikiTab from './xwiki/CnXwikiTab.vue'
import CnXwikiCard from './xwiki/CnXwikiCard.vue'

/**
 * `xwiki` integration descriptor.
 *
 * @type {object}
 */
export const xwikiIntegration = {
	id: 'xwiki',
	label: t('nextcloud-vue', 'Articles'),
	appName: t('nextcloud-vue', 'XWiki'),
	icon: 'FileDocumentMultiple',
	requiredApp: 'openconnector',
	order: 32,
	group: 'external',
	referenceType: 'xwiki',
	storageStrategy: 'external',
	tab: CnXwikiTab,
	widget: CnXwikiCard,
	defaultSize: { w: 4, h: 3 },
}

export default xwikiIntegration
