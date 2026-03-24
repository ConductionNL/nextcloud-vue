<!--
  CnObjectSidebar — Right sidebar with standardized tabs for generic object functionality.

  Provides Files, Notes, Tags, Tasks, and Audit Trail tabs that integrate with
  OpenRegister API endpoints (which bridge to Nextcloud-native APIs).
  All tabs are optional and overridable via props and slots.
-->
<template>
	<NcAppSidebar
		:title="sidebarTitle"
		:subtitle="sidebarSubtitle"
		:active.sync="activeTab"
		@update:open="$emit('update:open', $event)"
		@close="$emit('update:open', false)">
		<!-- Files Tab -->
		<NcAppSidebarTab
			v-if="!isTabHidden('files')"
			id="files"
			:name="filesLabel"
			:order="1">
			<template #icon>
				<Paperclip :size="20" />
			</template>
			<slot name="tab-files" :object-id="objectId" :object-type="objectType">
				<div class="cn-sidebar-tab">
					<!-- File upload -->
					<div class="cn-sidebar-tab__action">
						<label class="cn-sidebar-tab__upload-btn">
							<NcButton type="secondary" :wide="true" :disabled="filesLoading">
								<template #icon>
									<Upload :size="20" />
								</template>
								{{ uploadLabel }}
							</NcButton>
							<input
								ref="fileInput"
								type="file"
								multiple
								class="cn-sidebar-tab__file-input"
								@change="onFileUpload">
						</label>
					</div>

					<!-- File list -->
					<NcLoadingIcon v-if="filesLoading" />
					<div v-else-if="files.length === 0" class="cn-sidebar-tab__empty">
						{{ noFilesLabel }}
					</div>
					<div v-else class="cn-sidebar-tab__list">
						<NcListItem
							v-for="file in files"
							:key="file.id"
							:name="file.name || file.title"
							:bold="false"
							:force-display-actions="true">
							<template #icon>
								<FileOutline :size="32" />
							</template>
							<template #subname>
								{{ formatFileSize(file.size) }}
							</template>
							<template #actions>
								<NcActionButton @click="openFile(file)">
									<template #icon>
										<OpenInNew :size="20" />
									</template>
									{{ openLabel }}
								</NcActionButton>
								<NcActionButton @click="deleteFile(file)">
									<template #icon>
										<Delete :size="20" />
									</template>
									{{ deleteLabel }}
								</NcActionButton>
							</template>
						</NcListItem>
					</div>
				</div>
			</slot>
		</NcAppSidebarTab>

		<!-- Notes Tab -->
		<NcAppSidebarTab
			v-if="!isTabHidden('notes')"
			id="notes"
			:name="notesLabel"
			:order="2">
			<template #icon>
				<CommentTextOutline :size="20" />
			</template>
			<slot name="tab-notes" :object-id="objectId" :object-type="objectType">
				<div class="cn-sidebar-tab">
					<!-- Add note -->
					<div class="cn-sidebar-tab__action">
						<textarea
							v-model="newNoteText"
							class="cn-sidebar-tab__textarea"
							:placeholder="addNotePlaceholder"
							rows="3" />
						<NcButton
							type="primary"
							:disabled="!newNoteText.trim() || noteSaving"
							@click="addNote">
							<template #icon>
								<Send :size="20" />
							</template>
							{{ addNoteLabel }}
						</NcButton>
					</div>

					<!-- Notes list -->
					<NcLoadingIcon v-if="notesLoading" />
					<div v-else-if="notes.length === 0" class="cn-sidebar-tab__empty">
						{{ noNotesLabel }}
					</div>
					<div v-else class="cn-sidebar-tab__list">
						<div
							v-for="note in notes"
							:key="note.id"
							class="cn-sidebar-tab__note">
							<div class="cn-sidebar-tab__note-header">
								<strong>{{ note.actorDisplayName || note.author || 'Unknown' }}</strong>
								<span class="cn-sidebar-tab__note-time">{{ formatDate(note.creationDateTime || note.created) }}</span>
							</div>
							<p class="cn-sidebar-tab__note-body">{{ note.message || note.content }}</p>
							<NcButton
								v-if="canDeleteNote(note)"
								type="tertiary"
								class="cn-sidebar-tab__note-delete"
								@click="deleteNote(note)">
								<template #icon>
									<Delete :size="16" />
								</template>
							</NcButton>
						</div>
					</div>
				</div>
			</slot>
		</NcAppSidebarTab>

		<!-- Tags Tab -->
		<NcAppSidebarTab
			v-if="!isTabHidden('tags')"
			id="tags"
			:name="tagsLabel"
			:order="3">
			<template #icon>
				<TagOutline :size="20" />
			</template>
			<slot name="tab-tags" :object-id="objectId" :object-type="objectType">
				<div class="cn-sidebar-tab">
					<!-- Add tag -->
					<div class="cn-sidebar-tab__action cn-sidebar-tab__action--row">
						<NcTextField
							v-model="newTagName"
							:label="addTagPlaceholder"
							@keyup.enter="addTag" />
						<NcButton
							type="primary"
							:disabled="!newTagName.trim() || tagSaving"
							@click="addTag">
							<template #icon>
								<Plus :size="20" />
							</template>
						</NcButton>
					</div>

					<!-- Tags list -->
					<NcLoadingIcon v-if="tagsLoading" />
					<div v-else-if="tags.length === 0" class="cn-sidebar-tab__empty">
						{{ noTagsLabel }}
					</div>
					<div v-else class="cn-sidebar-tab__tags">
						<span
							v-for="tag in tags"
							:key="tag.id || tag"
							class="cn-sidebar-tab__tag">
							{{ tag.name || tag }}
							<button
								class="cn-sidebar-tab__tag-remove"
								:aria-label="'Remove ' + (tag.name || tag)"
								@click="removeTag(tag)">
								<Close :size="14" />
							</button>
						</span>
					</div>
				</div>
			</slot>
		</NcAppSidebarTab>

		<!-- Tasks Tab -->
		<NcAppSidebarTab
			v-if="!isTabHidden('tasks')"
			id="tasks"
			:name="tasksLabel"
			:order="4">
			<template #icon>
				<CheckboxMarkedOutline :size="20" />
			</template>
			<slot name="tab-tasks" :object-id="objectId" :object-type="objectType">
				<div class="cn-sidebar-tab">
					<NcLoadingIcon v-if="tasksLoading" />
					<div v-else-if="tasks.length === 0" class="cn-sidebar-tab__empty">
						{{ noTasksLabel }}
					</div>
					<div v-else class="cn-sidebar-tab__list">
						<NcListItem
							v-for="task in tasks"
							:key="task.id"
							:name="task.title || task.name"
							:bold="false">
							<template #icon>
								<CheckboxMarkedOutline v-if="task.status === 'completed'" :size="32" class="cn-sidebar-tab__task-done" />
								<CheckboxBlankOutline v-else :size="32" />
							</template>
							<template #subname>
								{{ task.assignee || '' }}{{ task.dueDate ? ' · ' + formatDate(task.dueDate) : '' }}
							</template>
						</NcListItem>
					</div>
				</div>
			</slot>
		</NcAppSidebarTab>

		<!-- Audit Trail Tab -->
		<NcAppSidebarTab
			v-if="!isTabHidden('auditTrail')"
			id="auditTrail"
			:name="auditTrailLabel"
			:order="5">
			<template #icon>
				<History :size="20" />
			</template>
			<slot name="tab-audit-trail" :object-id="objectId" :object-type="objectType">
				<div class="cn-sidebar-tab">
					<NcLoadingIcon v-if="auditTrailLoading" />
					<div v-else-if="auditTrails.length === 0" class="cn-sidebar-tab__empty">
						{{ noAuditTrailLabel }}
					</div>
					<div v-else class="cn-sidebar-tab__list">
						<NcListItem
							v-for="entry in auditTrails"
							:key="entry.id"
							:name="formatDate(entry.created)"
							:bold="false"
							:details="entry.action"
							:counter-number="entry.changed ? Object.keys(entry.changed).length : 0">
							<template #icon>
								<History :size="32" />
							</template>
							<template #subname>
								{{ entry.userName || entry.user || 'System' }}
							</template>
						</NcListItem>
					</div>
				</div>
			</slot>
		</NcAppSidebarTab>

		<!-- Custom tabs slot -->
		<slot name="extra-tabs" />
	</NcAppSidebar>
