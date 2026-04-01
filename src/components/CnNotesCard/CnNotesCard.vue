<!--
  CnNotesCard — Inline notes card for detail pages.

  Displays up to 5 recent notes with author, content, and timestamp.
  Includes an add-note form and integrates CnUserActionMenu on author names.
  Wraps CnDetailCard for consistent styling.
-->
<template>
	<CnDetailCard :title="titleLabel" :icon="CommentTextOutline" :collapsible="collapsible">
		<div class="cn-notes-card">
			<!-- Add note input -->
			<div class="cn-notes-card__add-form">
				<textarea
					v-model="newNoteText"
					class="cn-notes-card__textarea"
					:placeholder="addNotePlaceholder"
					rows="2"
					@keydown.enter.ctrl.prevent="submitNote"
					@keydown.enter.meta.prevent="submitNote" />
				<NcButton
					type="primary"
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
							:user-id="getNoteAuthorId(note)"
							:display-name="getNoteAuthorName(note)">
							<strong class="cn-notes-card__author">{{ getNoteAuthorName(note) }}</strong>
						</CnUserActionMenu>
						<strong v-else class="cn-notes-card__author cn-notes-card__author--self">
							{{ getNoteAuthorName(note) }}
						</strong>
						<span class="cn-notes-card__time">{{ formatDate(note.creationDateTime || note.created) }}</span>
					</div>
					<p class="cn-notes-card__body">
						{{ note.message || note.content }}
					</p>
					<NcButton
						v-if="canDeleteNote(note)"
						type="tertiary-no-background"
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
import { NcButton, NcLoadingIcon } from '@nextcloud/vue'
import CommentTextOutline from 'vue-material-design-icons/CommentTextOutline.vue'
import Send from 'vue-material-design-icons/Send.vue'
import Delete from 'vue-material-design-icons/Delete.vue'

import CnDetailCard from '../CnDetailCard/CnDetailCard.vue'
import CnUserActionMenu from '../CnUserActionMenu/CnUserActionMenu.vue'
import { buildHeaders } from '../../utils/index.js'

/**
 * CnNotesCard — Inline notes widget for detail pages.
 *
 * Shows up to 5 recent notes with add/delete functionality.
 * Integrates CnUserActionMenu on author names for quick communication.
 *
 * @example Basic usage
 * <CnNotesCard
 *   register-id="uuid-register"
 *   schema-id="uuid-schema"
 *   object-id="uuid-object" />
 *
 * @example With sidebar sync
 * <CnNotesCard
 *   register-id="reg"
 *   schema-id="schema"
 *   object-id="obj"
 *   note-added="refreshNotes"
 *   note-deleted="refreshNotes"
 *   show-all="openSidebarNotesTab" />
 */
export default {
	name: 'CnNotesCard',

	components: {
		CnDetailCard,
		CnUserActionMenu,
		NcButton,
		NcLoadingIcon,
		Send,
		Delete,
	},

	props: {
		/** OpenRegister register ID */
		registerId: {
			type: String,
			required: true,
		},
		/** OpenRegister schema ID */
		schemaId: {
			type: String,
			required: true,
		},
		/** Object UUID */
		objectId: {
			type: String,
			required: true,
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

		// --- Pre-translated labels ---
		titleLabel: { type: String, default: 'Notes' },
		addNoteLabel: { type: String, default: 'Add note' },
		addNotePlaceholder: { type: String, default: 'Write a note...' },
		noNotesLabel: { type: String, default: 'No notes yet' },
		showAllLabel: { type: String, default: 'Show all' },
		deleteLabel: { type: String, default: 'Delete note' },
	},

	emits: ['note-added', 'note-deleted', 'show-all'],

	data() {
		return {
			CommentTextOutline,
			allNotes: [],
			loading: false,
			newNoteText: '',
			noteSaving: false,
			deleteConfirmId: null,
		}
	},

	computed: {
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
		getNoteAuthorId(note) {
			return note.actorId || note.author || ''
		},

		getNoteAuthorName(note) {
			return note.actorDisplayName || note.author || 'Unknown'
		},

		isCurrentUser(note) {
			const authorId = this.getNoteAuthorId(note)
			// eslint-disable-next-line @nextcloud/no-deprecations
			const currentUser = typeof OC !== 'undefined' ? OC?.currentUser : null
			return authorId === currentUser
		},

		canDeleteNote(note) {
			return this.isCurrentUser(note)
		},

		async fetchNotes() {
			if (!this.registerId || !this.schemaId || !this.objectId) return
			this.loading = true
			try {
				const url = `${this.apiBase}/objects/${this.registerId}/${this.schemaId}/${this.objectId}/notes`
				const response = await fetch(url, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.allNotes = data.results || data || []
				}
			} catch (err) {
				console.error('CnNotesCard: Failed to fetch notes', err)
			} finally {
				this.loading = false
			}
		},

		async submitNote() {
			if (!this.newNoteText.trim() || this.noteSaving) return
			this.noteSaving = true
			try {
				const url = `${this.apiBase}/objects/${this.registerId}/${this.schemaId}/${this.objectId}/notes`
				const response = await fetch(url, {
					method: 'POST',
					headers: buildHeaders(),
					body: JSON.stringify({ message: this.newNoteText.trim() }),
				})
				if (response.ok) {
					this.newNoteText = ''
					await this.fetchNotes()
					this.$emit('note-added')
				} else {
					this.showError('Failed to add note')
				}
			} catch (err) {
				console.error('CnNotesCard: Failed to add note', err)
				this.showError('Failed to add note')
			} finally {
				this.noteSaving = false
			}
		},

		async confirmDelete(note) {
			// Simple inline confirmation — delete directly
			try {
				const url = `${this.apiBase}/objects/${this.registerId}/${this.schemaId}/${this.objectId}/notes/${note.id}`
				const response = await fetch(url, {
					method: 'DELETE',
					headers: buildHeaders(),
				})
				if (response.ok) {
					this.allNotes = this.allNotes.filter(n => n.id !== note.id)
					this.$emit('note-deleted')
				}
			} catch (err) {
				console.error('CnNotesCard: Failed to delete note', err)
			}
		},

		formatDate(dateStr) {
			if (!dateStr) return ''
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
				// eslint-disable-next-line n/no-missing-import
				import('@nextcloud/dialogs').then(({ showError }) => {
					showError(message)
				})
			} catch {
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
	word-break: break-word;
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
