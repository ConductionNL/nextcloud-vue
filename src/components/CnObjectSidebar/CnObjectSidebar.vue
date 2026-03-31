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
				<CnFilesTab
					:object-id="objectId"
					:register="register"
					:schema="schema"
					:api-base="apiBase" />
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
				<CnNotesTab
					:object-id="objectId"
					:register="register"
					:schema="schema"
					:api-base="apiBase" />
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
				<CnTagsTab
					:object-id="objectId"
					:register="register"
					:schema="schema"
					:api-base="apiBase" />
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
				<CnTasksTab
					:object-id="objectId"
					:register="register"
					:schema="schema"
					:api-base="apiBase" />
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
				<CnAuditTrailTab
					:object-id="objectId"
					:register="register"
					:schema="schema"
					:api-base="apiBase" />
			</slot>
		</NcAppSidebarTab>

		<!-- Custom tabs slot -->
		<slot name="extra-tabs" />
	</NcAppSidebar>
</template>

<script>
import { NcAppSidebar, NcAppSidebarTab } from '@nextcloud/vue'

import Paperclip from 'vue-material-design-icons/Paperclip.vue'
import CommentTextOutline from 'vue-material-design-icons/CommentTextOutline.vue'
import TagOutline from 'vue-material-design-icons/TagOutline.vue'
import CheckboxMarkedOutline from 'vue-material-design-icons/CheckboxMarkedOutline.vue'
import History from 'vue-material-design-icons/History.vue'

import CnFilesTab from './CnFilesTab.vue'
import CnNotesTab from './CnNotesTab.vue'
import CnTagsTab from './CnTagsTab.vue'
import CnTasksTab from './CnTasksTab.vue'
import CnAuditTrailTab from './CnAuditTrailTab.vue'

/**
 * CnObjectSidebar — Right sidebar for entity detail pages.
 *
 * Provides standardized tabs for generic object functionality (Files, Notes, Tags,
 * Tasks, Audit Trail) that integrate with OpenRegister API endpoints bridging to
 * Nextcloud-native APIs. Each tab is a self-contained component.
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
		Paperclip,
		CommentTextOutline,
		TagOutline,
		CheckboxMarkedOutline,
		History,
		CnFilesTab,
		CnNotesTab,
		CnTagsTab,
		CnTasksTab,
		CnAuditTrailTab,
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
		/** OpenRegister register ID */
		register: {
			type: String,
			default: '',
		},
		/** OpenRegister schema ID */
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
		subtitle: {
			type: String,
			default: '',
		},
		/** @deprecated Use subtitle instead */
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
	},

	emits: ['update:open'],

	data() {
		return {
			activeTab: 'files',
		}
	},

	computed: {
		sidebarTitle() {
			return this.title || this.objectType || 'Details'
		},
		sidebarSubtitle() {
			return this.subtitle || this.subtitleProp || ''
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
