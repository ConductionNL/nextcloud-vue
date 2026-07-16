/**
 * Built-in `photos` integration registration (bespoke).
 *
 * Maps NC Photos' album surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\PhotosProvider`,
 * storage strategy `link-table`) onto bespoke `CnPhotosTab` and
 * `CnPhotosCard` components that surface Photos-specific signals
 * (cover thumbnail, photo count, last-edited date) the generic
 * `CnIntegrationTab` / `CnIntegrationCard` strip away.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `photos` here makes the
 * bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * Refs openregister#1319.
 *
 * @module integrations/builtin/photos
 */

import { translate as t } from '@nextcloud/l10n'
import CnPhotosTab from './photos/CnPhotosTab.vue'
import CnPhotosCard from './photos/CnPhotosCard.vue'

/**
 * `photos` integration descriptor.
 *
 * @type {object}
 */
export const photosIntegration = {
	id: 'photos',
	label: t('nextcloud-vue', 'Photos'),
	icon: 'Image',
	requiredApp: 'photos',
	order: 43,
	group: 'docs',
	referenceType: 'photos',
	tab: CnPhotosTab,
	widget: CnPhotosCard,
	defaultSize: { w: 4, h: 3 },
}

export default photosIntegration
