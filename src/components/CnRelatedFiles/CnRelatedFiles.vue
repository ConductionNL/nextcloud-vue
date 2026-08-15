<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-related-files" data-testid="cn-related-files">
		<header v-if="title || description || $slots.header" class="cn-related-files__header">
			<!-- @slot header Overrides the default title/description header. Defaults to `<h3>{{ title }}</h3>` + `<p>{{ description }}</p>`. -->
			<slot name="header">
				<h3 v-if="title" class="cn-related-files__title">
					{{ title }}
				</h3>
				<p v-if="description" class="cn-related-files__description">
					{{ description }}
				</p>
			</slot>
		</header>

		<!-- Add row — opens the Nextcloud file picker, plus an optional path fallback field. -->
		<div v-if="!readOnly" class="cn-related-files__add">
			<button type="button"
				class="cn-related-files__add-button"
				data-testid="cn-related-files-add"
				@click="openPicker">
				{{ addLabel }}
			</button>
			<div v-if="pathInput" class="cn-related-files__path-add">
				<input v-model="pathDraft"
					type="text"
					class="cn-related-files__path-field"
					data-testid="cn-related-files-path-input"
					:placeholder="pathPlaceholder"
					@keyup.enter="addFromPath">
				<button type="button"
					class="cn-related-files__path-button"
					data-testid="cn-related-files-path-add"
					:disabled="!pathDraft.trim()"
					@click="addFromPath">
					{{ pathAddLabel }}
				</button>
			</div>
		</div>

		<!-- Empty state. -->
		<p v-if="files.length === 0" class="cn-related-files__empty" data-testid="cn-related-files-empty">
			{{ emptyLabel }}
		</p>

		<!-- Related file list. -->
		<ul v-else class="cn-related-files__list">
			<li v-for="(file, index) in files"
				:key="file.path || file.name || index"
				class="cn-related-files__item"
				:data-file-path="file.path">
				<span class="cn-related-files__item-icon">{{ iconFor(file) }}</span>
				<div class="cn-related-files__item-meta">
					<span class="cn-related-files__item-name">{{ displayName(file) }}</span>
					<small v-if="file.path" class="cn-related-files__item-path">{{ file.path }}</small>
					<small v-if="file.description" class="cn-related-files__item-description">{{ file.description }}</small>
				</div>
				<div class="cn-related-files__item-actions">
					<!-- @slot item-actions Per-row actions. Scope: { file }. Default renders a Remove button emitting @remove. -->
					<!-- @binding {object} file The file ref `{ path, name, description }` for this row. -->
					<slot name="item-actions" :file="file">
						<button v-if="!readOnly"
							type="button"
							class="cn-related-files__action cn-related-files__action--remove"
							:title="removeLabel"
							@click="removeFile(file, index)">
							{{ removeLabel }}
						</button>
					</slot>
				</div>
			</li>
		</ul>
	</div>
</template>

<script>
import { getFilePickerBuilder, FilePickerType } from '@nextcloud/dialogs'

/**
 * CnRelatedFiles — a widget for RELATING existing Nextcloud files to an
 * object, as opposed to uploading new bytes (that is `CnFileManager`'s job).
 *
 * The component manages a list of lightweight references
 * `{ path, name?, description? }` to files that already live in the user's
 * Nextcloud. Files are added through the native Nextcloud file picker
 * (`getFilePickerBuilder` from `@nextcloud/dialogs`) and removed via a
 * per-row button. It is purely presentational + picker-driven — it owns NO
 * network layer and persists nothing; the consuming app reacts to `@add` /
 * `@remove` (or binds `v-model:files` / `:files.sync`) and stores the
 * resulting path list however it likes (e.g. an OpenRegister object property).
 *
 * Each picked path becomes a ref whose `name` is derived from the basename of
 * the path. An optional `path-input` fallback renders a small text field so a
 * path can be typed directly when a picker isn't desirable.
 *
 * ```vue
 * <CnRelatedFiles
 *   title="Related files"
 *   description="Files linked to this project"
 *   :files="project.files"
 *   picker-title="Select project files"
 *   :allow-multiple="true"
 *   @add="onAdd"
 *   @remove="onRemove"
 *   @update:files="project.files = $event" />
 *
 * <!-- or with v-model -->
 * <CnRelatedFiles v-model:files="project.files" />
 * ```
 */
