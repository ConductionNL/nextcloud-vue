/**
 * Built-in `openproject` integration registration (bespoke, external).
 *
 * Maps OpenProject's work-package surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\OpenProjectProvider`,
 * storage strategy `external`, Integriq-routed) onto bespoke
 * `CnOpenprojectTab` and `CnOpenprojectCard` components. The generic
 * `CnIntegrationTab` / `CnIntegrationCard` would strip away
 * OpenProject's primary signals (work-package status, type, priority,
 * assignee, project) that case handlers need at a glance; the bespoke
 * pair surfaces them as status pills, type badges, priority indicators
 * and assignee avatars.
 *
 * As the first **external-storage** integration the pair also handles
 * the auth-status surface (configured / missing / expired) emitted by
 * Integriq — the generic components don't know how to render that
 * state, so the bespoke tab degrades to an "unconfigured" / "auth
 * expired" CTA pointing back to the Integriq admin UI.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `openproject` here makes
 * the bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order / defaultSize mirror
 * the leaf entry in `leaves.js` exactly so the descriptor stays
 * interchangeable should the bespoke pair ever need to fall back to the
 * generic components.
 *
 * @module integrations/builtin/openproject
 */

import { translate as t } from '@nextcloud/l10n'
import CnOpenprojectTab from './openproject/CnOpenprojectTab.vue'
import CnOpenprojectCard from './openproject/CnOpenprojectCard.vue'

/**
 * `openproject` integration descriptor.
 *
 * @type {object}
 */
export const openprojectIntegration = {
	id: 'openproject',
	label: t('nextcloud-vue', 'Projects'),
	appName: t('nextcloud-vue', 'OpenProject'),
	icon: 'Briefcase',
	requiredApp: 'openconnector',
	order: 31,
	group: 'external',
	// OpenProject's brand blue (recognizable spot colour for the leaf).
	accentColor: '#1A67A3',
	storageStrategy: 'external',
	referenceType: 'openproject',
	tab: CnOpenprojectTab,
	widget: CnOpenprojectCard,
	defaultSize: { w: 4, h: 4 },
}

export default openprojectIntegration
