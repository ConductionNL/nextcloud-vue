<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-sidebar-tab">
		<!-- Add / Edit note -->
		<div class="cn-sidebar-tab__action">
			<NcRichContenteditable
				class="cn-sidebar-tab__composer"
				:modelValue="newNoteText"
				:autoComplete="fetchMentionSuggestions"
				:placeholder="addNotePlaceholder"
				multiline
				@update:modelValue="newNoteText = $event" />
			<div class="cn-sidebar-tab__action--row">
				<NcButton
					v-if="editingNoteId"
					variant="tertiary"
					@click="cancelEdit">
					{{ cancelLabel }}
				</NcButton>
				<NcButton
					variant="primary"
					:disabled="!newNoteText.trim() || saving"
					@click="editingNoteId ? saveEdit() : addNote()">
					<template #icon>
						<Send :size="20" />
					</template>
					{{ editingNoteId ? saveLabel : addNoteLabel }}
				</NcButton>
			</div>
		</div>

		<!-- Notes list -->
		<!-- Standalone spinner: give it an accessible name so screen readers
		     announce the loading state (WCAG 1.1.1 / 4.1.2 — a bare
		     NcLoadingIcon renders an unlabelled role="img"). -->
		<NcLoadingIcon v-if="loading" :name="loadingLabel" />
		<div v-else-if="notes.length === 0" class="cn-sidebar-tab__empty">
			{{ noNotesLabel }}
		</div>
		<!-- <ul>, not <div>: NcListItem renders an <li>, which WCAG 1.3.1
		     requires to be contained in a <ul>/<ol> (axe "listitem"). -->
		<ul v-else class="cn-sidebar-tab__list">
			<NcListItem
				v-for="note in notes"
				:key="note.id"
				:name="note.actorDisplayName || note.author || 'Unknown'"
				:bold="false"
				:forceDisplayActions="true">
				<template #icon>
					<CommentTextOutline :size="32" />
				</template>
				<template #subname>
					<span class="cn-sidebar-tab__message">
						<template v-for="(segment, index) in noteSegments(note)">
							<span
								v-if="segment.type === 'mention'"
								:key="`m-${note.id}-${index}`"
								class="cn-notes-tab__mention"
								:class="{ 'cn-notes-tab__mention--unknown': isUnknownMention(segment.id) }">{{ mentionDisplayName(segment.id) }}</span>
							<template v-else>{{ segment.value }}</template>
						</template>
					</span>
				</template>
				<template #details>
					{{ formatDate(note.creationDateTime || note.created) }}
					<!-- An edited note says so where its time is, because that
					     is where a reader already looks to date what they are
					     reading. The line names the editor, so nobody has to
					     open the history to learn who changed it. -->
					<span
						v-if="wasEdited(note)"
						class="cn-notes-tab__edited"
						data-testid="cn-note-edited">{{ editedLine(note) }}</span>
				</template>
				<template v-if="canDelete(note) || wasEdited(note) || noteActions.length > 0" #actions>
					<NcActionButton v-if="canDelete(note)" @click="startEdit(note)">
						<template #icon>
							<Pencil :size="20" />
						</template>
						{{ editLabel }}
					</NcActionButton>
					<NcActionButton
						v-if="wasEdited(note)"
						data-testid="cn-note-history-action"
						@click="openHistory(note)">
						<template #icon>
							<HistoryIcon :size="20" />
						</template>
						{{ historyLabel }}
					</NcActionButton>
					<NcActionButton v-if="canDelete(note)" @click="deleteNote(note)">
						<template #icon>
							<Delete :size="20" />
						</template>
						{{ deleteLabel }}
					</NcActionButton>
					<!-- The consuming app's own per-note actions, after the
					     library's. They render inside this NcActions and emit
					     `note-action`; nothing about what they DO lives here. -->
					<NcActionButton
						v-for="action in noteActions"
						:key="`${note.id}-${action.id}`"
						:data-testid="`cn-note-action-${action.id}`"
						@click="$emit('note-action', { action: action.id, note })">
						<template v-if="action.icon" #icon>
							<component :is="action.icon" :size="20" />
						</template>
						{{ action.label }}
					</NcActionButton>
				</template>
			</NcListItem>
		</ul>

		<CnNoteHistoryDialog
			v-if="historyNoteId"
			:open="true"
			:noteId="historyNoteId"
			:objectId="objectId"
			:register="register"
			:schema="schema"
			:apiBase="apiBase"
			@update:open="historyNoteId = null" />
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcActionButton, NcButton, NcListItem, NcLoadingIcon, NcRichContenteditable } from '@nextcloud/vue'
import CommentTextOutline from 'vue-material-design-icons/CommentTextOutline.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import HistoryIcon from 'vue-material-design-icons/History.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Send from 'vue-material-design-icons/Send.vue'
import CnNoteHistoryDialog from '../../dialogs/CnNoteHistoryDialog.vue'
import { buildHeaders, prefixUrl } from '../../utils/index.js'
import { extractMentionedIds, parseMentions } from '../../utils/mentions.js'
import { searchNextcloudUsers } from '../../utils/userAutocomplete.js'

