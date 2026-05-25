/**
 * Built-in `talk` integration registration (bespoke).
 *
 * Maps NC Talk's conversation surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\TalkProvider`,
 * storage strategy `link-table`) onto bespoke `CnTalkTab` and
 * `CnTalkCard` components that surface Talk-specific signals (unread
 * count, last-message preview, participant size) the generic
 * `CnIntegrationTab` / `CnIntegrationCard` strip away.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `talk` here makes the
 * bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * @module integrations/builtin/talk
 */

import { translate as t } from '@nextcloud/l10n'
import CnTalkTab from './talk/CnTalkTab.vue'
import CnTalkCard from './talk/CnTalkCard.vue'

/**
 * `talk` integration descriptor.
 *
 * @type {object}
 */
export const talkIntegration = {
	id: 'talk',
	label: t('nextcloud-vue', 'Chat'),
	icon: 'ChatOutline',
	requiredApp: 'spreed',
	order: 23,
	group: 'comms',
	referenceType: 'talk',
	tab: CnTalkTab,
	widget: CnTalkCard,
	defaultSize: { w: 3, h: 3 },
	// CnIntegrationWidget contract — exemplar accent (NC Talk brand blue).
	accentColor: '#0082c9',
	appName: 'Talk',
}

export default talkIntegration
