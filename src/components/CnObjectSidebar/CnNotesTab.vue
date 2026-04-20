<template>
	<div class="cn-sidebar-tab">
		<!-- Add / Edit note -->
		<div class="cn-sidebar-tab__action">
			<textarea
				v-model="newNoteText"
				class="cn-sidebar-tab__textarea"
				:placeholder="addNotePlaceholder"
				rows="3" />
			<div class="cn-sidebar-tab__action--row">
				<NcButton
					v-if="editingNoteId"
					type="tertiary"
					@click="cancelEdit">
					{{ cancelLabel }}
				</NcButton>
				<NcButton
					type="primary"
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
		<NcLoadingIcon v-if="loading" />
		<div v-else-if="notes.length === 0" class="cn-sidebar-tab__empty">
			{{ noNotesLabel }}
		</div>
		<div v-else class="cn-sidebar-tab__list">
			<NcListItem
				v-for="note in notes"
				:key="note.id"
				:name="note.actorDisplayName || note.author || 'Unknown'"
				:bold="false"
				:force-display-actions="true">
				<template #icon>
					<CommentTextOutline :size="32" />
				</template>
				<template #subname>
					{{ note.message || note.content }}
				</template>
				<template #details>
					{{ formatDate(note.creationDateTime || note.created) }}
				</template>
				<template v-if="canDelete(note)" #actions>
					<NcActionButton @click="startEdit(note)">
						<template #icon>
							<Pencil :size="20" />
						</template>
						{{ editLabel }}
					</NcActionButton>
					<NcActionButton @click="deleteNote(note)">
						<template #icon>
							<Delete :size="20" />
						</template>
						{{ deleteLabel }}
					</NcActionButton>
				</template>
			</NcListItem>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcListItem, NcActionButton, NcLoadingIcon } from '@nextcloud/vue'
import CommentTextOutline from 'vue-material-design-icons/CommentTextOutline.vue'
import Send from 'vue-material-design-icons/Send.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnNotesTab',

	components: { NcButton, NcListItem, NcActionButton, NcLoadingIcon, CommentTextOutline, Send, Pencil, Delete },

	props: {
		objectId: { type: String, required: true },
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		apiBase: { type: String, default: '/apps/openregister/api' },
		addNoteLabel: { type: String, default: () => t('nextcloud-vue', 'Add note') },
		addNotePlaceholder: { type: String, default: () => t('nextcloud-vue', 'Write a note...') },
		editLabel: { type: String, default: () => t('nextcloud-vue', 'Edit') },
		saveLabel: { type: String, default: () => t('nextcloud-vue', 'Save') },
		cancelLabel: { type: String, default: () => t('nextcloud-vue', 'Cancel') },
		deleteLabel: { type: String, default: () => t('nextcloud-vue', 'Delete') },
		noNotesLabel: { type: String, default: () => t('nextcloud-vue', 'No notes yet') },
	},

	data() {
		return {
			notes: [],
			loading: false,
			newNoteText: '',
			saving: false,
			editingNoteId: null,
		}
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) { if (id) this.fetchNotes() },
		},
	},

	methods: {
		async fetchNotes() {
			if (!this.register || !this.schema) return
			this.loading = true
			try {
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/notes`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					this.notes = data.results || data || []
				}
			} catch (err) {
				console.error('CnNotesTab: Failed to fetch notes', err)
			} finally {
				this.loading = false
			}
		},

		async addNote() {
			if (!this.newNoteText.trim()) return
			this.saving = true
			try {
				await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/notes`,
					{
						method: 'POST',
						headers: buildHeaders(),
						body: JSON.stringify({ message: this.newNoteText.trim() }),
					},
				)
				this.newNoteText = ''
				await this.fetchNotes()
			} catch (err) {
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
			if (!this.newNoteText.trim() || !this.editingNoteId) return
			this.saving = true
			try {
				await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/notes/${this.editingNoteId}`,
					{
						method: 'PUT',
						headers: buildHeaders(),
						body: JSON.stringify({ message: this.newNoteText.trim() }),
					},
				)
				this.editingNoteId = null
				this.newNoteText = ''
				await this.fetchNotes()
			} catch (err) {
				console.error('CnNotesTab: Failed to update note', err)
			} finally {
				this.saving = false
			}
		},

		canDelete(note) {
			return note.actorId === OC?.currentUser || note.author === OC?.currentUser
		},

		async deleteNote(note) {
			try {
				await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/notes/${note.id}`,
					{ method: 'DELETE', headers: buildHeaders() },
				)
				this.notes = this.notes.filter(n => n.id !== note.id)
			} catch (err) {
				console.error('CnNotesTab: Failed to delete note', err)
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
			} catch { return dateStr }
		},
	},
}
</script>

<style scoped>
.cn-sidebar-tab { padding: 12px; }
.cn-sidebar-tab__action { margin-bottom: 16px; }
.cn-sidebar-tab__action--row { display: flex; gap: 8px; align-items: flex-end; }

.cn-sidebar-tab__textarea {
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
}

.cn-sidebar-tab__textarea:focus {
	border-color: var(--color-primary-element);
	outline: none;
}

.cn-sidebar-tab__empty {
	text-align: center;
	padding: 24px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-sidebar-tab__list { display: flex; flex-direction: column; gap: 2px; }
</style>
