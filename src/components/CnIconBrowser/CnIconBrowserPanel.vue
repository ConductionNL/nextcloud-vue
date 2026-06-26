<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-icon-browser-panel">
		<!-- Selected-icon preview -->
		<div class="cn-icon-browser-panel__preview">
			<span class="cn-icon-browser-panel__preview-icon">
				<img
					v-if="isUrlValue"
					class="cn-icon-browser-panel__preview-img"
					:src="value"
					:alt="t('nextcloud-vue', 'Icon preview')">
				<component
					:is="selectedEntry.component"
					v-else-if="selectedEntry && selectedEntry.component"
					:size="24" />
				<svg
					v-else-if="currentPath"
					class="cn-icon-browser-panel__preview-svg"
					viewBox="0 0 24 24">
					<path :d="currentPath" />
				</svg>
			</span>
			<span class="cn-icon-browser-panel__preview-label">{{ selectedLabel || t('nextcloud-vue', 'No icon selected') }}</span>
		</div>

		<!-- Mode tabs (only when a Custom source exists) -->
		<div v-if="hasCustomTab" class="cn-icon-browser-panel__tabs">
			<button
				type="button"
				class="cn-icon-browser-panel__tab"
				:class="{ 'cn-icon-browser-panel__tab--active': mode === 'icons' }"
				@click="mode = 'icons'">
				{{ t('nextcloud-vue', 'Icons') }}
			</button>
			<button
				type="button"
				class="cn-icon-browser-panel__tab"
				:class="{ 'cn-icon-browser-panel__tab--active': mode === 'custom' }"
				@click="mode = 'custom'">
				{{ t('nextcloud-vue', 'Custom') }}
			</button>
		</div>

		<!-- Icons grid -->
		<div v-show="mode === 'icons'" class="cn-icon-browser-panel__icons">
			<input
				v-model="query"
				type="search"
				class="cn-icon-browser-panel__search"
				:placeholder="t('nextcloud-vue', 'Search icons…')"
				:aria-label="t('nextcloud-vue', 'Search icons')">

			<div v-if="visibleIcons.length > 0" class="cn-icon-browser-panel__grid">
				<button
					v-for="icon in visibleIcons"
					:key="icon.key"
					type="button"
					class="cn-icon-browser-panel__cell"
					:class="{ 'cn-icon-browser-panel__cell--active': icon.value === value }"
					:title="icon.label"
					:aria-label="icon.label"
					@click="selectIcon(icon)">
					<component
						:is="icon.component"
						v-if="icon.component"
						class="cn-icon-browser-panel__cell-component"
						:size="24" />
					<svg v-else class="cn-icon-browser-panel__cell-svg" viewBox="0 0 24 24">
						<path :d="icon.path" />
					</svg>
					<span v-if="showLabels" class="cn-icon-browser-panel__cell-label">{{ icon.label }}</span>
				</button>
			</div>
			<!-- @slot empty Shown when no icons match the search query. -->
			<slot v-else name="empty">
				<p class="cn-icon-browser-panel__empty">
					{{ emptyMessage }}
				</p>
			</slot>

			<p v-if="truncated" class="cn-icon-browser-panel__hint">
				{{ t('nextcloud-vue', 'Showing {shown} of {total} — refine your search to narrow results.', { shown: visibleIcons.length, total: matchCount }) }}
			</p>
		</div>

		<!-- Custom: free URL input + curated URL icons + upload -->
		<div v-show="mode === 'custom'" class="cn-icon-browser-panel__custom">
			<input
				v-if="allowUrl"
				:value="urlDraft"
				type="url"
				class="cn-icon-browser-panel__url-input"
				:placeholder="t('nextcloud-vue', 'Image URL (https://… or /path)')"
				:aria-label="t('nextcloud-vue', 'Image URL')"
				@input="onUrlInput">

			<div v-if="urlIcons.length > 0" class="cn-icon-browser-panel__grid">
				<button
					v-for="icon in urlIcons"
					:key="icon.url"
					type="button"
					class="cn-icon-browser-panel__cell"
					:class="{ 'cn-icon-browser-panel__cell--active': icon.url === value }"
					:title="icon.label"
					:aria-label="icon.label"
					@click="selectUrl(icon.url)">
					<img class="cn-icon-browser-panel__cell-img" :src="icon.url" :alt="icon.label">
					<span v-if="showLabels" class="cn-icon-browser-panel__cell-label">{{ icon.label }}</span>
				</button>
			</div>

			<label v-if="canUpload" class="cn-icon-browser-panel__upload-label">
				<input
					ref="fileInput"
					type="file"
					accept="image/*"
					class="cn-icon-browser-panel__file-input"
					:disabled="uploading"
					@change="handleFileSelect">
				<span class="cn-icon-browser-panel__upload-button">
					<span v-if="uploading">{{ t('nextcloud-vue', 'Uploading…') }}</span>
					<span v-else>{{ t('nextcloud-vue', 'Upload icon') }}</span>
				</span>
			</label>

			<p
				v-if="uploadError"
				class="cn-icon-browser-panel__error"
				role="alert">
				{{ uploadError }}
			</p>
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { findIconByValue } from './iconCatalogue.js'
import { fuzzyFilter } from './fuzzy.js'
import { isCustomIconUrl } from '../CnIconPicker/dashboardIcons.js'

