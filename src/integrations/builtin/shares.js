/**
 * Built-in `shares` integration registration (bespoke).
 *
 * Maps NC Shares (NC core, no required app — `OCP\Share\IManager`)
 * onto bespoke `CnSharesTab` and `CnSharesCard` components that
 * surface share-specific signals (recipient list, share type, expiry,
 * password-protected flag) which the generic `CnIntegrationTab` /
 * `CnIntegrationCard` strip away.
 *
 * PHP-side provider:
 *   `OCA\OpenRegister\Service\Integration\Providers\SharesProvider`
 *   (storage strategy `query-time`, NC-core integration). The provider
 *   walks the object's linked files and calls
 *   `OCP\Share\IManager::getSharesBy()` per file, then unions and
 *   deduplicates the rows. Replaces an earlier `MarkerLookupTrait`
 *   path against `share.note` which NC rarely populates.
 *
 * Registration ordering: this descriptor is exported but NOT added to
 * `registerBuiltinIntegrations()` — consuming apps import it and call
 * `registry.register(sharesIntegration)` themselves before the leaf
 * registration drains. AD-13 first-wins then keeps the bespoke pair
 * over the generic leaf-factory descriptor in `leaves.js`.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf
 * entry in `leaves.js` exactly (id='shares', group='core',
 * requiredApp=null, order=10) so the descriptor stays interchangeable
 * should the bespoke pair ever need to fall back to the generic
 * components.
 *
 * @module integrations/builtin/shares
 */

import { translate as t } from '@nextcloud/l10n'
import CnSharesTab from './shares/CnSharesTab.vue'
import CnSharesCard from './shares/CnSharesCard.vue'

/**
 * `shares` integration descriptor.
 *
 * @type {object}
 */
export const sharesIntegration = {
	id: 'shares',
	label: t('nextcloud-vue', 'Shares'),
	icon: 'Share',
	requiredApp: null,
	order: 10,
	group: 'core',
	referenceType: 'shares',
	tab: CnSharesTab,
	widget: CnSharesCard,
	defaultSize: { w: 3, h: 3 },
}

export default sharesIntegration