export default {
	name: 'CnRelatedFiles',
	props: {
		/**
		 * Related file references to render. Each entry:
		 * `{ path, name?, description? }`. `name` falls back to the basename
		 * of `path` when omitted.
		 * @type {Array<{path: string, name?: string, description?: string}>}
		 */
		files: { type: Array, default: () => [] },
		/** Optional widget title. */
		title: { type: String, default: '' },
		/** Optional widget description. */
		description: { type: String, default: '' },
		/** Hide the Add control + per-row Remove buttons. */
		readOnly: { type: Boolean, default: false },
		/** Label for the primary "add via picker" button. */
		addLabel: { type: String, default: 'Add files' },
		/** Empty-state text shown when `files[]` is empty. */
		emptyLabel: { type: String, default: 'No related files yet.' },
		/** Allow selecting multiple files in the picker in one pass. */
		allowMultiple: { type: Boolean, default: true },
		/** Title shown at the top of the Nextcloud file picker dialog. */
		pickerTitle: { type: String, default: 'Select files' },
		/** Also render a fallback text field + Add button to relate a file by typing its path. */
		pathInput: { type: Boolean, default: false },
		/** Placeholder for the path fallback field (only when `path-input` is on). */
		pathPlaceholder: { type: String, default: '/path/to/file.pdf' },
		/** Label for the path fallback Add button (only when `path-input` is on). */
		pathAddLabel: { type: String, default: 'Add' },
		/** Per-row Remove button label / title. */
		removeLabel: { type: String, default: 'Remove' },
	},
	emits: ['add', 'remove', 'update:files'],
	data() {
		return {
			pathDraft: '',
		}
	},
	methods: {
		/**
		 * Pick the emoji-icon for a related file based on its extension.
		 * Pure presentation; mirrors CnFileManager's `iconFor` so the two
		 * components read as siblings.
		 *
		 * @param {object} file The file ref.
		 * @return {string} The icon character.
		 */
		iconFor(file) {
			const ext = (file.name || file.path || '').split('.').pop().toLowerCase()
			if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️'
			if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return '🎬'
			if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵'
			if (['pdf'].includes(ext)) return '📕'
			if (['doc', 'docx', 'odt', 'txt', 'md'].includes(ext)) return '📄'
			if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return '📊'
			if (['ppt', 'pptx', 'odp'].includes(ext)) return '📈'
			if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️'
			if (['xml', 'json', 'yml', 'yaml'].includes(ext)) return '🧾'
			return '📎'
		},
		/**
		 * Display name for a row — the explicit `name`, or the basename of
		 * the path when `name` is absent.
		 *
		 * @param {object} file The file ref.
		 * @return {string} The display name.
		 */
		displayName(file) {
			return file.name || this.basename(file.path)
		},
		/**
		 * Extract the basename (last path segment) from a full path.
		 *
		 * @param {string} path The full file path.
		 * @return {string} The basename, or the original string when it has no separators.
		 */
		basename(path) {
			const clean = String(path || '')
			return clean.split('/').filter(Boolean).pop() || clean
		},
		/**
		 * Build a `{ path, name }` ref from a picked / typed path, deriving
		 * `name` from the basename.
		 *
		 * @param {string} path The file path.
		 * @return {{path: string, name: string}} The file ref.
		 */
		toRef(path) {
			const clean = String(path || '')
			return { path: clean, name: this.basename(clean) }
		},
		/**
		 * Open the native Nextcloud file picker (choose-existing, no
		 * directories) and relate the picked file(s). Consumers persist —
		 * this only emits. A user cancellation (which rejects the pick
		 * promise in some `@nextcloud/dialogs` versions) is swallowed.
		 *
		 * @return {Promise<void>}
		 */
		async openPicker() {
			if (this.readOnly) return
			try {
				const picker = getFilePickerBuilder(this.pickerTitle)
					.setMultiSelect(this.allowMultiple)
					.setMimeTypeFilter([])
					.setModal(true)
					.setType(FilePickerType.Choose)
					.allowDirectories(false)
					.build()
				const picked = await picker.pick()
				if (!picked) return
				const paths = Array.isArray(picked) ? picked : [picked]
				const refs = paths.filter(Boolean).map((p) => this.toRef(p))
				if (refs.length) this.addRefs(refs)
			} catch (e) {
				// User-cancellation rejects the promise in some dialog versions —
				// treat any dismissal as a no-op rather than surfacing an error.
				// eslint-disable-next-line no-console
				console.debug('[CnRelatedFiles] file picker closed', e)
			}
		},
		/**
		 * Relate a file typed into the path fallback field, then clear it.
		 *
		 * @return {void}
		 */
		addFromPath() {
			const value = this.pathDraft.trim()
			if (!value) return
			this.addRefs([this.toRef(value)])
			this.pathDraft = ''
		},
		/**
		 * Append new refs to the list and emit both the granular `@add`
		 * event and the `@update:files` model event.
		 *
		 * @param {Array<{path: string, name: string}>} refs The refs to add.
		 * @return {void}
		 */
		addRefs(refs) {
			const next = [...this.files, ...refs]
			/**
			 * @event add Emitted when file(s) are related via the picker or the path field.
			 *   Payload is a single ref when one file was added, otherwise an array of refs.
			 * @type {{path: string, name: string} | Array<{path: string, name: string}>}
			 */
			this.$emit('add', refs.length === 1 ? refs[0] : refs)
			/**
			 * @event update:files Emitted with the full new file list, enabling v-model:files / :files.sync.
			 * @type {Array<{path: string, name?: string, description?: string}>}
			 */
			this.$emit('update:files', next)
		},
		/**
		 * Remove a related file by index and emit both `@remove` and
		 * `@update:files`.
		 *
		 * @param {object} file The removed ref.
		 * @param {number} index Its index in `files[]`.
		 * @return {void}
		 */
		removeFile(file, index) {
			if (this.readOnly) return
			const next = this.files.filter((_, i) => i !== index)
			/**
			 * @event remove Emitted when a row's Remove button is clicked.
			 * @type {{path: string, name?: string, description?: string}}
			 */
			this.$emit('remove', file)
			// Also emit the model event so v-model:files / :files.sync stay in sync on removal.
			this.$emit('update:files', next)
		},
	},
}
</script>

