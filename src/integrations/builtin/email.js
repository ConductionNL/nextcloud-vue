/**
 * Built-in `email` integration registration (bespoke).
 *
 * Maps NC Mail's message surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\EmailProvider`,
 * storage strategy `link-table`) onto bespoke `CnEmailTab` and
 * `CnEmailCard` components that surface Mail-specific signals
 * (subject, sender, received-at, conversation thread) the generic
 * `CnIntegrationTab` / `CnIntegrationCard` strip away.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `email` here makes
 * the bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * @module integrations/builtin/email
 */

import { translate as t } from '@nextcloud/l10n'
import CnEmailTab from './email/CnEmailTab.vue'
import CnEmailCard from './email/CnEmailCard.vue'

/**
 * `email` integration descriptor.
 *
 * @type {object}
 */
export const emailIntegration = {
	id: 'email',
	label: t('nextcloud-vue', 'Emails'),
	icon: 'Email',
	requiredApp: 'mail',
	order: 22,
	group: 'comms',
	referenceType: 'email',
	tab: CnEmailTab,
	widget: CnEmailCard,
	defaultSize: { w: 3, h: 3 },
}

export default emailIntegration
