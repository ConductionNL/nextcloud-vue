<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-files-widget-form">
		<div class="cn-files-widget-form__folder">
			<span class="cn-files-widget-form__folder-label">{{ t('nextcloud-vue', 'Folder') }}</span>
			<div class="cn-files-widget-form__folder-row">
				<span
					class="cn-files-widget-form__folder-path"
					:class="{ 'cn-files-widget-form__folder-path--disabled': isObjectBound }"
					:title="isObjectBound ? objectBoundNote : (folderPath || '/')">
					{{ isObjectBound ? t('nextcloud-vue', 'Current object') : (folderPath || '/') }}
				</span>
				<NcButton
					type="secondary"
					:disabled="isObjectBound"
					:title="isObjectBound ? objectBoundNote : null"
					@click="openFolderPicker">
					<template #icon>
						<FolderOutline :size="20" />
					</template>
					{{ t('nextcloud-vue', 'Browse…') }}
				</NcButton>
			</div>
			<p v-if="isObjectBound" class="cn-files-widget-form__folder-note">
				{{ objectBoundNote }}
			</p>
		</div>

		<NcSelect
			:value="viewMode"
			:options="viewModeOptions"
			:input-label="t('nextcloud-vue', 'View mode')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('viewMode', $event)" />

		<NcSelect
			:value="sortBy"
			:options="sortByOptions"
			:input-label="t('nextcloud-vue', 'Sort by')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('sortBy', $event)" />

		<label class="cn-files-widget-form__toggle">
			<input
				type="checkbox"
				:checked="sortDescending"
				@change="updateField('sortDescending', $event.target.checked)">
			{{ t('nextcloud-vue', 'Sort descending') }}
		</label>

		<label class="cn-files-widget-form__toggle">
			<input
				type="checkbox"
				:checked="showThumbnails"
				@change="updateField('showThumbnails', $event.target.checked)">
			{{ t('nextcloud-vue', 'Show thumbnails') }}
		</label>

		<NcTextField
			:value="mimeTypeFilterString"
			:label="t('nextcloud-vue', 'MIME type filter (comma separated)')"
			:placeholder="t('nextcloud-vue', 'e.g. image/*, application/pdf')"
			@update:value="updateMimeFilter" />

		<label class="cn-files-widget-form__toggle">
			<input
				type="checkbox"
				:checked="allowUpload"
				@change="updateField('allowUpload', $event.target.checked)">
			{{ t('nextcloud-vue', 'Allow upload') }}
		</label>

		<label class="cn-files-widget-form__toggle">
			<input
				type="checkbox"
				:checked="allowDelete"
				@change="updateField('allowDelete', $event.target.checked)">
			{{ t('nextcloud-vue', 'Allow delete') }}
		</label>
	</div>
</template>

<script>
import { NcTextField, NcSelect, NcButton } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { getFilePickerBuilder, showError, FilePickerClosed } from '@nextcloud/dialogs'
// The native file-picker modal ships its chrome styles here; without this the
// spawned picker renders unstyled. Rules are scoped to the picker/dialog
// classes, so this adds no app-wide restyling.
import '@nextcloud/dialogs/style.css'
import FolderOutline from 'vue-material-design-icons/FolderOutline.vue'

const VIEW_MODES = Object.freeze(['list', 'grid', 'tree'])
const SORT_FIELDS = Object.freeze(['name', 'modified', 'size', 'type'])

const DEFAULT_CONTENT = Object.freeze({
	// Default to the user's root so a freshly-added Files widget shows content
	// immediately (and passes validation) instead of an empty "Folder no longer
	// exists" state. The user can narrow it to any folder.
	folderPath: '/',
	fileId: null,
	viewMode: 'list',
	showThumbnails: true,
	mimeTypeFilter: [],
	allowUpload: false,
	allowDelete: false,
	sortBy: 'name',
	sortDescending: false,
})

/**
 * CnFilesWidgetForm — the `CnAddWidgetModal` sub-form for creating or editing
 * a `files` widget placement (renderer: {@link CnFilesWidget}).
 *
 * The folder is chosen with the native Nextcloud folder picker (a "Browse…"
 * button opens {@link https://www.npmjs.com/package/@nextcloud/dialogs | getFilePickerBuilder}
 * restricted to directories); the pick sets both `folderPath` and the
 * backend-preferred numeric `fileId` from the selected node, so no free-text
 * path/id entry is needed. The remaining controls are `viewMode`,
 * `showThumbnails`, `mimeTypeFilter`, `allowUpload`, `allowDelete`, `sortBy`,
 * and `sortDescending`. Emits `update:content` with the assembled content blob
 * on every change. `validate()` requires either a non-empty `folderPath` OR a
 * numeric `fileId` so the placement always resolves to a folder at view time.
 */
