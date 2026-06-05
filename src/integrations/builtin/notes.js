/**
 * Built-in `notes` integration registration.
 *
 * Maps the always-available notes integration (PHP-side:
 * `NotesProvider`, storage strategy `link-table`) onto the existing
 * `CnNotesTab` sidebar tab and a thin adapter around `CnNotesCard`.
 *
 * Adapter rationale: `CnNotesCard` predates the registry and takes
 * `registerId` / `schemaId` props, whereas the surface components
 * forward the OpenRegister-convention `register` / `schema`. The
 * adapter renames them so the existing card works unchanged.
 *
 * @module integrations/builtin/notes
 */

import { translate as t } from '@nextcloud/l10n'
import CnNotesTab from '../../components/CnObjectSidebar/CnNotesTab.vue'
import CnNotesCard from '../../components/CnNotesCard/CnNotesCard.vue'

/**
 * Adapter component: forwards `register` → `registerId`,
 * `schema` → `schemaId` so `CnNotesCard` slots into the registry.
 */
const CnNotesCardAdapter = {
	name: 'CnNotesCardAdapter',
	components: { CnNotesCard },
	props: {
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		objectId: { type: [String, Number], default: '' },
		apiBase: { type: String, default: '/apps/openregister/api' },
		// Accepted-and-ignored: forwarded by the surface components.
		surface: { type: String, default: 'detail-page' },
		objectType: { type: String, default: '' },
	},
	render(h) {
		return h(CnNotesCard, {
			props: {
				registerId: this.register,
				schemaId: this.schema,
				objectId: this.objectId ? String(this.objectId) : '',
				apiBase: this.apiBase,
			},
		})
	},
}

/**
 * `notes` integration descriptor.
 *
 * @type {object}
 */
export const notesIntegration = {
	id: 'notes',
	label: t('nextcloud-vue', 'Notes'),
	icon: 'CommentTextOutline',
	requiredApp: null,
	order: 2,
	group: 'core',
	referenceType: 'notes',
	tab: CnNotesTab,
	widget: CnNotesCardAdapter,
	defaultSize: { w: 4, h: 3 },
}

export default notesIntegration
