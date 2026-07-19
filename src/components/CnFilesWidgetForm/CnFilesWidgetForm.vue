<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-files-widget-form">
		<NcTextField
			:model-value="folderPath"
			:label="t('nextcloud-vue', 'Folder path')"
			:placeholder="t('nextcloud-vue', 'e.g. /Documents/Marketing')"
			required
			@update:model-value="updateField('folderPath', $event)" />

		<NcTextField
			:model-value="fileIdString"
			:label="t('nextcloud-vue', 'Folder ID (optional, preferred)')"
			:placeholder="t('nextcloud-vue', 'Numeric file id of the folder')"
			@update:model-value="updateFileId" />

		<NcSelect
			:model-value="viewMode"
			:options="viewModeOptions"
			:input-label="t('nextcloud-vue', 'View mode')"
			:reduce="(option) => option.value"
			label="label"
			:clearable="false"
			@input="updateField('viewMode', $event)" />

		<NcSelect
			:model-value="sortBy"
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
			:model-value="mimeTypeFilterString"
			:label="t('nextcloud-vue', 'MIME type filter (comma separated)')"
			:placeholder="t('nextcloud-vue', 'e.g. image/*, application/pdf')"
			@update:model-value="updateMimeFilter" />

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
import { NcTextField, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

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
 * Exposes nine controls — `folderPath`, `fileId`, `viewMode`,
 * `showThumbnails`, `mimeTypeFilter`, `allowUpload`, `allowDelete`, `sortBy`,
 * `sortDescending`. Emits `update:content` with the assembled content blob on
 * every change. `validate()` requires either a non-empty `folderPath` OR a
 * numeric `fileId` so the placement always resolves to a folder at view time.
 */
export default {
	name: 'CnFilesWidgetForm',

	components: {
		NcTextField,
		NcSelect,
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
		/** The numeric `fileId` rendered as a string for the text field. */
		fileIdString() {
			return this.fileId === null || this.fileId === undefined ? '' : String(this.fileId)
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
		 * Coerce + set the `fileId` from the text field, then notify.
		 *
		 * @param {string} value the raw text value.
		 * @return {void}
		 */
		updateFileId(value) {
			this.fileId = this.coerceFileId(value)
			this.$emit('update:content', this.assembledContent)
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
</style>
