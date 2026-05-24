/**
 * Built-in `maps` integration registration (bespoke).
 *
 * Maps NC Maps' Location surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\MapsProvider`,
 * storage strategy `link-table` — marker `[or:{uuid}]` lives in the
 * Maps `maps_favorites.name` column) onto bespoke `CnMapsTab` and
 * `CnMapsCard` components that surface Maps-specific signals (category
 * badge, comment snippet, formatted lat/lng, "Open on map" deep-link)
 * which the generic `CnIntegrationTab` / `CnIntegrationCard` strip
 * away.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `maps` here makes the
 * bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order / defaultSize mirror
 * the leaf entry in `leaves.js` exactly so the descriptor stays
 * interchangeable should the bespoke pair ever need to fall back to
 * the generic components.
 *
 * `group` is `'docs'` — matching the leaf entry. The task brief
 * floated `'location'` / `'workflow'`, but `leaves.js` (the source of
 * truth for cross-app grouping) already places Maps in the docs
 * cluster alongside Bookmarks and Collectives; diverging here would
 * fragment the sidebar grouping.
 *
 * @module integrations/builtin/maps
 */

import { translate as t } from '@nextcloud/l10n'
import CnMapsTab from './maps/CnMapsTab.vue'
import CnMapsCard from './maps/CnMapsCard.vue'

/**
 * `maps` integration descriptor.
 *
 * @type {object}
 */
export const mapsIntegration = {
	id: 'maps',
	label: t('nextcloud-vue', 'Locations'),
	icon: 'MapMarker',
	requiredApp: 'maps',
	order: 42,
	group: 'docs',
	referenceType: 'maps',
	tab: CnMapsTab,
	widget: CnMapsCard,
	defaultSize: { w: 4, h: 3 },
}

export default mapsIntegration
