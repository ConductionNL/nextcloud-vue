<template>
	<div class="cn-file-manager" data-testid="cn-file-manager">
		<header v-if="title || description || $slots.header" class="cn-file-manager__header">
			<!-- @slot header Overrides the default title/description header. Defaults to `<h3>{{ title }}</h3>` + `<p>{{ description }}</p>`. -->
			<slot name="header">
				<h3 v-if="title" class="cn-file-manager__title">{{ title }}</h3>
				<p v-if="description" class="cn-file-manager__description">{{ description }}</p>
			</slot>
		</header>

		<!-- Drop zone — drag a file here to trigger @upload. -->
		<div v-if="!readOnly"
			class="cn-file-manager__dropzone"
			:class="{ 'cn-file-manager__dropzone--active': isDragging }"
			data-testid="cn-file-manager-dropzone"
			@dragover.prevent="onDragOver"
			@dragleave.prevent="onDragLeave"
			@drop.prevent="onDrop"
			@click="openFilePicker">
			<p>{{ dropzoneLabel }}</p>
			<small v-if="dropzoneHint">{{ dropzoneHint }}</small>
			<input ref="fileInput"
				type="file"
				:accept="accept"
				:multiple="multiple"
				class="cn-file-manager__file-input"
				@change="onFileInputChange">
		</div>

		<!-- Empty state. -->
		<p v-if="files.length === 0" class="cn-file-manager__empty">{{ emptyLabel }}</p>

		<!-- File list. -->
		<ul v-else class="cn-file-manager__list">
			<li v-for="file in files"
				:key="file.id || file.name"
				class="cn-file-manager__item"
				:data-file-id="file.id || file.name"
				@click="onFileClick(file)">
				<span class="cn-file-manager__item-icon">{{ iconFor(file) }}</span>
				<div class="cn-file-manager__item-meta">
					<span class="cn-file-manager__item-name">{{ file.name }}</span>
					<small class="cn-file-manager__item-sub">
						{{ humanSize(file.size) }}
						<template v-if="file.uploadedAt"> · {{ formatTimestamp(file.uploadedAt) }}</template>
						<template v-if="file.uploadedBy"> · {{ file.uploadedBy }}</template>
					</small>
				</div>
				<div class="cn-file-manager__item-actions" @click.stop>
					<!-- @slot item-actions Per-file actions. Scope:
					     { file }. Default renders Download / Delete
					     buttons emitting @download / @delete. -->
					<slot name="item-actions" :file="file">
						<button v-if="file.url || file.downloadHandler"
							type="button"
							class="cn-file-manager__action"
							:title="downloadLabel"
							@click.stop="onDownload(file)">{{ downloadLabel }}</button>
						<button v-if="!readOnly"
							type="button"
							class="cn-file-manager__action cn-file-manager__action--delete"
							:title="deleteLabel"
							:disabled="deletingIds[file.id || file.name]"
							@click.stop="onDelete(file)">{{ deleteLabel }}</button>
					</slot>
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
/**
 * CnFileManager — File list widget with drag-drop upload, per-file
 * actions, and a click-emit for preview / detail.
 *
 * The component does NOT own a network layer — consumers wire the
 * uploads and downloads via the `@upload`, `@download`, `@delete`
 * events. The widget owns the dropzone UI, the per-file row
 * rendering, the icon-by-extension mapping, and the human-readable
 * size + timestamp formatting.
 *
 * For OpenRegister-backed file attachments, the consuming app
 * typically converts the OR `_files` array into the `files[]` prop
 * shape and persists the deletes / uploads back via the usual
 * object-store calls.
 *
 * ```vue
 * <CnFileManager
 *   title="Attachments"
 *   :files="attachments"
 *   accept=".pdf,.png,.jpg"
 *   :multiple="true"
 *   :max-size-mb="20"
 *   @upload="onUpload"
 *   @download="onDownload"
 *   @delete="onDelete"
 *   @file-click="openPreview" />
 * ```
 */
