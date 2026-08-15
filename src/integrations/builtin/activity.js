/**
 * Built-in `activity` integration registration (bespoke).
 *
 * Maps NC Activity onto bespoke `CnActivityTab` and `CnActivityCard`
 * components that surface activity-specific signals — actor + verb +
 * subject + timestamp grouped chronologically by day — which the
 * generic `CnIntegrationTab` / `CnIntegrationCard` strip away.
 *
 * PHP-side provider:
 *   `OCA\OpenRegister\Service\Integration\Providers\ActivityProvider`
 *   (storage strategy `query-time`, requires NC Activity app). The
 *   provider's `MarkerLookupTrait`-on-`activity.subject` query is the
 *   one place across the leaf set where the marker pattern is
 *   intentionally preserved: NC Activity does write a single string
 *   subject column and that column is the marker target. See the
 *   integration-activity proposal acceptance criteria #5 for the
 *   carve-out rationale and the 2026-05-24 registry audit notes for
 *   the borderline-vs-template-stamped classification.
 *
 * Registration ordering: this descriptor is exported but NOT added to
 * `registerBuiltinIntegrations()` — consuming apps import it and call
 * `registry.register(activityIntegration)` themselves before the leaf
 * registration drains. AD-13 first-wins then keeps the bespoke pair
 * over the generic leaf-factory descriptor in `leaves.js`.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf
 * entry in `leaves.js` exactly (id='activity', group='workflow',
 * requiredApp='activity', order=60) so the descriptor stays
 * interchangeable should the bespoke pair ever need to fall back to
 * the generic components.
 *
 * @module integrations/builtin/activity
 */

import { translate as t } from '@nextcloud/l10n'
import CnActivityTab from './activity/CnActivityTab.vue'
import CnActivityCard from './activity/CnActivityCard.vue'

/**
 * `activity` integration descriptor.
 *
 * @type {object}
 */
export const activityIntegration = {
	id: 'activity',
	label: t('nextcloud-vue', 'Activity'),
	icon: 'Timeline',
	requiredApp: 'activity',
	order: 60,
	group: 'workflow',
	referenceType: 'activity',
	tab: CnActivityTab,
	widget: CnActivityCard,
	defaultSize: { w: 3, h: 3 },
}

export default activityIntegration
