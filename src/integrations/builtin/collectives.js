/**
 * Built-in `collectives` integration registration (bespoke).
 *
 * Maps NC Collectives' Knowledge surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\CollectivesProvider`,
 * storage strategy `link-table` — marker `[or:{uuid}]` lives in the
 * Collectives `collectives_pages.slug` column) onto bespoke
 * `CnCollectivesTab` and `CnCollectivesCard` components that surface
 * Knowledge-specific signals (collective grouping, emoji glyph, content
 * snippet, last-modified hint, deep-link into the page inside NC
 * Collectives) which the generic `CnIntegrationTab` /
 * `CnIntegrationCard` strip away.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `collectives` here makes
 * the bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * @module integrations/builtin/collectives
 */

import { translate as t } from '@nextcloud/l10n'
import CnCollectivesTab from './collectives/CnCollectivesTab.vue'
import CnCollectivesCard from './collectives/CnCollectivesCard.vue'

/**
 * `collectives` integration descriptor.
 *
 * @type {object}
 */
export const collectivesIntegration = {
	id: 'collectives',
	label: t('nextcloud-vue', 'Knowledge'),
	appName: t('nextcloud-vue', 'Collectives'),
	icon: 'BookOpenPageVariant',
	requiredApp: 'collectives',
	order: 41,
	group: 'docs',
	referenceType: 'collectives',
	tab: CnCollectivesTab,
	widget: CnCollectivesCard,
	defaultSize: { w: 3, h: 3 },
}

export default collectivesIntegration
