<template>
	<div class="cn-sidebar-tab">
		<!-- Upload error -->
		<div v-if="uploadError" class="cn-sidebar-tab__upload-error">
			{{ uploadError }}
		</div>

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
	</div>
</template>

<script>
import { NcListItem, NcActionButton, NcLoadingIcon } from '@nextcloud/vue'
import Upload from 'vue-material-design-icons/Upload.vue'
import FileOutline from 'vue-material-design-icons/FileOutline.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import { buildHeaders } from '../../utils/index.js'

export default {
	name: 'CnFilesTab',

	components: { NcListItem, NcActionButton, NcLoadingIcon, Upload, FileOutline, OpenInNew, Delete },

	props: {
		objectId: { type: String, required: true },
		register: { type: String, default: '' },
		schema: { type: String, default: '' },
		apiBase: { type: String, default: '/apps/openregister/api' },
		dropZoneLabel: { type: String, default: 'Drop files here or click to browse' },
		noFilesLabel: { type: String, default: 'No files attached' },
		openLabel: { type: String, default: 'Open' },
		deleteLabel: { type: String, default: 'Delete' },
	},

	data() {
		return {
			files: [],
			loading: false,
			isDragOver: false,
			uploadError: '',
		}
	},

	watch: {
		objectId: {
			immediate: true,
			handler(id) { if (id) this.fetchFiles() },
		},
	},

	methods: {
		async fetchFiles() {
			if (!this.register || !this.schema) return
			this.loading = true
			try {
				const response = await fetch(
					`${this.apiBase}/objects/${this.register}/${this.schema}/${this.objectId}/files`,
					{ headers: buildHeaders() },
				)
				if (response.ok) {
					const data = await response.json()
					this.files = data.results || data || []
				}
			} catch (err) {
				console.error('CnFilesTab: Failed to fetch files', err)
			} finally {
				this.loading = false
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
</style>
