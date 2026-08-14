<template>
	<div class="cn-sidebar-tab">
		<!-- Upload error -->
		<div v-if="uploadError" class="cn-sidebar-tab__upload-error">
			{{ uploadError }}
		</div>

		<!-- Share toggle — seeds from schema config (defaultAutoShare) or
		     from the `defaultShare` prop. Hidden via `showShareToggle=false`. -->
		<NcCheckboxRadioSwitch
			v-if="showShareToggle"
			v-model="share"
			class="cn-sidebar-tab__share"
			:disabled="loading"
			type="switch">
			{{ shareLabel }}
		</NcCheckboxRadioSwitch>

		<!-- File drop zone -->
		<div
			class="cn-sidebar-tab__dropzone"
			:class="{ 'cn-sidebar-tab__dropzone--active': isDragOver }"
			@click="triggerFileInput"
			@dragover.prevent="onDragOver"
			@dragleave.prevent="onDragLeave"
			@drop.prevent="onDrop">
			<input
				ref="fileInput"
				type="file"
				multiple
				class="cn-sidebar-tab__file-input"
				@change="onFileUpload">
			<Upload :size="24" class="cn-sidebar-tab__dropzone-icon" />
			<span class="cn-sidebar-tab__dropzone-text">{{ dropZoneLabel }}</span>
		</div>

		<!-- File list -->
		<NcLoadingIcon v-if="loading" />
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
		<NcButton
			v-if="files.length < total"
			variant="tertiary"
			:wide="true"
			:disabled="loadingMore"
			class="cn-sidebar-tab__load-more"
			@click="loadMore">
			<template v-if="loadingMore" #icon>
				<NcLoadingIcon :size="20" />
			</template>
			{{ loadMoreLabel }}
		</NcButton>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcListItem, NcActionButton, NcLoadingIcon } from '@nextcloud/vue'
import Upload from 'vue-material-design-icons/Upload.vue'
import FileOutline from 'vue-material-design-icons/FileOutline.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import { buildHeaders } from '../../utils/index.js'
import { safeHref } from '../../utils/safeHref.js'

