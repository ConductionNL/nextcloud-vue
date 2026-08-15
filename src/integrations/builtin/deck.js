/**
 * Built-in `deck` integration registration (bespoke).
 *
 * Maps NC Deck's card surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\DeckProvider`,
 * storage strategy `link-table`) onto bespoke `CnDeckTab` and
 * `CnDeckCard` components. The generic `CnIntegrationTab` /
 * `CnIntegrationCard` strip away Deck's primary signals (board /
 * stack position, card title) that case handlers need at a glance;
 * the bespoke pair surfaces them in a kanban-mini layout.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `deck` here makes the
 * bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * @module integrations/builtin/deck
 */

import { translate as t } from '@nextcloud/l10n'
import CnDeckTab from './deck/CnDeckTab.vue'
import CnDeckCard from './deck/CnDeckCard.vue'

/**
 * `deck` integration descriptor.
 *
 * @type {object}
 */
export const deckIntegration = {
	id: 'deck',
	label: t('nextcloud-vue', 'Cards'),
	icon: 'ViewColumnOutline',
	requiredApp: 'deck',
	order: 63,
	group: 'workflow',
	referenceType: 'deck',
	tab: CnDeckTab,
	widget: CnDeckCard,
	defaultSize: { w: 4, h: 3 },
	// CnIntegrationWidget contract — exemplar accent (NC Deck brand blue).
	// `appName` / `docsUrl` default from id+label in the registry.
	accentColor: '#0082c9',
	appName: 'Deck',
}

export default deckIntegration
