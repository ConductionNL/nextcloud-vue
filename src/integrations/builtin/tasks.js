/**
 * Built-in `tasks` integration registration.
 *
 * Maps the always-available CalDAV-tasks integration (PHP-side:
 * `TasksProvider`, storage strategy `link-table`, composite entity
 * ids `{calendarId}/{taskUri}`) onto the existing `CnTasksTab` sidebar
 * tab and a thin adapter around `CnTasksCard`.
 *
 * Adapter rationale: same as `notes` — `CnTasksCard` takes
 * `registerId` / `schemaId`; the adapter renames `register` /
 * `schema` so the existing card works unchanged in the registry.
 *
 * @module integrations/builtin/tasks
 */

import { translate as t } from '@nextcloud/l10n'
import { h } from 'vue'
import { lazyComponent } from '../../utils/lazyComponent.js'

const CnTasksTab = lazyComponent(() => import('../../components/CnObjectSidebar/CnTasksTab.vue'), 'CnTasksTab')
const CnTasksCard = lazyComponent(() => import('../../components/CnTasksCard/CnTasksCard.vue'), 'CnTasksCard')

/**
 * Adapter component: forwards `register` → `registerId`,
 * `schema` → `schemaId` so `CnTasksCard` slots into the registry.
 */
const CnTasksCardAdapter = {
	name: 'CnTasksCardAdapter',
	components: { CnTasksCard },
	props: {
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		objectId: { type: [String, Number], default: '' },
		apiBase: { type: String, default: '/apps/openregister/api' },
		surface: { type: String, default: 'detail-page' },
		objectType: { type: String, default: '' },
	},
	render() {
		return h(CnTasksCard, {
			registerId: this.register,
			schemaId: this.schema,
			objectId: this.objectId ? String(this.objectId) : '',
			apiBase: this.apiBase,
		})
	},
}

/**
 * `tasks` integration descriptor.
 *
 * @type {object}
 */
export const tasksIntegration = {
	id: 'tasks',
	label: t('nextcloud-vue', 'Tasks'),
	icon: 'CheckboxMarkedOutline',
	requiredApp: null,
	order: 4,
	group: 'core',
	referenceType: 'tasks',
	tab: CnTasksTab,
	widget: CnTasksCardAdapter,
	defaultSize: { w: 4, h: 3 },
}

export default tasksIntegration
