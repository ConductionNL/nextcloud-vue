/**
 * Leaf integration registrations — the 18 NC-native + external leaf
 * integrations whose PHP IntegrationProviders live in
 * `openregister/lib/Service/Integration/Providers/`.
 *
 * Each entry is a registry descriptor pointing the generic
 * {@link CnIntegrationTab} + {@link CnIntegrationCard} components at a
 * specific provider id; the components fetch from
 * `/api/objects/{register}/{schema}/{id}/integrations/{integrationId}`,
 * so per-leaf wiring is pure metadata until any individual leaf needs
 * a bespoke Vue component (at which point the registration's `tab`
 * and/or `widget` is repointed at the leaf-specific Vue file — same
 * pattern future bespoke tabs will use).
 *
 * `registerLeafIntegrations()` registers all 18 against the singleton
 * registry. Consuming apps that import the umbrella `installIntegration
 * Registry()` pick this up via OpenRegister's main bundle; standalone
 * tests can pass a private registry instance.
 *
 * Per AD-13 collision policy: registering an id already present is a
 * no-op (first wins). So a consuming app can pre-register an id with a
 * bespoke Vue component to override the generic one.
 *
 * @module integrations/builtin/leaves
 */

import { translate as t } from '@nextcloud/l10n'
import { integrations as defaultRegistry } from '../registry.js'
import CnIntegrationTab from '../../components/CnIntegrationTab/CnIntegrationTab.vue'
import CnIntegrationCard from '../../components/CnIntegrationCard/CnIntegrationCard.vue'

/**
 * Build a leaf descriptor wiring the generic tab + card components.
 *
 * @param {object} meta            Leaf metadata.
 * @param {string} meta.id         Stable provider id (matches PHP-side).
 * @param {string} meta.label      Human-readable label (already translated).
 * @param {string} meta.icon       MDI icon name (no `mdi-` prefix).
 * @param {?string} meta.group     Named group (core/comms/docs/workflow/external).
 * @param {?string} meta.requiredApp Required Nextcloud app id.
 * @param {number} meta.order      Numeric ordering hint.
 * @param {?string} [meta.referenceType] referenceType marker (defaults to id).
 * @param {object} [meta.defaultSize] Default grid dimensions `{w, h}`.
 *
 * @return {object} Registry descriptor.
 */
function leaf(meta) {
	return {
		id: meta.id,
		label: meta.label,
		icon: meta.icon,
		group: meta.group ?? null,
		requiredApp: meta.requiredApp ?? null,
		order: meta.order,
		referenceType: meta.referenceType ?? meta.id,
		tab: CnIntegrationTab,
		widget: CnIntegrationCard,
		defaultSize: meta.defaultSize ?? { w: 3, h: 3 },
	}
}

/**
 * The 18 leaf integration descriptors.
 *
 * Order numbers cluster by group so the admin UI / sidebar render
 * comms/docs/workflow/external leaves together.
 *
 * @type {object[]}
 */
export const leafIntegrations = [
	leaf({ id: 'calendar', label: t('nextcloud-vue', 'Meetings'), icon: 'Calendar', group: 'comms', requiredApp: 'calendar', order: 20, defaultSize: { w: 4, h: 3 } }),
	leaf({ id: 'contacts', label: t('nextcloud-vue', 'Contacts'), icon: 'AccountBox', group: 'comms', requiredApp: 'contacts', order: 21 }),
	leaf({ id: 'email', label: t('nextcloud-vue', 'Emails'), icon: 'Email', group: 'comms', requiredApp: 'mail', order: 22 }),
	leaf({ id: 'talk', label: t('nextcloud-vue', 'Chat'), icon: 'ChatOutline', group: 'comms', requiredApp: 'spreed', order: 23 }),

	leaf({ id: 'bookmarks', label: t('nextcloud-vue', 'Bookmarks'), icon: 'Bookmark', group: 'docs', requiredApp: 'bookmarks', order: 40 }),
	leaf({ id: 'collectives', label: t('nextcloud-vue', 'Knowledge'), icon: 'BookOpenPageVariant', group: 'docs', requiredApp: 'collectives', order: 41 }),
	leaf({ id: 'maps', label: t('nextcloud-vue', 'Location'), icon: 'MapMarker', group: 'docs', requiredApp: 'maps', order: 42, defaultSize: { w: 4, h: 3 } }),
	leaf({ id: 'photos', label: t('nextcloud-vue', 'Photos'), icon: 'Image', group: 'docs', requiredApp: 'photos', order: 43 }),

	leaf({ id: 'activity', label: t('nextcloud-vue', 'Activity'), icon: 'Timeline', group: 'workflow', requiredApp: 'activity', order: 60 }),
	leaf({ id: 'analytics', label: t('nextcloud-vue', 'Analytics'), icon: 'ChartBar', group: 'workflow', requiredApp: 'analytics', order: 61, defaultSize: { w: 4, h: 3 } }),
	leaf({ id: 'cospend', label: t('nextcloud-vue', 'Costs'), icon: 'CurrencyEur', group: 'workflow', requiredApp: 'cospend', order: 62 }),
	leaf({ id: 'deck', label: t('nextcloud-vue', 'Cards'), icon: 'ViewColumnOutline', group: 'workflow', requiredApp: 'deck', order: 63, defaultSize: { w: 4, h: 3 } }),
	leaf({ id: 'flow', label: t('nextcloud-vue', 'Automation'), icon: 'RobotOutline', group: 'workflow', requiredApp: 'workflowengine', order: 64 }),
	leaf({ id: 'forms', label: t('nextcloud-vue', 'Forms'), icon: 'ClipboardText', group: 'workflow', requiredApp: 'forms', order: 65 }),
	leaf({ id: 'polls', label: t('nextcloud-vue', 'Polls'), icon: 'Poll', group: 'workflow', requiredApp: 'polls', order: 66 }),
	leaf({ id: 'time-tracker', label: t('nextcloud-vue', 'Time'), icon: 'Clock', group: 'workflow', requiredApp: 'timemanager', order: 67 }),

	leaf({ id: 'shares', label: t('nextcloud-vue', 'Shares'), icon: 'Share', group: 'core', requiredApp: null, order: 10 }),

	leaf({ id: 'openproject', label: t('nextcloud-vue', 'Projects'), icon: 'Briefcase', group: 'external', requiredApp: 'openconnector', order: 31, defaultSize: { w: 4, h: 4 } }),
]

/**
 * Register every leaf integration onto a registry. Existing ids win
 * (collision policy: first wins) — so a consuming app's pre-registered
 * override or another already-registered built-in stays as-is.
 *
 * @param {object} [registry] Registry instance (default: the singleton).
 *
 * @return {string[]} The ids that were newly registered.
 */
export function registerLeafIntegrations(registry) {
	const target = registry || defaultRegistry
	const registered = []
	for (const descriptor of leafIntegrations) {
		if (target.has(descriptor.id) === true) {
			continue
		}
		const result = target.register(descriptor)
		if (result !== null) {
			registered.push(descriptor.id)
		}
	}
	return registered
}

export default leafIntegrations