export default {
	name: 'CnFileManager',
	props: {
		/**
		 * Files to render. Each entry:
		 * `{ id?, name, size?, type?, url?, uploadedAt?, uploadedBy? }`.
		 *
		 * @type {Array<object>}
		 */
		files: { type: Array, default: () => [] },
		/** Optional widget title. */
		title: { type: String, default: '' },
		/** Optional description. */
		description: { type: String, default: '' },
		/** Hide the dropzone + delete actions. */
		readOnly: { type: Boolean, default: false },
		/** `accept` attribute for the file input. */
		accept: { type: String, default: '' },
		/** Allow multi-file selection. */
		multiple: { type: Boolean, default: true },
		/** Per-file max size in megabytes. 0 disables. */
		maxSizeMb: { type: Number, default: 0 },
		/** Dropzone primary label. */
		dropzoneLabel: { type: String, default: 'Drop files here or click to browse' },
		/** Dropzone secondary hint. */
		dropzoneHint: { type: String, default: '' },
		/** Empty-state text when files[] is empty. */
		emptyLabel: { type: String, default: 'No files attached.' },
		/** Download button label / title. */
		downloadLabel: { type: String, default: 'Download' },
		/** Delete button label / title. */
		deleteLabel: { type: String, default: 'Delete' },
	},
	data() {
		return {
			isDragging: false,
			deletingIds: {},
		}
	},
	methods: {
		/**
		 * Pick the emoji-icon for a file based on extension /
		 * MIME type. Pure presentation; consumers can override
		 * via the `#item-actions` slot if they want full icons.
		 *
		 * @param {object} file The file entry.
		 * @return {string} The icon character.
		 */
		iconFor(file) {
			const ext = (file.name || '').split('.').pop().toLowerCase()
			const type = (file.type || '').toLowerCase()
			if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️'
			if (type.startsWith('video/') || ['mp4', 'mov', 'avi', 'webm'].includes(ext)) return '🎬'
			if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(ext)) return '🎵'
			if (['pdf'].includes(ext)) return '📕'
			if (['doc', 'docx', 'odt', 'txt', 'md'].includes(ext)) return '📄'
			if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return '📊'
			if (['ppt', 'pptx', 'odp'].includes(ext)) return '📈'
			if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️'
			if (['xml', 'json', 'yml', 'yaml'].includes(ext)) return '🧾'
			return '📎'
		},
		/**
		 * Format a byte count as a short human-readable string.
		 *
		 * @param {number} bytes Size in bytes.
		 * @return {string} Like '1.2 MB'.
		 */
		humanSize(bytes) {
			if (bytes === undefined || bytes === null) return ''
			if (bytes < 1024) return `${bytes} B`
			if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
			return `${(bytes / 1024 / 1024).toFixed(1)} MB`
		},
		/**
		 * Format an ISO timestamp as a short locale string.
		 *
		 * @param {string} iso ISO datetime.
		 * @return {string} Locale-formatted timestamp.
		 */
		formatTimestamp(iso) {
			try {
				const d = new Date(iso)
				if (Number.isNaN(d.getTime())) return iso
				return d.toLocaleString()
			} catch (e) {
				return iso
			}
		},
		/**
		 * Programmatic open of the file picker. Useful from a
		 * parent button.
		 *
		 * @return {void}
		 */
		openFilePicker() {
			if (this.readOnly) return
			if (this.$refs.fileInput) this.$refs.fileInput.click()
		},
		/**
		 * Dropzone dragover handler.
		 *
		 * @return {void}
		 */
		onDragOver() {
			if (this.readOnly) return
			this.isDragging = true
		},
		/**
		 * Dropzone dragleave handler.
		 *
		 * @return {void}
		 */
		onDragLeave() {
			this.isDragging = false
		},
		/**
		 * Dropzone drop handler — extracts files + validates size +
		 * emits @upload.
		 *
		 * @param {DragEvent} event The drop event.
		 * @return {void}
		 */
		onDrop(event) {
			this.isDragging = false
			if (this.readOnly) return
			const list = event.dataTransfer ? Array.from(event.dataTransfer.files || []) : []
			this.emitUpload(list)
		},
		/**
		 * File-input change handler.
		 *
		 * @param {Event} event The change event.
		 * @return {void}
		 */
		onFileInputChange(event) {
			const list = Array.from(event.target.files || [])
			this.emitUpload(list)
			event.target.value = ''
		},
		/**
		 * Validate + emit `@upload` with the file batch.
		 *
		 * @param {File[]} list The selected files.
		 * @return {void}
		 */
		emitUpload(list) {
			if (list.length === 0) return
			if (this.maxSizeMb > 0) {
				const limit = this.maxSizeMb * 1024 * 1024
				const oversized = list.find((f) => f.size > limit)
				if (oversized) {
					/**
					 * @event upload-rejected Emitted when one or more
					 *   files in the batch exceed maxSizeMb.
					 * @type {{ reason: 'size', file: File, limitMb: number }}
					 */
					this.$emit('upload-rejected', { reason: 'size', file: oversized, limitMb: this.maxSizeMb })
					return
				}
			}
			/**
			 * @event upload Emitted with the file batch from the
			 *   dropzone or file picker.
			 * @type {File[]}
			 */
			this.$emit('upload', list)
		},
		/**
		 * Forward a file-row click.
		 *
		 * @param {object} file The file entry.
		 * @return {void}
		 */
		onFileClick(file) {
			/**
			 * @event file-click Emitted on row click (not on the
			 *   action buttons).
			 * @type {object}
			 */
			this.$emit('file-click', file)
		},
		/**
		 * Forward a download action.
		 *
		 * @param {object} file The file entry.
		 * @return {void}
		 */
		onDownload(file) {
			/**
			 * @event download Emitted when the Download button is
			 *   clicked.
			 * @type {object}
			 */
			this.$emit('download', file)
		},
		/**
		 * Forward a delete action; sets the in-flight flag so the
		 * button disables until the parent removes the file or
		 * clears it via `setDeleted`.
		 *
		 * @param {object} file The file entry.
		 * @return {void}
		 */
		onDelete(file) {
			const id = file.id || file.name
			this.deletingIds = { ...this.deletingIds, [id]: true }
			/**
			 * @event delete Emitted when the Delete button is
			 *   clicked. Parent persists then removes from files[].
			 * @type {object}
			 */
			this.$emit('delete', file)
		},
		/**
		 * Public method — clear the in-flight delete marker for a
		 * file id. Use when the parent's persist fails so the
		 * Delete button becomes clickable again.
		 *
		 * @param {string} id File id.
		 * @return {void}
		 */
		clearDeleting(id) {
			const next = { ...this.deletingIds }
			delete next[id]
			this.deletingIds = next
		},
	},
}
</script>