/**
 * CnIconBrowserPanel — the always-open picker panel used by
 * {@link CnIconBrowser} (rendered inline, or inside the popover). Private to the
 * CnIconBrowser directory; not a public export. Owns the search/grid/custom-tab
 * UI and state; the parent owns the catalogue resolution, label, and popover.
 *
 * Emits `input` for every value change (including URL typing) and `pick` for a
 * discrete selection (icon, curated URL icon, or completed upload) so the parent
 * can close the popover on a pick but stay open while a URL is typed.
 */
export default {
	name: 'CnIconBrowserPanel',

	props: {
		/**
		 * Current selection — the catalogue's emitted value, a URL, or null.
		 *
		 * @type {string|null}
		 */
		value: {
			type: String,
			default: null,
		},
		/**
		 * The resolved catalogue to browse: `[{ key, label, value, search?, path?, component? }]`.
		 *
		 * @type {Array<object>}
		 */
		icons: {
			type: Array,
			default: () => [],
		},
		/**
		 * Curated image-URL icons for the Custom tab: `[{ label, url }]`.
		 *
		 * @type {Array<{ label: string, url: string }>}
		 */
		urlIcons: {
			type: Array,
			default: () => [],
		},
		/**
		 * Injected upload transport: `async (dataUrl) => ({ url })`. When null,
		 * the upload control is hidden.
		 *
		 * @type {Function|null}
		 */
		uploadFn: {
			type: Function,
			default: null,
		},
		/**
		 * Maximum number of icon cells rendered in the grid at once.
		 *
		 * @type {number}
		 */
		maxResults: {
			type: Number,
			default: 150,
		},
		/**
		 * Catalogue `key`s to show when the search box is empty.
		 *
		 * @type {string[]}
		 */
		defaultIcons: {
			type: Array,
			default: () => [],
		},
		/**
		 * Show the human-readable label under each icon cell.
		 *
		 * @type {boolean}
		 */
		showLabels: {
			type: Boolean,
			default: false,
		},
		/**
		 * Offer a free-text image-URL input on the Custom tab.
		 *
		 * @type {boolean}
		 */
		allowUrl: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['input', 'pick'],

	data() {
		return {
			query: '',
			debouncedQuery: '',
			mode: 'icons',
			uploading: false,
			uploadError: '',
			debounceTimer: null,
			urlDraft: isCustomIconUrl(this.value) ? this.value : '',
		}
	},

	computed: {
		/**
		 * Whether the upload control is shown (only when an uploadFn is given).
		 *
		 * @return {boolean} true when uploads are enabled.
		 */
		canUpload() {
			return typeof this.uploadFn === 'function'
		},
		/**
		 * Whether the Custom tab is offered (URL input, curated URL icons, or
		 * upload available).
		 *
		 * @return {boolean} true when a custom icon source is available.
		 */
		hasCustomTab() {
			return this.allowUrl || this.urlIcons.length > 0 || this.canUpload
		},
		/**
		 * Whether the current value is a URL (render as `<img>`).
		 *
		 * @return {boolean} true for URL values.
		 */
		isUrlValue() {
			return isCustomIconUrl(this.value)
		},
		/**
		 * The catalogue entry matching the current value (for preview/highlight).
		 *
		 * @return {object|null} the matching entry, or null.
		 */
		selectedEntry() {
			return findIconByValue(this.icons, this.value)
		},
		/**
		 * The SVG path to preview when the value is a bare path string not backed
		 * by a catalogue component.
		 *
		 * @return {string|null} the path string, or null.
		 */
		currentPath() {
			if (!this.value || this.isUrlValue) {
				return null
			}
			if (this.selectedEntry) {
				return this.selectedEntry.path || null
			}
			return /^[Mm][\d\s.,-]/.test(this.value) ? this.value : null
		},
		/**
		 * Human label for the current selection.
		 *
		 * @return {string} a display label, or '' when nothing is selected.
		 */
		selectedLabel() {
			if (!this.value) {
				return ''
			}
			if (this.isUrlValue) {
				const match = this.urlIcons.find((icon) => icon.url === this.value)
				return match ? match.label : this.value
			}
			return this.selectedEntry ? this.selectedEntry.label : t('nextcloud-vue', 'Custom icon')
		},
		/**
		 * The catalogue filtered by the debounced search query (or the default
		 * set when the query is empty). Not yet capped.
		 *
		 * @return {Array<object>} matching catalogue entries.
		 */
		matchedIcons() {
			const q = this.debouncedQuery.trim()
			if (!q) {
				if (this.defaultIcons.length > 0) {
					return this.icons.filter((icon) => this.defaultIcons.includes(icon.key))
				}
				return this.icons
			}
			return fuzzyFilter(this.icons, q)
		},
		/**
		 * Total number of icons matching the current query (before capping).
		 *
		 * @return {number} the match count.
		 */
		matchCount() {
			return this.matchedIcons.length
		},
		/**
		 * The capped slice of matches actually rendered in the grid.
		 *
		 * @return {Array<object>} at most `maxResults` catalogue entries.
		 */
		visibleIcons() {
			return this.matchedIcons.slice(0, this.maxResults)
		},
		/**
		 * Whether the match set was truncated by the `maxResults` cap.
		 *
		 * @return {boolean} true when more matches exist than are shown.
		 */
		truncated() {
			return this.matchCount > this.visibleIcons.length
		},
		/**
		 * Empty-state message — distinguishes "no catalogue" from "no matches".
		 *
		 * @return {string} the message to show when the grid is empty.
		 */
		emptyMessage() {
			return this.icons.length === 0
				? t('nextcloud-vue', 'No icons available.')
				: t('nextcloud-vue', 'No icons match your search.')
		},
	},

	watch: {
		query(value) {
			clearTimeout(this.debounceTimer)
			this.debounceTimer = setTimeout(() => {
				this.debouncedQuery = value
			}, 150)
		},
		value(v) {
			if (isCustomIconUrl(v)) {
				this.urlDraft = v
			}
		},
	},

	beforeDestroy() {
		clearTimeout(this.debounceTimer)
	},

	methods: {
		t,

		/**
		 * Emit a chosen catalogue icon's value (a discrete pick).
		 *
		 * @param {object} icon the catalogue entry.
		 * @return {void}
		 */
		selectIcon(icon) {
			/**
			 * @event input Emitted with the new icon value (path / name / URL / null).
			 * @type {string|null}
			 */
			this.$emit('input', icon.value)
			/**
			 * @event pick Emitted on a discrete selection so the parent can close
			 * the popover (not fired while typing a URL).
			 */
			this.$emit('pick')
		},

		/**
		 * Emit a chosen custom-icon URL (a discrete pick).
		 *
		 * @param {string} url the icon image URL.
		 * @return {void}
		 */
		selectUrl(url) {
			this.$emit('input', url)
			this.$emit('pick')
		},

		/**
		 * Emit the typed image URL without a `pick` (keeps the popover open).
		 *
		 * @param {Event} event the URL input's input event.
		 * @return {void}
		 */
		onUrlInput(event) {
			this.urlDraft = event.target.value
			this.$emit('input', this.urlDraft || null)
		},

		/**
		 * Read the selected file as a data URL, hand it to `uploadFn`, and emit
		 * the returned URL (a discrete pick) on success.
		 *
		 * @param {Event} event the file-input change event.
		 * @return {void}
		 */
		handleFileSelect(event) {
			const file = event.target.files?.[0]
			if (!file || !this.canUpload) {
				return
			}
			this.uploadError = ''
			this.uploading = true

			const reader = new FileReader()
			reader.onload = async (e) => {
				try {
					const dataUrl = e.target.result
					if (typeof dataUrl !== 'string') {
						throw new Error('FileReader did not return a data URL')
					}
					const response = await this.uploadFn(dataUrl)
					this.$emit('input', response.url)
					this.$emit('pick')
				} catch (err) {
					this.uploadError = (err && err.message) || t('nextcloud-vue', 'Failed to upload icon')
					console.error('Icon upload failed:', err)
				} finally {
					this.uploading = false
					this.resetFileInput()
				}
			}
			reader.onerror = () => {
				this.uploadError = t('nextcloud-vue', 'Failed to upload icon')
				this.uploading = false
				this.resetFileInput()
			}
			reader.readAsDataURL(file)
		},

		/**
		 * Clear the native file input so re-selecting the same file re-fires.
		 *
		 * @return {void}
		 */
		resetFileInput() {
			if (this.$refs.fileInput) {
				this.$refs.fileInput.value = ''
			}
		},
	},
}
</script>

<style scoped>
.cn-icon-browser-panel {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-icon-browser-panel__preview {
	display: flex;
	align-items: center;
	gap: 8px;
}

.cn-icon-browser-panel__preview-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 40px;
	height: 40px;
	border: 1px solid var(--color-border);
	border-radius: 4px;
	background-color: var(--color-background-hover);
}

.cn-icon-browser-panel__preview-img,
.cn-icon-browser-panel__preview-svg {
	width: 24px;
	height: 24px;
}

.cn-icon-browser-panel__preview-svg {
	fill: var(--color-main-text);
}

.cn-icon-browser-panel__preview-label {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cn-icon-browser-panel__tabs {
	display: flex;
	gap: 4px;
	border-bottom: 1px solid var(--color-border);
}

.cn-icon-browser-panel__tab {
	padding: 6px 12px;
	background: transparent;
	border: none;
	border-bottom: 2px solid transparent;
	font: inherit;
	color: var(--color-text-maxcontrast);
	cursor: pointer;
}

.cn-icon-browser-panel__tab--active {
	color: var(--color-main-text);
	border-bottom-color: var(--color-primary-element);
}

.cn-icon-browser-panel__icons,
.cn-icon-browser-panel__custom {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-icon-browser-panel__search,
.cn-icon-browser-panel__url-input {
	width: 100%;
	padding: 6px 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius, 4px);
	font-size: 14px;
}

.cn-icon-browser-panel__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
	gap: 4px;
	max-height: 260px;
	overflow-y: auto;
}

.cn-icon-browser-panel__cell {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 2px;
	padding: 6px;
	background: transparent;
	border: 1px solid transparent;
	border-radius: 4px;
	cursor: pointer;
	color: var(--color-main-text);
}

.cn-icon-browser-panel__cell:hover {
	background-color: var(--color-background-hover);
}

.cn-icon-browser-panel__cell--active {
	border-color: var(--color-primary-element);
	background-color: var(--color-primary-element-light);
}

.cn-icon-browser-panel__cell-svg,
.cn-icon-browser-panel__cell-img,
.cn-icon-browser-panel__cell-component {
	width: 24px;
	height: 24px;
	object-fit: contain;
}

.cn-icon-browser-panel__cell-svg {
	fill: var(--color-main-text);
}

.cn-icon-browser-panel__cell-label {
	font-size: 10px;
	text-align: center;
	color: var(--color-text-maxcontrast);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}

.cn-icon-browser-panel__hint,
.cn-icon-browser-panel__empty {
	margin: 0;
	font-size: 12px;
	color: var(--color-text-maxcontrast);
}

.cn-icon-browser-panel__upload-label {
	display: inline-flex;
	cursor: pointer;
}

.cn-icon-browser-panel__file-input {
	display: none;
}

.cn-icon-browser-panel__upload-button {
	padding: 6px 12px;
	border: 1px solid var(--color-border);
	border-radius: 4px;
	background-color: var(--color-background-hover);
	font-size: 14px;
}

.cn-icon-browser-panel__upload-label:hover .cn-icon-browser-panel__upload-button {
	background-color: var(--color-background-dark);
}

.cn-icon-browser-panel__error {
	margin: 0;
	padding: 4px 8px;
	font-size: 12px;
	color: var(--color-error);
	background-color: var(--color-background-hover);
	border-radius: 2px;
}
</style>