export default {
	name: 'CnNotesTab',

	components: { NcButton, NcListItem, NcActionButton, NcLoadingIcon, NcRichContenteditable, CnNoteHistoryDialog, CommentTextOutline, Send, Pencil, Delete, HistoryIcon },

	props: {
		/** ID of the object this tab belongs to */
		objectId: { type: String, required: true },
		/** OpenRegister register slug */
		register: { type: String, default: '' },
		/** JSON Schema definition for the object */
		schema: { type: String, default: '' },
		/** Base URL for the OpenRegister API */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Label for the add note button */
		addNoteLabel: { type: String, default: () => t('nextcloud-vue', 'Add note') },
		/** Placeholder text for the note input field */
		addNotePlaceholder: { type: String, default: () => t('nextcloud-vue', 'Write a note…') },
		/** Label for the edit action */
		editLabel: { type: String, default: () => t('nextcloud-vue', 'Edit') },
		/** Label for the save action */
		saveLabel: { type: String, default: () => t('nextcloud-vue', 'Save') },
		/** Label for the cancel button */
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		/** Label for the delete action */
		deleteLabel: { type: String, default: () => t('nextcloud-vue', 'Delete') },
		/** Text shown when there are no notes */
		noNotesLabel: { type: String, default: () => t('nextcloud-vue', 'No notes yet') },
		/** Text shown while the notes are being fetched */
		loadingLabel: { type: String, default: () => t('nextcloud-vue', 'Loading notes…') },
		/** Label for the action that opens a note's earlier versions */
		historyLabel: { type: String, default: () => t('nextcloud-vue', 'Show earlier versions') },
		// WHY THIS PROP EXISTS, since a seam nobody asked for is the kind that
		// rots. An app-specific act on ONE note had nowhere to live: this
		// component rendered edit, history and delete and offered no fourth
		// place. Dossiq sends a single case note to a neighbouring ZGW
		// register, and its endpoint, guard, route and tests were all in place
		// while no page could call any of them. Its own change wrote that down
		// as a blocker rather than declaring a prop nothing read.
		//
		// `label` stays the app's to write and translate, so nc-vue phrases
		// nothing for somebody else's domain and adds no catalogue string here.
		/**
		 * Per-note actions the consuming app owns, `[{ id, label, icon? }]`.
		 * Each entry renders one NcActionButton in every note's action menu,
		 * after the library's own, and clicking it emits `note-action`. Empty
		 * by default, and an empty list changes nothing. `icon` is optional
		 * and takes an icon component.
		 */
		noteActions: {
			type: Array,
			default: () => [],
			validator: (actions) => actions.every((action) => action
				&& typeof action.id === 'string' && action.id !== ''
				&& typeof action.label === 'string' && action.label !== ''),
		},
	},

	emits: [
		/**
		 * Emitted after a note containing at least one `@mention` was
		 * successfully created or edited, with payload
		 * `{ objectId, register, schema, noteId, mentionedUserIds }`.
		 * nc-vue never dispatches server-side notifications itself —
		 * consuming apps listen to this event and notify from their own
		 * backend.
		 */
		'mention',
		/**
		 * Emitted when one of the consuming app's `noteActions` is clicked,
		 * with payload `{ action, note }`: the entry's `id` and the whole note
		 * as the backend answered it. The library does the rendering and
		 * nothing else, so what the action means stays in the app.
		 */
		'note-action',
	],

	data() {
		return {
			notes: [],
			loading: false,
			newNoteText: '',
			saving: false,
			editingNoteId: null,
			/** The note whose earlier versions are open, or null. */
			historyNoteId: null,
			/**
			 * Per-instance cache of mentioned-user display names, keyed by
			 * user id. `null` marks an id that could not be resolved (unknown
			 * or deleted user) so it is only looked up once.
			 */
			mentionNames: {},
		}
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) {
				if (id) {
					this.fetchNotes()
				}
			},
		},
	},

	methods: {
		async fetchNotes() {
			if (!this.register || !this.schema) {
				return
			}
			this.loading = true
			try {
				const response = await fetch(
					prefixUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/notes`),
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					this.notes = data.results || data || []
					this.resolveMentionNames()
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('CnNotesTab: Failed to fetch notes', err)
			} finally {
				this.loading = false
			}
		},

		/**
		 * Supply `@mention` suggestions to NcRichContenteditable's Tribute
		 * integration. Results come from the core autocomplete OCS endpoint
		 * via `searchNextcloudUsers` (fail-soft: errors resolve to []).
		 *
		 * @param {string} search The partial id/name typed after `@`.
		 * @param {(suggestions: Array<object>) => void} callback Receives the suggestion array.
		 */
		async fetchMentionSuggestions(search, callback) {
			const users = await searchNextcloudUsers(search)
			callback(users.map((user) => ({
				id: user.id,
				label: user.label,
				subline: user.subline,
				icon: 'icon-user',
				source: 'users',
			})))
		},

		/**
		 * Parse a note's message into text/mention segments for rendering.
		 *
		 * @param {object} note The note object from the backend.
		 * @return {Array<object>} Segments from `parseMentions`.
		 */
		noteSegments(note) {
			const message = note.message || note.content || ''
			return parseMentions(message)
		},

		/**
		 * Resolve display names for every mentioned id across the current
		 * notes list. Each id is looked up at most once per component
		 * instance; unresolvable ids are cached as `null`.
		 */
		async resolveMentionNames() {
			const ids = new Set()
			for (const note of this.notes) {
				for (const id of extractMentionedIds(note.message || note.content || '')) {
					ids.add(id)
				}
			}
			await Promise.all([...ids]
				.filter((id) => !(id in this.mentionNames))
				.map(async (id) => {
					// Mark as pending (null) first so concurrent calls skip it.
					this.mentionNames[id] = null
					const results = await searchNextcloudUsers(id)
					const match = results.find((user) => user.id === id)
					if (match) {
						this.mentionNames[id] = match.label
					}
				}))
		},

		/**
		 * Display name for a mentioned id — the resolved label, or the raw
		 * id when the user is unknown/deleted.
		 *
		 * @param {string} id The mentioned user id.
		 * @return {string} Chip text.
		 */
		mentionDisplayName(id) {
			return this.mentionNames[id] || id
		},

		/**
		 * Whether a mentioned id failed to resolve to a real user.
		 *
		 * @param {string} id The mentioned user id.
		 * @return {boolean} True when unresolved (renders the muted chip).
		 */
		isUnknownMention(id) {
			return !this.mentionNames[id]
		},

		/**
		 * Emit the `mention` notification hook for a successfully saved note.
		 *
		 * @param {string} savedText The note text that was persisted.
		 * @param {string|null} noteId The created/edited note's id.
		 */
		emitMentionEvent(savedText, noteId) {
			const mentionedUserIds = extractMentionedIds(savedText)
			if (mentionedUserIds.length === 0) {
				return
			}
			this.$emit('mention', {
				objectId: this.objectId,
				register: this.register,
				schema: this.schema,
				noteId,
				mentionedUserIds,
			})
		},

		async addNote() {
			if (!this.newNoteText.trim()) {
				return
			}
			this.saving = true
			const savedText = this.newNoteText.trim()
			try {
				const response = await fetch(
					prefixUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/notes`),
					{
						method: 'POST',
						headers: buildHeaders(),
						body: JSON.stringify({ message: savedText }),
					},
				)
				let noteId = null
				try {
					const created = await response.json()
					noteId = (created && (created.id || (created.results && created.results.id))) || null
				} catch {
					// Body not JSON — the event still fires with noteId null.
				}
				this.emitMentionEvent(savedText, noteId)
				this.newNoteText = ''
				await this.fetchNotes()
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('CnNotesTab: Failed to add note', err)
			} finally {
				this.saving = false
			}
		},

		startEdit(note) {
			this.editingNoteId = note.id
			this.newNoteText = note.message || note.content || ''
		},

		cancelEdit() {
			this.editingNoteId = null
			this.newNoteText = ''
		},

		async saveEdit() {
			if (!this.newNoteText.trim() || !this.editingNoteId) {
				return
			}
			this.saving = true
			const savedText = this.newNoteText.trim()
			const noteId = this.editingNoteId
			try {
				await fetch(
					prefixUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/notes/${noteId}`),
					{
						method: 'PUT',
						headers: buildHeaders(),
						body: JSON.stringify({ message: savedText }),
					},
				)
				this.emitMentionEvent(savedText, noteId)
				this.editingNoteId = null
				this.newNoteText = ''
				await this.fetchNotes()
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('CnNotesTab: Failed to update note', err)
			} finally {
				this.saving = false
			}
		},

		canDelete(note) {
			return note.actorId === OC?.currentUser || note.author === OC?.currentUser
		},

		/**
		 * Whether this note carries a history to show.
		 *
		 * Read off `versionCount` rather than off `editedAt`: a note edited by
		 * a since-deleted account still has its prior texts, and a marker that
		 * depended on the editor still existing would quietly vanish.
		 *
		 * @param {object} note The note from the backend.
		 * @return {boolean} True when at least one earlier version exists.
		 */
		wasEdited(note) {
			return Number(note.versionCount || 0) > 0
		},

		/**
		 * The "edited" line beside a note's time.
		 *
		 * @param {object} note The note from the backend.
		 * @return {string} The rendered line.
		 */
		editedLine(note) {
			const editor = note.editedByDisplayName || note.editedBy
			if (!editor) {
				return t('nextcloud-vue', 'Edited')
			}
			return t('nextcloud-vue', 'Edited by {editor}', { editor })
		},

		/**
		 * Open the earlier versions of one note.
		 *
		 * @param {object} note The note to open.
		 */
		openHistory(note) {
			this.historyNoteId = note.id
		},

		async deleteNote(note) {
			try {
				await fetch(
					prefixUrl(`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/notes/${note.id}`),
					{ method: 'DELETE', headers: buildHeaders() },
				)
				this.notes = this.notes.filter((n) => n.id !== note.id)
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error('CnNotesTab: Failed to delete note', err)
			}
		},

		formatDate(dateStr) {
			if (!dateStr) {
				return ''
			}
			try {
				return new Date(dateStr).toLocaleString(undefined, {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
				})
			} catch {
				return dateStr
			}
		},
	},
}
</script>

<style scoped>
.cn-sidebar-tab { padding: 12px; }

.cn-sidebar-tab__action { margin-bottom: 16px; }

.cn-sidebar-tab__action--row { display: flex; gap: 8px; align-items: flex-end; margin-top: 8px; }

.cn-sidebar-tab__composer {
	width: 100%;
}

.cn-sidebar-tab__empty {
	text-align: center;
	padding: 24px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-sidebar-tab__list { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }

.cn-notes-tab__mention {
	display: inline-block;
	padding: 0 6px;
	border-radius: var(--border-radius-pill, 100px);
	background-color: var(--color-primary-element-light);
	color: var(--color-main-text);
	font-weight: bold;
}

.cn-notes-tab__edited {
	color: var(--color-text-maxcontrast);
	margin-inline-start: 6px;
	font-style: italic;
}

.cn-notes-tab__mention--unknown {
	opacity: 0.6;
	font-weight: normal;
}
</style>
