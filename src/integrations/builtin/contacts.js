/**
 * Built-in `contacts` integration registration (bespoke).
 *
 * Maps NC Contacts' vCard surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\ContactsProvider`,
 * storage strategy `link-table`) onto bespoke `CnContactsTab` and
 * `CnContactsCard` components that surface Contacts-specific signals
 * (display name, role grouping, avatar, primary email/phone) the
 * generic `CnIntegrationTab` / `CnIntegrationCard` strip away.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `contacts` here makes
 * the bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * @module integrations/builtin/contacts
 */

import { translate as t } from '@nextcloud/l10n'
import CnContactsTab from './contacts/CnContactsTab.vue'
import CnContactsCard from './contacts/CnContactsCard.vue'

/**
 * `contacts` integration descriptor.
 *
 * @type {object}
 */
export const contactsIntegration = {
	id: 'contacts',
	label: t('nextcloud-vue', 'Contacts'),
	icon: 'AccountBox',
	requiredApp: 'contacts',
	order: 21,
	group: 'comms',
	referenceType: 'contacts',
	tab: CnContactsTab,
	widget: CnContactsCard,
	defaultSize: { w: 3, h: 3 },
}

export default contactsIntegration