</template>

<script>
import {
	NcAppSidebar,
	NcAppSidebarTab,
	NcButton,
	NcListItem,
	NcActionButton,
	NcLoadingIcon,
	NcTextField,
} from '@nextcloud/vue'

import Paperclip from 'vue-material-design-icons/Paperclip.vue'
import Upload from 'vue-material-design-icons/Upload.vue'
import FileOutline from 'vue-material-design-icons/FileOutline.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import CommentTextOutline from 'vue-material-design-icons/CommentTextOutline.vue'
import Send from 'vue-material-design-icons/Send.vue'
import TagOutline from 'vue-material-design-icons/TagOutline.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Close from 'vue-material-design-icons/Close.vue'
import CheckboxMarkedOutline from 'vue-material-design-icons/CheckboxMarkedOutline.vue'
import CheckboxBlankOutline from 'vue-material-design-icons/CheckboxBlankOutline.vue'
import History from 'vue-material-design-icons/History.vue'

import { buildHeaders } from '../../utils/index.js'

/**
 * CnObjectSidebar — Right sidebar for entity detail pages.
 *
 * Provides standardized tabs for generic object functionality (Files, Notes, Tags,
 * Tasks, Audit Trail) that integrate with OpenRegister API endpoints bridging to
 * Nextcloud-native APIs.
 *
 * @example Basic usage
 * <CnObjectSidebar
 *   object-type="pipelinq_lead"
 *   :object-id="leadId"
 *   :register="registerConfig.register"
 *   :schema="registerConfig.schema" />
 *
 * @example Hide specific tabs
 * <CnObjectSidebar
 *   object-type="pipelinq_lead"
 *   :object-id="leadId"
 *   :hidden-tabs="['tasks', 'tags']" />
 *
 * @example Override a tab
 * <CnObjectSidebar object-type="pipelinq_lead" :object-id="leadId">
 *   <template #tab-notes="{ objectId }">
 *     <MyCustomNotesComponent :id="objectId" />
 *   </template>
 * </CnObjectSidebar>
 */