<style scoped>
.cn-related-files {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-related-files__title {
	margin: 0;
	font-size: 1.1em;
}

.cn-related-files__description {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}

.cn-related-files__add {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.cn-related-files__add-button {
	background: var(--color-primary-element);
	color: var(--color-primary-element-text);
	border: none;
	padding: 6px 14px;
	border-radius: var(--border-radius);
	cursor: pointer;
	font-size: 0.9em;
}

.cn-related-files__add-button:hover {
	background: var(--color-primary-element-hover);
}

.cn-related-files__path-add {
	display: flex;
	align-items: center;
	gap: 4px;
	flex: 1 1 auto;
	min-width: 0;
}

.cn-related-files__path-field {
	flex: 1 1 auto;
	min-width: 0;
	padding: 5px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
}

.cn-related-files__path-button {
	background: none;
	border: 1px solid var(--color-border);
	padding: 5px 10px;
	border-radius: var(--border-radius);
	cursor: pointer;
	font-size: 0.85em;
}

.cn-related-files__path-button:hover {
	background: var(--color-background-hover);
}

.cn-related-files__path-button:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

.cn-related-files__empty {
	color: var(--color-text-maxcontrast);
	font-style: italic;
	margin: 16px 0;
	text-align: center;
}

.cn-related-files__list {
	margin: 0;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-related-files__item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 12px;
	border-radius: var(--border-radius);
	background: var(--color-background-hover);
}

.cn-related-files__item:hover {
	background: var(--color-background-darker, var(--color-background-hover));
}

.cn-related-files__item-icon {
	font-size: 1.4em;
}

.cn-related-files__item-meta {
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.cn-related-files__item-name {
	font-weight: 500;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-related-files__item-path,
.cn-related-files__item-description {
	color: var(--color-text-maxcontrast);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-related-files__item-actions {
	display: flex;
	gap: 4px;
}

.cn-related-files__action {
	background: none;
	border: 1px solid var(--color-border);
	padding: 4px 8px;
	border-radius: var(--border-radius);
	cursor: pointer;
	font-size: 0.85em;
}

.cn-related-files__action:hover {
	background: var(--color-main-background);
}

.cn-related-files__action--remove {
	color: var(--color-error);
}
</style>