<style scoped>
.cn-file-manager {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-file-manager__title {
	margin: 0;
	font-size: 1.1em;
}

.cn-file-manager__description {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}

.cn-file-manager__dropzone {
	border: 2px dashed var(--color-border);
	border-radius: var(--border-radius);
	padding: 24px;
	text-align: center;
	background: var(--color-background-hover);
	cursor: pointer;
	transition: background 0.15s ease, border-color 0.15s ease;
}

.cn-file-manager__dropzone:hover,
.cn-file-manager__dropzone--active {
	background: var(--color-primary-element-light);
	border-color: var(--color-primary-element);
}

.cn-file-manager__dropzone p {
	margin: 0;
}

.cn-file-manager__dropzone small {
	display: block;
	margin-top: 4px;
	color: var(--color-text-maxcontrast);
}

.cn-file-manager__file-input {
	display: none;
}

.cn-file-manager__empty {
	color: var(--color-text-maxcontrast);
	font-style: italic;
	margin: 16px 0;
	text-align: center;
}

.cn-file-manager__list {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-file-manager__item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 12px;
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
	cursor: pointer;
}

.cn-file-manager__item:hover {
	background: var(--color-background-darker, var(--color-background-hover));
}

.cn-file-manager__item-icon {
	font-size: 1.4em;
}

.cn-file-manager__item-meta {
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-file-manager__item-name {
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-file-manager__item-sub {
	color: var(--color-text-maxcontrast);
}

.cn-file-manager__item-actions {
	display: flex;
	gap: 4px;
}

.cn-file-manager__action {
	background: none;
	border: 1px solid var(--color-border);
	padding: 4px 8px;
	border-radius: var(--border-radius);
	cursor: pointer;
	font-size: 0.85em;
}

.cn-file-manager__action:hover {
	background: var(--color-main-background);
}

.cn-file-manager__action--delete {
	color: var(--color-error);
}

.cn-file-manager__action:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}
</style>
