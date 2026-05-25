/**
 * Built-in `time-tracker` integration registration (bespoke).
 *
 * Maps NC TimeManager's client / task / time-entry surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\TimeProvider`,
 * storage strategy `link-table` — marker `[or:{uuid}]` in
 * `timemanager_project.name`) onto bespoke `CnTimeTrackerTab` and
 * `CnTimeTrackerCard` components. The generic `CnIntegrationTab` /
 * `CnIntegrationCard` strip away TimeManager's primary signals —
 * `kind` discriminator, duration, and billable flag — that case
 * handlers need at a glance; the bespoke pair
 * surfaces them as kind chips, duration columns and billable
 * indicators.
 *
 * Per wave-2.4 design the provider returns clients AND tasks AND time
 * entries in the same payload distinguished by a `kind` discriminator
 * (`'client'` | `'task'` | `'time'`); the bespoke pair branches on
 * that discriminator. When the provider only emits projects-as-clients
 * (current shipping behaviour) the UI gracefully degrades to a flat
 * client list with a `[Client]` chip.
 *
 * Note: the leaf slug is `time-tracker` (with a hyphen) but the NC
 * app id is `timemanager` (no hyphen) — `requiredApp` reflects the NC
 * app id while the leaf id keeps the kebab-case slug.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `time-tracker` here
 * makes the bespoke pair win over the generic leaf-factory descriptor
 * in `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * @module integrations/builtin/time-tracker
 */

import { translate as t } from '@nextcloud/l10n'
import CnTimeTrackerTab from './time-tracker/CnTimeTrackerTab.vue'
import CnTimeTrackerCard from './time-tracker/CnTimeTrackerCard.vue'

/**
 * `time-tracker` integration descriptor.
 *
 * @type {object}
 */
export const timeTrackerIntegration = {
	id: 'time-tracker',
	label: t('nextcloud-vue', 'Time tracker'),
	appName: t('nextcloud-vue', 'Time manager'),
	icon: 'Clock',
	requiredApp: 'timemanager',
	order: 67,
	group: 'workflow',
	referenceType: 'time-tracker',
	tab: CnTimeTrackerTab,
	widget: CnTimeTrackerCard,
	defaultSize: { w: 3, h: 3 },
}

export default timeTrackerIntegration