export default {
	name: 'CnFilesTab',

	components: { NcButton, NcCheckboxRadioSwitch, NcListItem, NcActionButton, NcLoadingIcon, Upload, FileOutline, OpenInNew, Delete },

	props: {
		/** ID of the object this tab belongs to */
		objectId: { type: String, required: true },
		/** OpenRegister register slug */
		register: { type: String, default: '' },
		/** JSON Schema definition for the object */
		schema: { type: String, default: '' },
		/** Base URL for the OpenRegister API */
		apiBase: { type: String, default: '/apps/openregister/api' },
		/** Text shown inside the file drop zone */
		dropZoneLabel: { type: String, default: () => t('nextcloud-vue', 'Drop files here or click to browse') },
		/** Text shown when no files are attached */
		noFilesLabel: { type: String, default: () => t('nextcloud-vue', 'No files attached') },
		/** Label for the open/view file action */
		openLabel: { type: String, default: () => t('nextcloud-vue', 'Open') },
		/** Label for the delete action */
		deleteLabel: { type: String, default: () => t('nextcloud-vue', 'Delete') },
		/** Label for the load-more button */
		loadMoreLabel: { type: String, default: () => t('nextcloud-vue', 'Load more') },
		/**
		 * Whether to render the "share uploaded files" toggle. Off by default;
		 * when false, uploads never set the share flag (no auto-publish).
		 * @type {boolean}
		 */
		showShareToggle: { type: Boolean, default: false },
		/**
		 * Initial state for the share toggle. `true`/`false` wins outright;
		 * `null` (the default) defers to the schema's
		 * `configuration.defaultAutoShare` from OpenRegister.
		 * @type {boolean|null}
		 */
		defaultShare: { type: Boolean, default: null },
		/** Label for the share toggle */
		shareLabel: { type: String, default: () => t('nextcloud-vue', 'Share uploaded files') },
	},

	data() {
		return {
			files: [],
			loading: false,
			loadingMore: false,
			isDragOver: false,
			uploadError: '',
			page: 1,
			total: 0,
			limit: 20,
			share: false,
		}
	},

	watch: {
		// Match every other CnObjectSidebar tab — a single immediate
		// `objectId` watcher drives all initial loads. Folding the
		// share-toggle seed in here avoids two concurrent GETs of
		// `schemas/{schema}` on mount (one per immediate watcher).
		objectId: {
			immediate: true,
			handler(id) {
				if (id) this.fetchFiles()
				this.applyShareDefault()
			},
		},
	},

	methods: {
		async fetchFiles(append = false) {
			if (!this.register || !this.schema) return
			if (append) { this.loadingMore = true } else { this.loading = true }
			try {
				const params = new URLSearchParams({ limit: this.limit, _page: this.page })
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/files?${params}`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					const results = data.results || data || []
					this.files = append ? [...this.files, ...results] : results
					this.total = data.total || this.files.length
				}
			} catch (err) {
				console.error('CnFilesTab: Failed to fetch files', err)
			} finally {
				this.loading = false
				this.loadingMore = false
			}
		},

		loadMore() {
			this.page++
			this.fetchFiles(true)
		},

		/**
		 * Seed the `share` toggle. The `defaultShare` prop wins when set
		 * (non-null); otherwise we look up the active schema's
		 * `configuration.defaultAutoShare` from OpenRegister and use that.
		 * Network failure or missing key → keep the safe default (false) so
		 * a hiccup never silently flips uploads to "share".
		 * @return {Promise<void>}
		 */
		async applyShareDefault() {
			if (this.defaultShare !== null && this.defaultShare !== undefined) {
				this.share = !!this.defaultShare
				return
			}
			this.share = false
			if (!this.schema) return
			try {
				const response = await fetch(
					`${this.apiBase}/schemas/${this.schema}`,
					{ headers: buildHeaders() },
				)
				if (!response.ok) return
				const data = await response.json().catch(() => null)
				if (data?.configuration?.defaultAutoShare === true) {
					this.share = true
				}
			} catch (err) {
				// Non-fatal — keep the safe default, but surface the
				// failure so a missing toggle default isn't silent.
				console.error('CnFilesTab: Failed to fetch schema default for share toggle', err)
			}
		},

		triggerFileInput() {
			this.$refs.fileInput?.click()
		},

		onDragOver() { this.isDragOver = true },
		onDragLeave() { this.isDragOver = false },

		onDrop(event) {
			this.isDragOver = false
			const droppedFiles = event.dataTransfer?.files
			if (droppedFiles?.length) this.uploadFiles(droppedFiles)
		},

		async onFileUpload(event) {
			const inputFiles = event.target.files
			if (!inputFiles?.length) return
			await this.uploadFiles(inputFiles)
			if (this.$refs.fileInput) this.$refs.fileInput.value = ''
		},

		async uploadFiles(fileList) {
			if (!fileList?.length || !this.register || !this.schema) return
			this.uploadError = ''
			const formData = new FormData()
			for (const file of fileList) {
				formData.append('files[]', file)
			}
			// Only forward the share flag when the toggle is actually visible.
			// Hiding the toggle (showShareToggle=false) means "don't auto-publish".
			if (this.showShareToggle) {
				formData.append('share', String(this.share))
			}

			this.loading = true
			try {
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/filesMultipart`,
					{
						method: 'POST',
						headers: { requesttoken: OC?.requestToken || '', 'OCS-APIREQUEST': 'true' },
						body: formData,
					},
				)
				if (!response.ok) {
					const data = await response.json().catch(() => ({}))
					this.uploadError = data.error || `Upload failed (${response.status})`
					return
				}
				await this.fetchFiles()
			} catch (err) {
				console.error('CnFilesTab: Failed to upload file', err)
				this.uploadError = 'Upload failed: could not connect to server'
			} finally {
				this.loading = false
			}
		},

		openFile(file) {
			if (file.accessUrl) {
				// Security: accessUrl originates from the OR files API and may be
				// attacker-controlled. Validate the scheme via safeHref before
				// opening (C4) — this blocks javascript: / data: payloads. Add
				// noopener,noreferrer to prevent the opened tab from accessing
				// window.opener (reverse-tabnabbing) and to strip the Referer header.
				const safe = safeHref(file.accessUrl)
				if (safe !== '#') {
					window.open(safe, '_blank', 'noopener,noreferrer')
				}
			} else if (file.id) {
				const dirPath = file.path ? file.path.substring(0, file.path.lastIndexOf('/')) : ''
				const cleanPath = dirPath.replace(/^\/admin\/files\//, '/')
				window.open(`/index.php/apps/files/files/${file.id}?dir=${encodeURIComponent(cleanPath)}&openfile=true`, '_blank')
			}
		},

		async deleteFile(file) {
			if (!this.register || !this.schema) return
			try {
				await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/files/${file.id}`,
					{ method: 'DELETE', headers: buildHeaders() },
				)
				this.files = this.files.filter(f => f.id !== file.id)
			} catch (err) {
				console.error('CnFilesTab: Failed to delete file', err)
			}
		},

		formatFileSize(bytes) {
			const sizes = ['Bytes', 'KB', 'MB', 'GB']
			if (!bytes || bytes === 0) return 'n/a'
			const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
			if (i === 0) return '< 1 KB'
			return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i]
		},
	},
}
</script>

<style scoped>
.cn-sidebar-tab { padding: 12px; }

.cn-sidebar-tab__upload-error {
	padding: 8px 12px;
	margin-bottom: 8px;
	border-radius: var(--border-radius, 4px);
	background-color: var(--color-error-light, rgba(229, 57, 53, 0.1));
	color: var(--color-error, #e53935);
	font-size: 13px;
}

.cn-sidebar-tab__dropzone {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 20px 12px;
	margin-bottom: 16px;
	border: 2px dashed var(--color-border);
	border-radius: var(--border-radius-large, 8px);
	cursor: pointer;
	transition: border-color 0.15s ease, background-color 0.15s ease;
}

.cn-sidebar-tab__dropzone:hover {
	border-color: var(--color-primary-element);
	background-color: var(--color-primary-element-light, rgba(0, 130, 201, 0.08));
}

.cn-sidebar-tab__dropzone--active {
	border-color: var(--color-primary-element);
	background-color: var(--color-primary-element-light, rgba(0, 130, 201, 0.12));
}

.cn-sidebar-tab__share { margin-bottom: 12px; }

.cn-sidebar-tab__dropzone-icon { color: var(--color-text-maxcontrast); }
.cn-sidebar-tab__dropzone--active .cn-sidebar-tab__dropzone-icon,
.cn-sidebar-tab__dropzone:hover .cn-sidebar-tab__dropzone-icon { color: var(--color-primary-element); }
.cn-sidebar-tab__dropzone-text { font-size: 13px; color: var(--color-text-maxcontrast); }
.cn-sidebar-tab__file-input { display: none; }

.cn-sidebar-tab__empty {
	text-align: center;
	padding: 24px 12px;
	color: var(--color-text-maxcontrast);
	font-size: 13px;
}

.cn-sidebar-tab__list { display: flex; flex-direction: column; gap: 2px; }
.cn-sidebar-tab__load-more { margin-top: 8px; }
</style>
