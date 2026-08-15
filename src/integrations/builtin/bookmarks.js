/**
 * Built-in `bookmarks` integration registration (bespoke).
 *
 * Maps NC Bookmarks' URL surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\BookmarksProvider`,
 * storage strategy `link-table`) onto bespoke `CnBookmarksTab` and
 * `CnBookmarksCard` components that surface Bookmarks-specific signals
 * (favicon, URL, description snippet, Bookmarks-side tag chips) the
 * generic `CnIntegrationTab` / `CnIntegrationCard` strip away.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `bookmarks` here makes
 * the bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * @module integrations/builtin/bookmarks
 */

import { translate as t } from '@nextcloud/l10n'
import CnBookmarksTab from './bookmarks/CnBookmarksTab.vue'
import CnBookmarksCard from './bookmarks/CnBookmarksCard.vue'

/**
 * `bookmarks` integration descriptor.
 *
 * @type {object}
 */
export const bookmarksIntegration = {
	id: 'bookmarks',
	label: t('nextcloud-vue', 'Bookmarks'),
	icon: 'Bookmark',
	requiredApp: 'bookmarks',
	order: 40,
	group: 'docs',
	// NC Bookmarks ships the default Nextcloud-blue app icon (no distinct
	// brand hue), so tint the tab header with the standard NC element blue.
	accentColor: '#0082c9',
	referenceType: 'bookmarks',
	tab: CnBookmarksTab,
	widget: CnBookmarksCard,
	defaultSize: { w: 3, h: 3 },
}

export default bookmarksIntegration