export default {
	name: 'CnFilesWidgetForm',

	components: {
		NcTextField,
		NcSelect,
		NcButton,
		FolderOutline,
	},

	inject: {
		/**
		 * Object context published by the host (CnAddWidgetModal re-provides the
		 * detail page's `{ register, schema }`; CnDetailPage provides it directly).
		 * Non-null with a register+schema means this files widget will render in
		 * object-bound mode — bound to the current object's folder — so the fixed
		 * folder picker below does nothing and is disabled.
		 */
		cnObjectContext: { default: null },
	},

	props: {
		/**
		 * The placement being edited, or `null` in create mode. Pre-fills
		 * every control from `editingWidget.content`.
		 *
		 * @type {{content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},
		/**
		 * Initial content values — used when not editing and the parent
		 * supplies registry defaults.
		 *
		 * @type {object}
		 */
		value: {
			type: Object,
			default: () => ({ ...DEFAULT_CONTENT }),
		},
	},

	emits: [
		/**
		 * Emitted with the assembled content blob on every field change.
		 *
		 * @event update:content
		 * @type {object}
		 */
		'update:content',
	],

	data() {
		const initial = (this.editingWidget && this.editingWidget.content) || this.value || {}
		return {
			folderPath: typeof initial.folderPath === 'string' ? initial.folderPath : DEFAULT_CONTENT.folderPath,
			fileId: this.coerceFileId(initial.fileId),
			viewMode: VIEW_MODES.includes(initial.viewMode) ? initial.viewMode : DEFAULT_CONTENT.viewMode,
			showThumbnails: typeof initial.showThumbnails === 'boolean' ? initial.showThumbnails : DEFAULT_CONTENT.showThumbnails,
			mimeTypeFilter: Array.isArray(initial.mimeTypeFilter) ? initial.mimeTypeFilter.filter((entry) => typeof entry === 'string') : [],
			allowUpload: initial.allowUpload === true,
			allowDelete: initial.allowDelete === true,
			sortBy: SORT_FIELDS.includes(initial.sortBy) ? initial.sortBy : DEFAULT_CONTENT.sortBy,
			sortDescending: initial.sortDescending === true,
		}
	},

	computed: {
		/**
		 * Whether the widget will render in object-bound mode (files scoped to the
		 * current object's folder). True when the injected object context carries a
		 * register + schema — i.e. the widget is on a detail/object page. In that
		 * mode the fixed folder is ignored, so the picker is disabled.
		 *
		 * @return {boolean}
		 */
		isObjectBound() {
			const raw = this.cnObjectContext
			// The context may be a composition-API ref (CnAddWidgetModal provides a
			// computed) or a plain object — unwrap either.
			const ctx = (raw && typeof raw === 'object' && 'value' in raw) ? raw.value : raw
			return !!(ctx && ctx.register && ctx.schema)
		},

		/** Explanatory note shown when the folder picker is disabled (object-bound). */
		objectBoundNote() {
			return t('nextcloud-vue', 'This widget shows files attached to the current object, so the folder cannot be set here.')
		},

		/** The MIME filter list joined for the comma-separated text field. */
		mimeTypeFilterString() {
			return this.mimeTypeFilter.join(', ')
		},

		/** View-mode select options. */
		viewModeOptions() {
			return [
				{ value: 'list', label: t('nextcloud-vue', 'List') },
				{ value: 'grid', label: t('nextcloud-vue', 'Grid') },
				{ value: 'tree', label: t('nextcloud-vue', 'Tree') },
			]
		},

		/** Sort-field select options. */
		sortByOptions() {
			return [
				{ value: 'name', label: t('nextcloud-vue', 'Name') },
				{ value: 'modified', label: t('nextcloud-vue', 'Modified') },
				{ value: 'size', label: t('nextcloud-vue', 'Size') },
				{ value: 'type', label: t('nextcloud-vue', 'Type') },
			]
		},

		/** The full content blob assembled from the current field values. */
		assembledContent() {
			return {
				folderPath: this.folderPath,
				fileId: this.fileId,
				viewMode: this.viewMode,
				showThumbnails: this.showThumbnails,
				mimeTypeFilter: [...this.mimeTypeFilter],
				allowUpload: this.allowUpload,
				allowDelete: this.allowDelete,
				sortBy: this.sortBy,
				sortDescending: this.sortDescending,
			}
		},
	},

	methods: {
		t,

		/**
		 * Coerce an arbitrary value into a positive integer file id or null.
		 *
		 * @param {*} raw the candidate value.
		 * @return {number|null} a positive integer, or `null`.
		 */
		coerceFileId(raw) {
			if (raw === null || raw === undefined || raw === '') {
				return null
			}
			const num = Number(raw)
			if (!Number.isFinite(num) || num <= 0) {
				return null
			}
			return Math.floor(num)
		},

		/**
		 * Set a field and notify the parent via `update:content`.
		 *
		 * @param {string} field one of the nine content keys.
		 * @param {*} value the new value.
		 * @return {void}
		 */
		updateField(field, value) {
			this[field] = value
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Open the native Nextcloud folder picker (directories only) and, on a
		 * pick, set both `folderPath` and the backend-preferred `fileId` from
		 * the chosen node, then notify. A cancel/close rejects the picker
		 * promise and is treated as a no-op.
		 *
		 * @return {Promise<void>}
		 */
		async openFolderPicker() {
			// Object-bound widgets ignore the fixed folder; the button is disabled
			// but guard here too so a programmatic call is a no-op.
			if (this.isObjectBound) {
				return
			}
			const picker = getFilePickerBuilder(t('nextcloud-vue', 'Choose a folder'))
				.setMultiSelect(false)
				.setMimeTypeFilter(['httpd/unix-directory'])
				.allowDirectories(true)
				.startAt(this.folderPath || '/')
				// v6 replacement for the deprecated setType(Choose): the node
				// resolution comes from the picker itself, so the callback is a no-op.
				.addButton({ label: t('nextcloud-vue', 'Choose'), type: 'primary', callback: () => {} })
				.build()
			try {
				const nodes = await picker.pickNodes()
				const node = Array.isArray(nodes) ? nodes[0] : nodes
				if (!node) {
					return
				}
				this.folderPath = node.path
				this.fileId = this.coerceFileId(node.fileid)
				this.$emit('update:content', this.assembledContent)
			} catch (e) {
				if (e instanceof FilePickerClosed) {
					return
				}
				// The lazy picker chunk failed to load, or the dialog threw — the
				// Browse button would otherwise look dead. Log for debugging (ADR-062:
				// never leak a raw stack into the UI) and tell the user quietly.
				// eslint-disable-next-line no-console
				console.warn('[CnFilesWidgetForm] folder picker failed to open:', e)
				showError(t('nextcloud-vue', 'Could not open the folder picker'))
			}
		},

		/**
		 * Parse the comma-separated MIME filter text into a string array.
		 *
		 * @param {string} value the raw comma-separated text.
		 * @return {void}
		 */
		updateMimeFilter(value) {
			const raw = String(value || '')
			this.mimeTypeFilter = raw
				.split(',')
				.map((entry) => entry.trim())
				.filter((entry) => entry !== '')
			this.$emit('update:content', this.assembledContent)
		},

		/**
		 * Validate the form; an empty array means valid. Requires at least
		 * one of `folderPath` or a positive `fileId`.
		 *
		 * @return {string[]} the validation errors.
		 */
		validate() {
			const errors = []
			const hasPath = typeof this.folderPath === 'string' && this.folderPath.trim() !== ''
			const hasFileId = typeof this.fileId === 'number' && this.fileId > 0
			if (!hasPath && !hasFileId) {
				errors.push(t('nextcloud-vue', 'Folder path or folder id is required'))
			}
			return errors
		},
	},
}
</script>

<style scoped>
.cn-files-widget-form {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-files-widget-form__toggle {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
}

.cn-files-widget-form__folder {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-files-widget-form__folder-label {
	font-size: 14px;
	font-weight: 600;
}

.cn-files-widget-form__folder-row {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-files-widget-form__folder-path {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	padding: 8px 12px;
	border: 2px solid var(--color-border-maxcontrast);
	border-radius: var(--border-radius-large);
	background-color: var(--color-main-background);
	color: var(--color-main-text);
}

.cn-files-widget-form__folder-path--disabled {
	color: var(--color-text-maxcontrast);
	font-style: italic;
}

.cn-files-widget-form__folder-note {
	margin: 0;
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}
</style>
