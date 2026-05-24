/**
 * Built-in `calendar` integration registration (bespoke).
 *
 * Maps NC Calendar's meeting surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\CalendarProvider`,
 * storage strategy `link-table`) onto bespoke `CnCalendarTab` and
 * `CnCalendarCard` components that surface Calendar-specific signals
 * (event time, attendees, location) the generic `CnIntegrationTab` /
 * `CnIntegrationCard` strip away.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `calendar` here makes
 * the bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * @module integrations/builtin/calendar
 */

import { translate as t } from '@nextcloud/l10n'
import CnCalendarTab from './calendar/CnCalendarTab.vue'
import CnCalendarCard from './calendar/CnCalendarCard.vue'

/**
 * `calendar` integration descriptor.
 *
 * @type {object}
 */
export const calendarIntegration = {
	id: 'calendar',
	label: t('nextcloud-vue', 'Meetings'),
	icon: 'Calendar',
	requiredApp: 'calendar',
	order: 20,
	group: 'comms',
	referenceType: 'calendar',
	tab: CnCalendarTab,
	widget: CnCalendarCard,
	defaultSize: { w: 4, h: 3 },
}

export default calendarIntegration
