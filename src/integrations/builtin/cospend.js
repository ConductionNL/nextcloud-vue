/**
 * Built-in `cospend` integration registration (bespoke).
 *
 * Maps NC Cospend's project + bill surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\CospendProvider`,
 * storage strategy `link-table` — marker `[or:{uuid}]` in
 * `cospend_projects.name`) onto bespoke `CnCospendTab` and
 * `CnCospendCard` components. The generic `CnIntegrationTab` /
 * `CnIntegrationCard` strip away Cospend's primary signals — *whether
 * the row is a project or a bill*, the amount and the currency — that
 * case handlers need at a glance; the bespoke pair surfaces them as
 * type chips, amount columns and per-currency totals.
 *
 * Per wave-2.3 design the provider returns project AND bill rows in the
 * same payload distinguished by a `type` discriminator (`'project'` |
 * `'bill'`); the bespoke pair branches on that discriminator. When the
 * provider only emits projects (current shipping behaviour) the UI
 * gracefully degrades to a flat project list with a `[Project]` chip.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `cospend` here makes the
 * bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * @module integrations/builtin/cospend
 */

import { translate as t } from '@nextcloud/l10n'
import CnCospendTab from './cospend/CnCospendTab.vue'
import CnCospendCard from './cospend/CnCospendCard.vue'

/**
 * `cospend` integration descriptor.
 *
 * @type {object}
 */
export const cospendIntegration = {
	id: 'cospend',
	label: t('nextcloud-vue', 'Costs'),
	icon: 'CurrencyEur',
	requiredApp: 'cospend',
	order: 62,
	group: 'workflow',
	referenceType: 'cospend',
	tab: CnCospendTab,
	widget: CnCospendCard,
	defaultSize: { w: 3, h: 3 },
}

export default cospendIntegration
