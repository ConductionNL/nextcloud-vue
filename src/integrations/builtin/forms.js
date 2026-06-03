/**
 * Built-in `forms` integration registration (bespoke).
 *
 * Maps NC Forms' linked-form surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\FormsProvider`,
 * storage strategy `link-table` — currently a DB query against
 * `forms_v2_forms` filtered by an `[or:{uuid}]` description marker,
 * with submission rows joined via `forms_v2_submissions`) onto
 * bespoke `CnFormsTab` and `CnFormsCard` components that surface
 * Forms-specific signals (status pill, submission count, expiry
 * countdown) the generic `CnIntegrationTab` / `CnIntegrationCard`
 * strip away.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `forms` here makes the
 * bespoke pair win over the generic leaf-factory descriptor in
 * `leaves.js` via the AD-13 first-wins collision policy.
 *
 * id / label / icon / group / requiredApp / order mirror the leaf entry
 * in `leaves.js` exactly so the descriptor stays interchangeable should
 * the bespoke pair ever need to fall back to the generic components.
 *
 * Note: this descriptor is exported but NOT yet added to
 * `builtinIntegrations` in `index.js` — the coordinator merges all 8
 * Phase C-1 stub descriptors atomically. Until then, consuming apps
 * that want the bespoke pair can `register(formsIntegration)` directly
 * before `registerLeafIntegrations()`.
 *
 * @module integrations/builtin/forms
 */

import { translate as t } from '@nextcloud/l10n'
import CnFormsTab from './forms/CnFormsTab.vue'
import CnFormsCard from './forms/CnFormsCard.vue'

/**
 * `forms` integration descriptor.
 *
 * @type {object}
 */
export const formsIntegration = {
	id: 'forms',
	label: t('nextcloud-vue', 'Forms'),
	icon: 'ClipboardText',
	requiredApp: 'forms',
	order: 65,
	group: 'workflow',
	referenceType: 'forms',
	tab: CnFormsTab,
	widget: CnFormsCard,
	defaultSize: { w: 3, h: 3 },
	// CnIntegrationWidget contract — exemplar accent (NC Forms brand green).
	accentColor: '#0d7000',
	appName: 'Forms',
}

export default formsIntegration