export default {
	name: 'CnObjectSidebar',

	components: {
		NcAppSidebar,
		NcAppSidebarTab,
		NcButton,
		NcListItem,
		NcActionButton,
		NcLoadingIcon,
		NcTextField,
		Paperclip,
		Upload,
		FileOutline,
		OpenInNew,
		Delete,
		CommentTextOutline,
		Send,
		TagOutline,
		Plus,
		Close,
		CheckboxMarkedOutline,
		CheckboxBlankOutline,
		History,
	},

	props: {
		/** The entity type (e.g., "pipelinq_lead", "procest_case") */
		objectType: {
			type: String,
			required: true,
		},
		/** The object UUID */
		objectId: {
			type: String,
			required: true,
		},
		/** OpenRegister register ID (for file/audit trail operations) */
		register: {
			type: String,
			default: '',
		},
		/** OpenRegister schema ID (for file/audit trail operations) */
		schema: {
			type: String,
			default: '',
		},
		/** Array of tab IDs to hide: 'files', 'notes', 'tags', 'tasks', 'auditTrail' */
		hiddenTabs: {
			type: Array,
			default: () => [],
		},
		/** Whether the sidebar is open */
		open: {
			type: Boolean,
			default: true,
		},
		/** Sidebar title (defaults to objectType) */
		title: {
			type: String,
			default: '',
		},
		/** Sidebar subtitle */
		subtitleProp: {
			type: String,
			default: '',
		},
		/** Base API URL for OpenRegister */
		apiBase: {
			type: String,
			default: '/apps/openregister/api',
		},

		// --- Pre-translated labels ---
		filesLabel: { type: String, default: 'Files' },
		notesLabel: { type: String, default: 'Notes' },
		tagsLabel: { type: String, default: 'Tags' },
		tasksLabel: { type: String, default: 'Tasks' },
		auditTrailLabel: { type: String, default: 'Audit Trail' },
		uploadLabel: { type: String, default: 'Upload file' },
		addNoteLabel: { type: String, default: 'Add note' },
		addNotePlaceholder: { type: String, default: 'Write a note...' },
		addTagPlaceholder: { type: String, default: 'Add tag...' },
		openLabel: { type: String, default: 'Open' },
		deleteLabel: { type: String, default: 'Delete' },
		noFilesLabel: { type: String, default: 'No files attached' },
		noNotesLabel: { type: String, default: 'No notes yet' },
		noTagsLabel: { type: String, default: 'No tags' },
		noTasksLabel: { type: String, default: 'No linked tasks' },
		noAuditTrailLabel: { type: String, default: 'No audit trail entries' },
	},

	emits: ['update:open'],

	data() {
		return {
			activeTab: 'files',
			// Files
			files: [],
			filesLoading: false,
			// Notes
			notes: [],
			notesLoading: false,
			newNoteText: '',
			noteSaving: false,
			// Tags
			tags: [],
			tagsLoading: false,
			newTagName: '',
			tagSaving: false,
			// Tasks
			tasks: [],
			tasksLoading: false,
			// Audit Trail
			auditTrails: [],
			auditTrailLoading: false,
		}
	},

	computed: {
		sidebarTitle() {
			return this.title || this.objectType || 'Details'
		},
		sidebarSubtitle() {
			return this.subtitleProp || this.objectId || ''
		},
	},

	watch: {
		objectId: {
			immediate: true,
			handler(newId) {
				if (newId) {
					this.loadAllData()
				}
			},
		},
		activeTab(tab) {
			// Lazy-load tab data when switching
			this.loadTabData(tab)
		},
	},

	methods: {
		isTabHidden(tabId) {
			return this.hiddenTabs.includes(tabId)
		},

		async loadAllData() {
			// Load files (default tab) immediately, others lazily
			this.loadTabData('files')
		},

		async loadTabData(tab) {
			switch (tab) {
			case 'files':
				if (this.files.length === 0 && !this.filesLoading) this.fetchFiles()
				break
			case 'notes':
				if (this.notes.length === 0 && !this.notesLoading) this.fetchNotes()
				break
			case 'tags':
				if (this.tags.length === 0 && !this.tagsLoading) this.fetchTags()
				break
			case 'tasks':
				if (this.tasks.length === 0 && !this.tasksLoading) this.fetchTasks()
				break
			case 'auditTrail':
				if (this.auditTrails.length === 0 && !this.auditTrailLoading) this.fetchAuditTrails()
				break
			}
		},

		// --- Files ---
		async fetchFiles() {
			if (!this.register || !this.schema) return
			this.filesLoading = true
			try {
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/files`
				const response = await fetch(url, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.files = data.results || data || []
				}
			} catch (err) {
				console.error('CnObjectSidebar: Failed to fetch files', err)
			} finally {
				this.filesLoading = false
			}
		},

		async onFileUpload(event) {
			const inputFiles = event.target.files
			if (!inputFiles?.length || !this.register || !this.schema) return

			const formData = new FormData()
			for (const file of inputFiles) {
				formData.append('files[]', file)
			}

			try {
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/filesMultipart`
				await fetch(url, {
					method: 'POST',
					headers: {
						requesttoken: OC?.requestToken || '',
						'OCS-APIREQUEST': 'true',
					},
					body: formData,
				})
				await this.fetchFiles()
			} catch (err) {
				console.error('CnObjectSidebar: Failed to upload file', err)
			}

			// Reset input
			if (this.$refs.fileInput) {
				this.$refs.fileInput.value = ''
			}
		},

		openFile(file) {
			if (file.accessUrl) {
				window.open(file.accessUrl, '_blank')
			} else if (file.id) {
				const dirPath = file.path ? file.path.substring(0, file.path.lastIndexOf('/')) : ''
				const cleanPath = dirPath.replace(/^\/admin\/files\//, '/')
				window.open(`/index.php/apps/files/files/${file.id}?dir=${encodeURIComponent(cleanPath)}&openfile=true`, '_blank')
			}
		},

		async deleteFile(file) {
			if (!this.register || !this.schema) return
			try {
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/files/${file.id}`
				await fetch(url, { method: 'DELETE', headers: buildHeaders() })
				this.files = this.files.filter(f => f.id !== file.id)
			} catch (err) {
				console.error('CnObjectSidebar: Failed to delete file', err)
			}
		},

		// --- Notes (via OpenRegister → NC Comments API) ---
		async fetchNotes() {
			if (!this.register || !this.schema) return
			this.notesLoading = true
			try {
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/notes`
				const response = await fetch(url, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.notes = data.results || data || []
				}
			} catch (err) {
				console.error('CnObjectSidebar: Failed to fetch notes', err)
			} finally {
				this.notesLoading = false
			}
		},

		async addNote() {
			if (!this.newNoteText.trim()) return
			this.noteSaving = true
			try {
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/notes`
				await fetch(url, {
					method: 'POST',
					headers: buildHeaders(),
					body: JSON.stringify({ message: this.newNoteText.trim() }),
				})
				this.newNoteText = ''
				await this.fetchNotes()
			} catch (err) {
				console.error('CnObjectSidebar: Failed to add note', err)
			} finally {
				this.noteSaving = false
			}
		},

		canDeleteNote(note) {
			return note.actorId === OC?.currentUser || note.author === OC?.currentUser
		},

		async deleteNote(note) {
			try {
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/notes/${note.id}`
				await fetch(url, { method: 'DELETE', headers: buildHeaders() })
				this.notes = this.notes.filter(n => n.id !== note.id)
			} catch (err) {
				console.error('CnObjectSidebar: Failed to delete note', err)
			}
		},

		// --- Tags ---
		// Tags are managed via the object's own data (object.tags array) and patched
		// back to the object. Available tags list comes from GET /api/tags.
		async fetchTags() {
			if (!this.register || !this.schema) return
			this.tagsLoading = true
			try {
				// Fetch the object to get its current tags
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}`
				const response = await fetch(url, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.tags = data.tags || data.object?.tags || []
				}
			} catch (err) {
				console.error('CnObjectSidebar: Failed to fetch tags', err)
			} finally {
				this.tagsLoading = false
			}
		},

		async addTag() {
			if (!this.newTagName.trim() || !this.register || !this.schema) return
			this.tagSaving = true
			try {
				const newTags = [...this.tags, this.newTagName.trim()]
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}`
				await fetch(url, {
					method: 'PATCH',
					headers: buildHeaders(),
					body: JSON.stringify({ tags: newTags }),
				})
				this.newTagName = ''
				await this.fetchTags()
			} catch (err) {
				console.error('CnObjectSidebar: Failed to add tag', err)
			} finally {
				this.tagSaving = false
			}
		},

		async removeTag(tag) {
			if (!this.register || !this.schema) return
			const tagName = tag.name || tag
			try {
				const newTags = this.tags.filter(t => (t.name || t) !== tagName)
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}`
				await fetch(url, {
					method: 'PATCH',
					headers: buildHeaders(),
					body: JSON.stringify({ tags: newTags }),
				})
				this.tags = newTags
			} catch (err) {
				console.error('CnObjectSidebar: Failed to remove tag', err)
			}
		},

		// --- Tasks (via OpenRegister → CalDAV VTODO API) ---
		async fetchTasks() {
			if (!this.register || !this.schema) return
			this.tasksLoading = true
			try {
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/tasks`
				const response = await fetch(url, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.tasks = data.results || data || []
				}
			} catch (err) {
				console.error('CnObjectSidebar: Failed to fetch tasks', err)
			} finally {
				this.tasksLoading = false
			}
		},

		// --- Audit Trail ---
		async fetchAuditTrails() {
			if (!this.register || !this.schema) return
			this.auditTrailLoading = true
			try {
				const url = `${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/audit-trails`
				const response = await fetch(url, { headers: buildHeaders() })
				if (response.ok) {
					const data = await response.json()
					this.auditTrails = data.results || data || []
				}
			} catch (err) {
				console.error('CnObjectSidebar: Failed to fetch audit trails', err)
			} finally {
				this.auditTrailLoading = false
			}
		},

		// --- Helpers ---
		formatFileSize(bytes) {
			const sizes = ['Bytes', 'KB', 'MB', 'GB']
			if (!bytes || bytes === 0) return 'n/a'
			const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
			if (i === 0) return '< 1 KB'
			return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i]
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
	},
}
</script>

