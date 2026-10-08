<!--
  CnNotesCard — Inline notes card for detail pages.

  Displays up to 5 recent notes with author, content, and timestamp.
  Includes an add-note form and integrates CnUserActionMenu on author names.
  Wraps CnDetailCard for consistent styling.
-->
<template>
	<CnDetailCard :title="titleLabel"
		:icon="CommentTextOutline"
		:collapsible="collapsible"
		:chromeless="chromeless">
		<div class="cn-notes-card">
			<!-- Add note input -->
			<div v-if="!unavailable" class="cn-notes-card__add-form">
				<textarea
					v-model="newNoteText"
					class="cn-notes-card__textarea"
					:placeholder="addNotePlaceholder"
					rows="2"
					@keydown.enter.ctrl.prevent="submitNote"
					@keydown.enter.meta.prevent="submitNote" />
				<!-- Internal or public, chosen before the note is written (only when the host says the caller may set it). -->
				<NcCheckboxRadioSwitch
					v-if="visibilityToggleShown"
					:modelValue="newNoteVisibility === 'public'"
					type="switch"
					data-testid="cn-notes-card-visibility-switch"
					@update:modelValue="(on) => newNoteVisibility = on ? 'public' : 'internal'">
					{{ publicSwitchLabel }}
				</NcCheckboxRadioSwitch>
				<NcButton
					variant="primary"
					:disabled="!newNoteText.trim() || noteSaving"
					@click="submitNote">
					<template #icon>
						<Send :size="20" />
					</template>
					{{ addNoteLabel }}
				</NcButton>
			</div>

			<!-- Loading state -->
			<NcLoadingIcon v-if="loading" />

			<!-- Empty state -->
			<div v-else-if="unavailable" class="cn-notes-card__empty" data-testid="cn-notes-card-unavailable">
				{{ unavailableLabel }}
			</div>
			<div v-else-if="allNotes.length === 0" class="cn-notes-card__empty">
				{{ noNotesLabel }}
			</div>

			<!-- Notes list (last 5) -->
			<div v-else class="cn-notes-card__list">
				<div
					v-for="note in displayedNotes"
					:key="note.id"
					class="cn-notes-card__note">
					<div class="cn-notes-card__note-header">
						<CnUserActionMenu
							v-if="!isCurrentUser(note)"
							:userId="getNoteAuthorId(note)"
							:displayName="getNoteAuthorName(note)">
							<strong class="cn-notes-card__author">{{ getNoteAuthorName(note) }}</strong>
						</CnUserActionMenu>
						<strong v-else class="cn-notes-card__author cn-notes-card__author--self">
							{{ getNoteAuthorName(note) }}
						</strong>
						<span class="cn-notes-card__time">{{ formatDate(note.creationDateTime || note.created) }}</span>
					</div>
					<div v-if="visibilityShown" class="cn-notes-card__visibility">
						<CnVisibilityChip :visibility="note.visibility" />
						<NcButton
							v-if="visibilityToggleShown"
							variant="tertiary"
							size="small"
							data-testid="cn-notes-card-visibility-toggle"
							@click="toggleVisibility(note)">
							{{ noteVisibility(note) === 'public' ? makeInternalLabel : makePublicLabel }}
						</NcButton>
					</div>
					<p class="cn-notes-card__body">
						{{ note.message || note.content }}
					</p>
					<NcButton
						v-if="canDeleteNote(note)"
						variant="tertiary-no-background"
						class="cn-notes-card__delete-btn"
						:aria-label="deleteLabel"
						@click="confirmDelete(note)">
						<template #icon>
							<Delete :size="16" />
						</template>
					</NcButton>
				</div>
			</div>
		</div>

		<!-- Footer: "Show all" link -->
		<template v-if="allNotes.length > maxDisplay" #footer>
			<button
				class="cn-notes-card__show-all"
				@click="$emit('show-all')">
				{{ showAllLabel }} ({{ allNotes.length }})
			</button>
		</template>
	</CnDetailCard>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon } from '@nextcloud/vue'
import { markRaw } from 'vue'
import CommentTextOutline from 'vue-material-design-icons/CommentTextOutline.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import Send from 'vue-material-design-icons/Send.vue'
import CnDetailCard from '../CnDetailCard/CnDetailCard.vue'
import CnUserActionMenu from '../CnUserActionMenu/CnUserActionMenu.vue'
import CnVisibilityChip from '../CnVisibilityChip/CnVisibilityChip.vue'
import { useFileComments } from '../../composables/useFileComments.js'
import { buildHeaders, prefixUrl } from '../../utils/index.js'

