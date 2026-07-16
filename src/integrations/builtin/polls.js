/**
 * Built-in `polls` integration registration (bespoke).
 *
 * Maps NC Polls' linked-poll surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\PollsProvider`,
 * storage strategy `link-table` — currently a direct DB query against
 * `polls_polls` filtered by an `[or:{uuid}]` title marker) onto
 * bespoke `CnPollsTab` and `CnPollsCard` components that surface
 * Polls-specific signals (live vote tally, option progress bars,
 * deadline countdown) the generic `CnIntegrationTab` /
 * `CnIntegrationCard` strip away.
 *
 * Registration ordering: this descriptor is exposed for consumers that
 * want the bespoke pair to win over the generic leaf-factory descriptor
 * in `leaves.js` via the AD-13 first-wins collision policy — register
 * `pollsIntegration` before `registerLeafIntegrations()`.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * @module integrations/builtin/polls
 */

import { translate as t } from '@nextcloud/l10n'
import CnPollsTab from './polls/CnPollsTab.vue'
import CnPollsCard from './polls/CnPollsCard.vue'

/**
 * `polls` integration descriptor.
 *
 * @type {object}
 */
export const pollsIntegration = {
	id: 'polls',
	label: t('nextcloud-vue', 'Polls'),
	icon: 'Poll',
	requiredApp: 'polls',
	order: 66,
	group: 'workflow',
	referenceType: 'polls',
	tab: CnPollsTab,
	widget: CnPollsCard,
	defaultSize: { w: 3, h: 3 },
}

export default pollsIntegration
