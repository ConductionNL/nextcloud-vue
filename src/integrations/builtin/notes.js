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
import { h } from 'vue'
import CnNotesCard from '../../components/CnNotesCard/CnNotesCard.vue'
import CnNotesTab from '../../components/CnObjectSidebar/CnNotesTab.vue'

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
		// Notes of something that is not an object (`{ kind: 'flow-task', id }`), or a URL of their own.
		source: { type: Object, default: null },
		endpoint: { type: String, default: '' },
		// `button` puts the add form behind an "Add note" button (card header, or above the notes tab).
		composer: { type: String, default: 'inline' },
		// Accepted-and-ignored: forwarded by the surface components.
		surface: { type: String, default: 'detail-page' },
		objectType: { type: String, default: '' },
		// A manifest that wires mentions or per-note actions gets the full
		// notes tab, which carries both; the card carries neither.
		mentionUrl: { type: String, default: '' },
		noteActions: { type: Array, default: () => [] },
	},
	render() {
		if (this.mentionUrl !== '' || this.noteActions.length > 0) {
			return h(CnNotesTab, {
				register: this.register,
				schema: this.schema,
				objectId: this.objectId ? String(this.objectId) : '',
				apiBase: this.apiBase,
				mentionUrl: this.mentionUrl,
				noteActions: this.noteActions,
				composer: this.composer,
			})
		}
		return h(CnNotesCard, {
			registerId: this.register,
			schemaId: this.schema,
			objectId: this.objectId ? String(this.objectId) : '',
			apiBase: this.apiBase,
			source: this.source,
			endpoint: this.endpoint,
			composer: this.composer,
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
	// CnNotesCard's root draws no border, background or padding, so it is
	// already bare content and belongs in a tab panel. Without this the panel
	// gets CnNotesTab, whose composer hides behind an "Add note" button.
	bareWidget: true,
	defaultSize: { w: 4, h: 3 },
}

export default notesIntegration
