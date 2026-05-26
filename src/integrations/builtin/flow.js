/**
 * Built-in `flow` (automation) integration registration (bespoke).
 *
 * Maps NC Flow's (workflowengine) operation surface (PHP-side:
 * `OCA\OpenRegister\Service\Integration\Providers\FlowProvider`,
 * storage strategy `link-table` — backed by NC's
 * `OCA\WorkflowEngine\Manager::getAllOperations()` against the admin
 * scope, filtered by an `[or:{uuid}]` marker in the operation name)
 * onto bespoke `CnFlowTab` and `CnFlowCard` components that surface
 * Flow-specific signals (entity binding, trigger events, condition
 * count, enabled state) the generic `CnIntegrationTab` /
 * `CnIntegrationCard` strip away.
 *
 * Registration ordering: `registerBuiltinIntegrations()` runs before
 * `registerLeafIntegrations()` in OpenRegister's bootstrap (see
 * `openregister/src/main.js`), so registering `flow` here makes the
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
 * that want the bespoke pair can `register(flowIntegration)` directly
 * before `registerLeafIntegrations()`.
 *
 * @module integrations/builtin/flow
 */

import { translate as t } from '@nextcloud/l10n'
import CnFlowTab from './flow/CnFlowTab.vue'
import CnFlowCard from './flow/CnFlowCard.vue'

/**
 * `flow` integration descriptor.
 *
 * @type {object}
 */
export const flowIntegration = {
	id: 'flow',
	label: t('nextcloud-vue', 'Flow'),
	appName: t('nextcloud-vue', 'Flow'),
	icon: 'SitemapOutline',
	accentColor: '#0082c9',
	requiredApp: 'workflowengine',
	order: 64,
	group: 'workflow',
	referenceType: 'flow',
	tab: CnFlowTab,
	widget: CnFlowCard,
	defaultSize: { w: 3, h: 3 },
}

export default flowIntegration
