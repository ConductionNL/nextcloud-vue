<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-icon-picker">
		<div class="cn-icon-picker__preview">
			<CnDashboardIcon :name="value" :size="24" :alt="t('nextcloud-vue', 'Icon preview')" />
		</div>

		<div
			class="cn-icon-picker__grid"
			role="listbox"
			:aria-label="t('nextcloud-vue', 'Icon')">
			<button
				v-for="(_, name) in icons"
				:key="name"
				type="button"
				class="cn-icon-picker__icon"
				:class="{ 'cn-icon-picker__icon--selected': name === builtInValue }"
				:title="name"
				:aria-label="name"
				role="option"
				:aria-selected="name === builtInValue"
				:disabled="uploading"
				@click="selectIconName(name)">
				<CnDashboardIcon :name="name" :size="20" :alt="name" />
			</button>
		</div>

		<label v-if="canUpload" class="cn-icon-picker__upload-label">
			<input
				ref="fileInput"
				type="file"
				accept="image/*"
				class="cn-icon-picker__file-input"
				:disabled="uploading"
				@change="handleFileSelect">
			<span class="cn-icon-picker__upload-button">
				<span v-if="uploading">{{ t('nextcloud-vue', 'Uploading…') }}</span>
				<span v-else>{{ t('nextcloud-vue', 'Upload icon') }}</span>
			</span>
		</label>

		<p
			v-if="uploadError"
			class="cn-icon-picker__error"
			role="alert">
			{{ uploadError }}
		</p>
	</div>
</template>

<script>
import CnDashboardIcon from './CnDashboardIcon.vue'
import { DASHBOARD_ICONS, isCustomIconUrl } from './dashboardIcons.js'

/**
 * CnIconPicker — select-plus-upload picker for the dashboard `icon`
 * convention. The built-in `<select>` emits a registry key (e.g. `'Star'`);
 * the optional file-upload reads a data URL, hands it to the injected
 * `uploadFn`, and emits the returned URL. The transport is the consumer's:
 * pass `uploadFn` (e.g. an app's resource upload) — when omitted, the upload UI
 * is hidden so the library carries no upload dependency.
 *
 * Vue 2 v-model: `value` in, `input` out.
 *
 * ```vue
 * <CnIconPicker v-model="icon" :upload-fn="uploadDataUrl" />
 * ```
 */
export default {
	name: 'CnIconPicker',

	components: {
		CnDashboardIcon,
	},

	props: {
		/**
		 * Current icon value — a registry key, a URL, or null (v-model).
		 *
		 * @type {string|null}
		 */
		value: {
			type: String,
			default: null,
		},
		/**
		 * Icon registry to enumerate in the select (name → component). Defaults
		 * to the built-in DASHBOARD_ICONS set.
		 *
		 * @type {object}
		 */
		icons: {
			type: Object,
			default: () => DASHBOARD_ICONS,
		},
		/**
		 * Injected upload transport: `async (dataUrl) => ({ url })`. When null,
		 * the upload control is hidden (no transport dependency in the library).
		 *
		 * @type {Function|null}
		 */
		uploadFn: {
			type: Function,
			default: null,
		},
	},

	emits: ['input'],

	data() {
		return {
			uploadError: '',
			uploading: false,
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
		 * The select's value — only reflects v-model when it holds a registry
		 * key; a custom URL leaves the select on the placeholder.
		 *
		 * @return {string} the registry key, or '' for URL/empty values.
		 */
		builtInValue() {
			if (this.value && !isCustomIconUrl(this.value)) {
				return this.value
			}
			return ''
		},
	},

	methods: {
		/**
		 * Emit the chosen registry key (or null for the placeholder).
		 *
		 * @param {Event} event the select change event.
		 * @return {void}
		 */
		selectIcon(event) {
			const selected = event.target.value
			this.uploadError = ''
			/**
			 * @event input Emitted with the new icon value (registry key, URL,
			 * or null) per the v-model convention.
			 * @type {string|null}
			 */
			this.$emit('input', selected || null)
		},

		/**
		 * Emit the registry key of a clicked icon tile (grid selection).
		 *
		 * @param {string} name the icon registry key.
		 * @return {void}
		 */
		selectIconName(name) {
			this.uploadError = ''
			this.$emit('input', name || null)
		},

		/**
		 * Read the selected file as a data URL and hand it to `uploadFn`,
		 * emitting the returned URL on success.
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
.cn-icon-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-icon-picker__preview {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border: 1px solid var(--color-border);
	border-radius: 4px;
	background-color: var(--color-background-hover);
}

.cn-icon-picker__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
	gap: 6px;
	max-height: 200px;
	overflow-y: auto;
	padding: 4px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius, 4px);
}

.cn-icon-picker__icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	padding: 0;
	border: 2px solid transparent;
	border-radius: var(--border-radius, 4px);
	background: transparent;
	cursor: pointer;
	color: var(--color-main-text);
}

.cn-icon-picker__icon:hover {
	background: var(--color-background-hover);
}

.cn-icon-picker__icon--selected {
	border-color: var(--color-primary-element);
	background: var(--color-primary-element-light, var(--color-background-hover));
}

.cn-icon-picker__upload-label {
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
}

.cn-icon-picker__file-input {
	display: none;
}

.cn-icon-picker__upload-button {
	padding: 6px 12px;
	border: 1px solid var(--color-border);
	border-radius: 4px;
	background-color: var(--color-background-hover);
	font-size: 14px;
	transition: background-color 0.2s;
}

.cn-icon-picker__upload-label:hover .cn-icon-picker__upload-button {
	background-color: var(--color-background-dark);
}

.cn-icon-picker__error {
	margin: 0;
	padding: 4px 8px;
	font-size: 12px;
	color: var(--color-error);
	background-color: var(--color-background-hover);
	border-radius: 2px;
}
</style>