<style scoped>
.cn-sidebar-tab {
	padding: 12px;
}

.cn-sidebar-tab__action {
	margin-bottom: 16px;
}

.cn-sidebar-tab__action--row {
	display: flex;
	gap: 8px;
	align-items: flex-end;
}

.cn-sidebar-tab__upload-btn {
	display: block;
	cursor: pointer;
}

.cn-sidebar-tab__file-input {
	display: none;
}

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

.cn-sidebar-tab__list {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

/* Notes */
.cn-sidebar-tab__note {
	padding: 10px 12px;
	border-bottom: 1px solid var(--color-border);
	position: relative;
}

.cn-sidebar-tab__note:last-child {
	border-bottom: none;
}

.cn-sidebar-tab__note-header {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	margin-bottom: 4px;
}

.cn-sidebar-tab__note-header strong {
	font-size: 13px;
}

.cn-sidebar-tab__note-time {
	font-size: 11px;
	color: var(--color-text-maxcontrast);
}

.cn-sidebar-tab__note-body {
	font-size: 13px;
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
}

.cn-sidebar-tab__note-delete {
	position: absolute;
	top: 8px;
	right: 4px;
	opacity: 0;
	transition: opacity 0.15s ease;
}

.cn-sidebar-tab__note:hover .cn-sidebar-tab__note-delete {
	opacity: 1;
}

/* Tags */
.cn-sidebar-tab__tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding: 4px 0;
}

.cn-sidebar-tab__tag {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 3px 8px;
	border-radius: var(--border-radius-pill, 16px);
	background: var(--color-primary-element-light, rgba(0, 130, 201, 0.1));
	color: var(--color-primary-element);
	font-size: 12px;
	font-weight: 500;
}

.cn-sidebar-tab__tag-remove {
	display: flex;
	align-items: center;
	justify-content: center;
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	color: var(--color-primary-element);
	opacity: 0.6;
	border-radius: 50%;
}

.cn-sidebar-tab__tag-remove:hover {
	opacity: 1;
	background: rgba(0, 0, 0, 0.08);
}

/* Tasks */
.cn-sidebar-tab__task-done {
	color: var(--color-success);
}
</style>