/**
 * CnNotesCard — Inline notes widget for detail pages.
 *
 * Shows up to 5 recent notes with add/delete functionality.
 * Integrates CnUserActionMenu on author names for quick communication.
 *
 * Basic usage
 * ```vue
 * <CnNotesCard
 *   register-id="uuid-register"
 *   schema-id="uuid-schema"
 *   object-id="uuid-object" />
 * ```
 *
 * With sidebar sync
 * ```vue
 * <CnNotesCard
 *   register-id="reg"
 *   schema-id="schema"
 *   object-id="obj"
 *   @note-added="refreshNotes"
 *   @note-deleted="refreshNotes"
 *   @show-all="openSidebarNotesTab" />
 * ```
 *
 * @event note-added Emitted after a new note is successfully persisted. Payload: the created note object.
 * @event note-deleted Emitted after a note is successfully deleted. Payload: the deleted note ID.
 * @event visibility-changed Emitted after a note's visibility was changed. Payload: `{ id, visibility }`.
 * @event show-all Emitted when the user clicks the "Show all" button — parents typically open a full notes sidebar tab.
 */
export default {
	name: 'CnNotesCard',

	components: {
		CnDetailCard,
		CnUserActionMenu,
		CnVisibilityChip,
		NcButton,
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
		Send,
		Delete,
	},

	props: {
		/** OpenRegister register ID */
		registerId: {
			type: String,
			default: '',
		},

		/** OpenRegister schema ID */
		schemaId: {
			type: String,
			default: '',
		},

		/** Object UUID */
		objectId: {
			type: String,
			default: '',
		},

		/**
		 * Show the notes of a plain Nextcloud file instead of an OpenRegister
		 * object: the file's id. Used when no `objectId` is given; the notes
		 * are the file's comments (`/remote.php/dav/comments/files/{fileId}`),
		 * the same ones the Files sidebar shows.
		 */
		fileId: {
			type: [String, Number],
			default: null,
		},

		/** Base API URL for OpenRegister */
		apiBase: {
			type: String,
			default: '/apps/openregister/api',
		},

		/** Maximum number of notes to display */
		maxDisplay: {
			type: Number,
			default: 5,
		},

		/** Whether the card is collapsible */
		collapsible: {
			type: Boolean,
			default: false,
		},

		/**
		 * Render the notes body without the surrounding CnDetailCard.
		 *
		 * Set when a surface already supplies the card and the title, such as a
		 * tab panel whose open tab names the panel. Leaving the card on there
		 * nests a card inside a card and shows the label twice.
		 */
		chromeless: {
			type: Boolean,
			default: false,
		},

		/**
		 * Show a chip on every note reading internal or public. A note without a
		 * value reads as internal. Off by default, so a host that passes nothing
		 * renders the card as before. Not used for a file source (file comments
		 * carry no flag).
		 */
		showVisibility: {
			type: Boolean,
			default: false,
		},

		/**
		 * Whether the caller may set visibility on this object: the answer the
		 * server gives for `update` on it. The host passes it; the card never
		 * infers it from the current user. When true the card offers the
		 * public switch in the add-note form and a toggle on each note.
		 */
		canSetVisibility: {
			type: Boolean,
			default: false,
		},

		// --- Pre-translated labels ---
		/** Card header title. */
		titleLabel: { type: String, default: () => t('nextcloud-vue', 'Notes') },
		/** Label for the submit button that creates a new note. */
		addNoteLabel: { type: String, default: () => t('nextcloud-vue', 'Add note') },
		/** Placeholder shown inside the new-note textarea before any input. */
		addNotePlaceholder: { type: String, default: () => t('nextcloud-vue', 'Write a note…') },
		/** Empty-state text shown when the object has zero notes. */
		noNotesLabel: { type: String, default: () => t('nextcloud-vue', 'No notes yet') },
		/** Label for the "Show all" button rendered when the note list is truncated. */
		showAllLabel: { type: String, default: () => t('nextcloud-vue', 'Show all') },
		/** Text shown instead of the notes when Nextcloud refuses a file's comments (no access). */
		unavailableLabel: { type: String, default: () => t('nextcloud-vue', 'Notes are not available for this file') },
		/** Label of the add-note switch that makes the note public. */
		publicSwitchLabel: { type: String, default: () => t('nextcloud-vue', 'Public (visible to the customer)') },
		/** Label of the per-note action that makes an internal note public. */
		makePublicLabel: { type: String, default: () => t('nextcloud-vue', 'Make public') },
		/** Label of the per-note action that makes a public note internal. */
		makeInternalLabel: { type: String, default: () => t('nextcloud-vue', 'Make internal') },
		/** Aria label for the per-note delete icon button. */
		deleteLabel: { type: String, default: () => t('nextcloud-vue', 'Delete note') },
	},

	emits: ['note-added', 'note-deleted', 'show-all', 'visibility-changed'],

	data() {
		return {
			CommentTextOutline: markRaw(CommentTextOutline),
			allNotes: [],
			loading: false,
			newNoteText: '',
			/** Visibility the next note is written with (only sent when the caller may set it). */
			newNoteVisibility: 'internal',
			noteSaving: false,
			deleteConfirmId: null,
			/** The file source answered 403 or 404: no notes and no add field. */
			unavailable: false,
		}
	},

	computed: {
		/** Chips are shown: the host asked for them (or lets the caller set visibility) and the notes are object notes. */
		visibilityShown() {
			return (this.showVisibility || this.canSetVisibility) && !this.isFileSource
		},

		/** The switch and the per-note toggle are offered: only when the host says the caller may set it. */
		visibilityToggleShown() {
			return this.canSetVisibility && !this.isFileSource
		},

		/** The file source applies: a file id and no object. */
		isFileSource() {
			return this.fileId !== null && this.fileId !== undefined && this.fileId !== '' && !this.objectId
		},

		displayedNotes() {
			// Reverse chronological, limited to maxDisplay
			const sorted = [...this.allNotes].sort((a, b) => {
				const dateA = new Date(a.creationDateTime || a.created || 0)
				const dateB = new Date(b.creationDateTime || b.created || 0)
				return dateB - dateA
			})
			return sorted.slice(0, this.maxDisplay)
		},
	},

	watch: {
		fileId: {
			immediate: true,
			handler() {
				if (this.isFileSource) {
					this.fetchNotes()
				}
			},
		},

		objectId: {
			immediate: true,
			handler(newId) {
				if (newId && this.registerId && this.schemaId) {
					this.fetchNotes()
				}
			},
		},
	},

	methods: {
		/**
		 * A note's visibility; an entry with no value reads as internal.
		 *
		 * @param {object} note The note.
		 * @return {'public'|'internal'} The visibility.
		 */
		noteVisibility(note) {
			return note && note.visibility === 'public' ? 'public' : 'internal'
		},

		/**
		 * The one place a note write goes out: creating a note and changing its
		 * visibility both send through here, so the value is sent from one spot.
		 *
		 * @param {'POST'|'PATCH'} method The HTTP method.
		 * @param {string} url The notes URL (with the note id for a change).
		 * @param {object} body The JSON body.
		 * @return {Promise<Response>} The response.
		 */
		writeNote(method, url, body) {
			return fetch(prefixUrl(url), { method, headers: buildHeaders(), body: JSON.stringify(body) })
		},

		/**
		 * Flip a note between internal and public.
		 *
		 * @param {object} note The note.
		 * @return {Promise<void>}
		 */
		async toggleVisibility(note) {
			if (!this.visibilityToggleShown) {
				return
			}
			const next = this.noteVisibility(note) === 'public' ? 'internal' : 'public'
			try {
				const url = `${this.apiBase}/objects/${this.registerId}/${this.schemaId}/${this.objectId}/notes/${note.id}`
				const response = await this.writeNote('PATCH', url, { visibility: next })
				if (response.ok) {
					this.allNotes = this.allNotes.map((n) => (n.id === note.id ? { ...n, visibility: next } : n))
					/** @event visibility-changed Emitted after a note's visibility was changed. Payload: `{ id, visibility }`. */
					this.$emit('visibility-changed', { id: note.id, visibility: next })
				} else {
					this.showError('Failed to change visibility')
				}
			} catch (err) {
				// eslint-disable-next-line no-console -- diagnostic for a failure this code already degrades from
				console.error('CnNotesCard: Failed to change visibility', err)
				this.showError('Failed to change visibility')
			}
		},

		getNoteAuthorId(note) {
			return note.actorId || note.author || ''
		},

		getNoteAuthorName(note) {
			return note.actorDisplayName || note.author || 'Unknown'
		},

		isCurrentUser(note) {
			const authorId = this.getNoteAuthorId(note)
			const currentUser = typeof OC !== 'undefined' ? OC?.currentUser : null
			return authorId === currentUser
		},

		canDeleteNote(note) {
			return this.isCurrentUser(note)
		},

		fileComments() {
			return useFileComments(this.fileId)
		},

		async fetchNotes() {
			if (this.isFileSource) {
				this.loading = true
				this.unavailable = false
				try {
					this.allNotes = await this.fileComments().list()
				} catch (err) {
					this.allNotes = []
					this.unavailable = err && (err.status === 403 || err.status === 404)
					if (!this.unavailable) {
						// eslint-disable-next-line no-console -- diagnostic for a failure this code already degrades from
						console.error('CnNotesCard: Failed to fetch file comments', err)
					}
				} finally {
					this.loading = false
				}
				return
			}
			if (!this.registerId || !this.schemaId || !this.objectId) {
				return
			}
			this.loading = true
			try {
				const url = `${this.apiBase}/objects/${this.registerId}/${this.schemaId}/${this.objectId}/notes`
				const response = await fetch(prefixUrl(url), { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.allNotes = data.results || data || []
				}
			} catch (err) {
				// eslint-disable-next-line no-console -- diagnostic for a failure this code already degrades from
				console.error('CnNotesCard: Failed to fetch notes', err)
			} finally {
				this.loading = false
			}
		},

		async submitNote() {
			if (!this.newNoteText.trim() || this.noteSaving) {
				return
			}
			this.noteSaving = true
			if (this.isFileSource) {
				try {
					await this.fileComments().add(this.newNoteText.trim())
					this.newNoteText = ''
					await this.fetchNotes()
					this.$emit('note-added')
				} catch (err) {
					// eslint-disable-next-line no-console -- diagnostic for a failure this code already degrades from
					console.error('CnNotesCard: Failed to add file comment', err)
					this.showError('Failed to add note')
				} finally {
					this.noteSaving = false
				}
				return
			}
			try {
				const url = `${this.apiBase}/objects/${this.registerId}/${this.schemaId}/${this.objectId}/notes`
				const body = { message: this.newNoteText.trim() }
				if (this.visibilityToggleShown) {
					body.visibility = this.newNoteVisibility
				}
				const response = await this.writeNote('POST', url, body)
				if (response.ok) {
					this.newNoteText = ''
					this.newNoteVisibility = 'internal'
					await this.fetchNotes()
					this.$emit('note-added')
				} else {
					this.showError('Failed to add note')
				}
			} catch (err) {
				// eslint-disable-next-line no-console -- diagnostic for a failure this code already degrades from
				console.error('CnNotesCard: Failed to add note', err)
				this.showError('Failed to add note')
			} finally {
				this.noteSaving = false
			}
		},

		async confirmDelete(note) {
			// Simple inline confirmation — delete directly
			if (this.isFileSource) {
				try {
					await this.fileComments().remove(note.id)
					this.allNotes = this.allNotes.filter((n) => n.id !== note.id)
					this.$emit('note-deleted')
				} catch (err) {
					// eslint-disable-next-line no-console -- diagnostic for a failure this code already degrades from
					console.error('CnNotesCard: Failed to delete file comment', err)
				}
				return
			}
			try {
				const url = `${this.apiBase}/objects/${this.registerId}/${this.schemaId}/${this.objectId}/notes/${note.id}`
				const response = await fetch(prefixUrl(url), {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					this.allNotes = this.allNotes.filter((n) => n.id !== note.id)
					this.$emit('note-deleted')
				}
			} catch (err) {
				// eslint-disable-next-line no-console -- diagnostic for a failure this code already degrades from
				console.error('CnNotesCard: Failed to delete note', err)
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

		showError(message) {
			try {
				import('@nextcloud/dialogs').then(({ showError }) => {
					showError(message)
				})
			} catch {
				// eslint-disable-next-line no-console -- diagnostic for a failure this code already degrades from
				console.error(message)
			}
		},
	},
}
</script>

<style scoped>
.cn-notes-card__add-form {
	margin-bottom: 12px;
}

.cn-notes-card__textarea {
	width: 100%;
	padding: 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	resize: vertical;
	font-family: inherit;
	font-size: 13px;
	margin-bottom: 8px;
	background: var(--color-main-background);
	color: var(--color-main-text);
	box-sizing: border-box;
}

.cn-notes-card__textarea:focus {
	border-color: var(--color-primary-element);
	outline: none;
}

.cn-notes-card__empty {
	text-align: center;
	padding: 16px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-notes-card__list {
	display: flex;
	flex-direction: column;
}

.cn-notes-card__note {
	padding: 10px 0;
	border-bottom: 1px solid var(--color-border);
	position: relative;
}

.cn-notes-card__note:last-child {
	border-bottom: none;
}

.cn-notes-card__note-header {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	margin-bottom: 4px;
}

.cn-notes-card__author {
	font-size: 13px;
}

.cn-notes-card__author--self {
	color: var(--color-main-text);
}

.cn-notes-card__visibility {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 4px;
}

.cn-notes-card__time {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
	flex-shrink: 0;
	margin-left: 8px;
}

.cn-notes-card__body {
	font-size: 13px;
	margin: 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	padding-right: 32px;
}

.cn-notes-card__delete-btn {
	position: absolute;
	top: 8px;
	right: -4px;
	opacity: 0;
	transition: opacity 0.15s ease;
}

.cn-notes-card__note:hover .cn-notes-card__delete-btn {
	opacity: 1;
}

.cn-notes-card__show-all {
	background: none;
	border: none;
	color: var(--color-primary-element);
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	padding: 0;
	width: 100%;
	text-align: center;
}

.cn-notes-card__show-all:hover {
	text-decoration: underline;
}
</style>
