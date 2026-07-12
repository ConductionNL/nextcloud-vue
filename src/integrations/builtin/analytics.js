/**
 * Built-in `analytics` integration registration (bespoke).
 *
 * Maps NC Analytics' report / dashboard surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\AnalyticsProvider`,
 * storage strategy `link-table`) onto bespoke `CnAnalyticsTab` and
 * `CnAnalyticsCard` components that surface Analytics-specific signals
 * (report type, subheader, modified date, type-coded icon) the
 * generic `CnIntegrationTab` / `CnIntegrationCard` strip away.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `analytics` here makes
 * the bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * This is the leaf LaunchPad adopts to surface analytics in dashboard
 * widgets without re-implementing the link-table mechanics.
 *
 * Refs openregister#1321.
 *
 * @module integrations/builtin/analytics
 */

import { translate as t } from '@nextcloud/l10n'
import CnAnalyticsTab from './analytics/CnAnalyticsTab.vue'
import CnAnalyticsCard from './analytics/CnAnalyticsCard.vue'

/**
 * `analytics` integration descriptor.
 *
 * @type {object}
 */
export const analyticsIntegration = {
	id: 'analytics',
	label: t('nextcloud-vue', 'Analytics'),
	icon: 'ChartBar',
	// NC Analytics' toolbar / chart accent reads as the Nextcloud
	// primary blue; used by CnIntegrationWidget for the tab tint.
	accentColor: '#0082c9',
	requiredApp: 'analytics',
	order: 61,
	group: 'workflow',
	referenceType: 'analytics',
	tab: CnAnalyticsTab,
	widget: CnAnalyticsCard,
	defaultSize: { w: 4, h: 3 },
}

export default analyticsIntegration
