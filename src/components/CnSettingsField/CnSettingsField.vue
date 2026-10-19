<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-settings-field" :data-testid="`cn-settings-field-${field.key}`">
		<NcCheckboxRadioSwitch
			v-if="kind === 'switch' || kind === 'boolean'"
			:type="kind === 'switch' ? 'switch' : 'checkbox'"
			:modelValue="!!modelValue"
			:disabled="field.readOnly"
			:aria-describedby="describedBy"
			@update:modelValue="emitValue($event)">
			{{ label }}
		</NcCheckboxRadioSwitch>
		<div v-else-if="kind === 'image'"
			class="cn-settings-field__image"
			role="group"
			:aria-labelledby="`${inputId}-label`">
			<!-- `hideLabel` keeps the name for a screen reader only. -->
			<span :id="`${inputId}-label`"
				class="cn-settings-field__image-label"
				:class="{ 'hidden-visually': field.hideLabel === true }">{{ label }}</span>
			<div class="cn-settings-field__image-row">
				<span class="cn-settings-field__image-tile" :data-testid="`cn-settings-field-image-${field.key}`">
					<img v-if="stringValue" :src="stringValue" :alt="t('nextcloud-vue', 'Current {name}', { name: label })">
					<span v-else class="cn-settings-field__image-initials" aria-hidden="true">{{ field.initials || '' }}</span>
				</span>
				<input
					:id="inputId"
					ref="file"
					class="hidden-visually"
					type="file"
					:accept="field.accept || 'image/*'"
					tabindex="-1"
					:aria-labelledby="`${inputId}-label`"
					:aria-describedby="describedBy"
					@change="upload($event.target.files && $event.target.files[0])">
				<NcButton
					v-if="!field.readOnly && field.uploadUrl"
					:disabled="uploading"
					:aria-describedby="describedBy"
					:data-testid="`cn-settings-field-upload-${field.key}`"
					@click="$refs.file && $refs.file.click()">
					<template v-if="uploading" #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ field.uploadLabel || t('nextcloud-vue', 'Upload {name}', { name: label }) }}
				</NcButton>
			</div>
		</div>
		<NcSelect
			v-else-if="kind === 'select'"
			:inputId="inputId"
			:modelValue="selectedOption"
			:options="normalizedOptions"
			:inputLabel="label"
			:placeholder="field.placeholder || ''"
			:loading="optionsLoading"
			:disabled="field.readOnly"
			:clearable="!field.required"
			label="label"
			:aria-describedby="describedBy"
			@update:modelValue="emitValue(optionValue($event))" />
		<NcTextArea
			v-else-if="kind === 'textarea'"
			:id="inputId"
			:label="label"
			:modelValue="stringValue"
			:rows="field.rows || 4"
			:placeholder="field.placeholder || ''"
			:readonly="field.readOnly"
			:error="!!error"
			:aria-describedby="describedBy"
			@update:modelValue="emitValue($event)" />
		<NcTextField
			v-else-if="kind === 'secret'"
			:id="inputId"
			:label="label"
			type="password"
			autocomplete="new-password"
			:modelValue="stringValue"
			:placeholder="field.secretSet ? secretSetPlaceholder : (field.placeholder || '')"
			:readonly="field.readOnly"
			:error="!!error"
			:aria-describedby="describedBy"
			@update:modelValue="emitValue($event)" />
		<NcTextField
			v-else-if="kind === 'number'"
			:id="inputId"
			:label="label"
			type="number"
			:min="field.min"
			:max="field.max"
			:modelValue="stringValue"
			:readonly="field.readOnly"
			:error="!!error"
			:aria-describedby="describedBy"
			@update:modelValue="emitValue($event === '' ? null : Number($event))" />
		<NcTextField
			v-else
			:id="inputId"
			:label="label"
			:type="kind === 'password' ? 'password' : 'text'"
			:modelValue="stringValue"
			:placeholder="field.placeholder || ''"
			:readonly="field.readOnly"
			:error="!!error"
			:aria-describedby="describedBy"
			@update:modelValue="emitValue($event)" />
		<p v-if="shownError"
			:id="`${inputId}-error`"
			class="cn-settings-field__error"
			:data-testid="`cn-settings-field-error-${field.key}`">
			{{ shownError }}
		</p>
		<p v-else-if="hint" :id="`${inputId}-hint`" class="cn-settings-field__hint">
			{{ hint }}
		</p>
	</div>
</template>

<script>
import axios from '@nextcloud/axios'
import { translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcSelect, NcTextArea, NcTextField } from '@nextcloud/vue'
import { buildHeaders, prefixUrl } from '../../utils/headers.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

let fieldUid = 0

/** Field types and the names CnSettingsPage's manifest uses for them. */
const KIND_ALIASES = { enum: 'select', string: 'text' }

/**
 * CnSettingsField - one settings field: the control for its type with its
 * label, and under it an error or a hint. Shared by CnSettingsPage and
 * CnSettingsFieldsSection.
 *
 * Types: `text` (default), `textarea`, `number`, `switch`, `boolean` (a checkbox),
 * `select` (`enum`) with static `options` or options read from `optionsUrl`,
 * `password` (a masked input that shows its value back) and `secret`
 * (replace-only: the input stays empty, and with `secretSet` says a value is
 * stored; the host sends it only when something is typed), and `image` (a
 * preview tile, the initials without an image, and an upload button that
 * posts the file to `uploadUrl` at once and emits `uploaded`).
 *
 * ```vue
 * <CnSettingsField
 *   :field="{ key: 'apiKey', label: 'API key', type: 'secret', secretSet: true }"
 *   v-model="form.apiKey" />
 * ```
 */
export default {
	name: 'CnSettingsField',

	components: { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcSelect, NcTextArea, NcTextField },

	props: {
		/**
		 * The field: `{ key, label, type?, options?, optionsUrl?, optionsPath?,
		 * optionLabel?, optionValue?, placeholder?, rows?, min?, max?, required?,
		 * readOnly?, secretSet? }`. `label` arrives translated.
		 *
		 * @type {object}
		 */
		field: {
			type: Object,
			required: true,
		},

		/**
		 * The value: text, a number, a boolean or a select value. Any type,
		 * because a Boolean in a type list would read an empty string as true.
		 */
		modelValue: {
			type: null,
			default: null,
		},

		/** A validation message, drawn under the control and tied to it. */
		error: {
			type: String,
			default: '',
		},

		/** A hint under the control (not drawn while there is an error). */
		hint: {
			type: String,
			default: '',
		},
	},

	emits: ['update:modelValue', 'uploaded'],

	data() {
		fieldUid += 1
		return {
			uid: fieldUid,
			fetchedOptions: null,
			optionsLoading: false,
			uploading: false,
			uploadError: '',
		}
	},

	computed: {
		/** @return {string} The control kind. */
		kind() {
			const type = String(this.field.type || 'text')
			return KIND_ALIASES[type] || type
		},

		/** @return {string} The label. */
		label() {
			return String(this.field.label || this.field.key || '')
		},

		/** @return {string} The control's id. */
		inputId() {
			return `cn-settings-field-${this.uid}-${String(this.field.key).replace(/[^A-Za-z0-9_-]/g, '-')}`
		},

		/** @return {string} The message shown under the control: an upload failure, else `error`. */
		shownError() {
			return this.uploadError || this.error
		},

		/** @return {string|null} The id of the error or hint the control is described by. */
		describedBy() {
			if (this.shownError) {
				return `${this.inputId}-error`
			}
			return this.hint ? `${this.inputId}-hint` : null
		},

		/** @return {string} The value as text for a text control. */
		stringValue() {
			return this.modelValue === null || this.modelValue === undefined ? '' : String(this.modelValue)
		},

		/** @return {string} The placeholder of a secret that is stored. */
		secretSetPlaceholder() {
			return t('nextcloud-vue', 'Stored. Type a new value to replace it.')
		},

		/**
		 * The select options as `{ label, value }`: the static `options` (strings,
		 * numbers or objects), or those read from `optionsUrl`.
		 *
		 * @return {Array<{label: string, value: (string|number|boolean)}>}
		 */
		normalizedOptions() {
			const raw = Array.isArray(this.field.options) ? this.field.options : (this.fetchedOptions || [])
			return raw.map((option) => (option && typeof option === 'object'
				? { ...option, label: String(option.label ?? option.value ?? ''), value: option.value }
				: { label: String(option), value: option }))
		},

		/** @return {object|null} The option the value selects, for NcSelect. */
		selectedOption() {
			if (this.modelValue === null || this.modelValue === undefined || this.modelValue === '') {
				return null
			}
			return this.normalizedOptions.find((option) => option.value === this.modelValue)
				|| { label: String(this.modelValue), value: this.modelValue }
		},
	},

	watch: {
		'field.optionsUrl': {
			handler() {
				this.loadOptions()
			},

			immediate: true,
		},
	},

	methods: {
		t,

		/**
		 * Upload a chosen image to `uploadUrl` as multipart form data (the
		 * file under `uploadField`, default `image`, plus `uploadParams`), then
		 * take the new image url from the answer at `uploadValuePath` (or a
		 * cache-busted `previewUrl`).
		 *
		 * @param {File|undefined} file The chosen file.
		 * @return {Promise<void>}
		 * @spec openspec/changes/settings-fields-section/specs/settings-fields-section/spec.md#requirement-an-image-field-uploads-at-once
		 */
		async upload(file) {
			if (!file || !this.field.uploadUrl) {
				return
			}
			const form = new FormData()
			for (const [name, value] of Object.entries(this.field.uploadParams || {})) {
				form.append(name, value)
			}
			form.append(this.field.uploadField || 'image', file)
			this.uploading = true
			this.uploadError = ''
			try {
				const response = await axios.post(prefixUrl(this.field.uploadUrl), form)
				const fromAnswer = this.field.uploadValuePath ? readPath(response?.data, this.field.uploadValuePath) : ''
				const next = fromAnswer || (this.field.previewUrl ? `${prefixUrl(this.field.previewUrl)}${this.field.previewUrl.includes('?') ? '&' : '?'}v=${Date.now()}` : '')
				/**
				 * @event uploaded An image was uploaded. Payload: its new url.
				 */
				this.$emit('uploaded', next)
			} catch (error) {
				this.uploadError = t('nextcloud-vue', 'The image could not be uploaded: {reason}', { reason: serverErrorMessage(error) })
			} finally {
				this.uploading = false
				if (this.$refs.file) {
					this.$refs.file.value = ''
				}
			}
		},

		/**
		 * Report a new value.
		 *
		 * @param {unknown} value The value.
		 * @return {void}
		 */
		emitValue(value) {
			/**
			 * @event update:modelValue The value changed. Payload: the new value.
			 */
			this.$emit('update:modelValue', value)
		},

		/**
		 * The storable value of what NcSelect emits.
		 *
		 * @param {object|string|number|null} emitted An option, or null on clear.
		 * @return {string|number|boolean|null}
		 */
		optionValue(emitted) {
			if (emitted === null || emitted === undefined) {
				return null
			}
			return typeof emitted === 'object' && 'value' in emitted ? emitted.value : emitted
		},

		/**
		 * Read a sourced select's options: a list (or the list at
		 * `optionsPath`, or under `results`) mapped through `optionLabel` and
		 * `optionValue` (dotted paths; default `label`/`title`/`name` and `value`/`id`).
		 *
		 * @return {Promise<void>}
		 */
		async loadOptions() {
			const url = this.kind === 'select' && !Array.isArray(this.field.options) ? this.field.optionsUrl : ''
			if (!url) {
				return
			}
			this.optionsLoading = true
			try {
				const response = await fetch(prefixUrl(url), { headers: buildHeaders() })
				if (!response.ok) {
					this.fetchedOptions = []
					return
				}
				const data = await response.json()
				const list = this.field.optionsPath ? readPath(data, this.field.optionsPath) : (Array.isArray(data) ? data : data?.results)
				this.fetchedOptions = (Array.isArray(list) ? list : []).map((item) => {
					if (!item || typeof item !== 'object') {
						return { label: String(item), value: item }
					}
					const value = this.field.optionValue ? readPath(item, this.field.optionValue) : (item.value ?? item.id)
					const label = this.field.optionLabel ? readPath(item, this.field.optionLabel) : (item.label ?? item.title ?? item.name ?? value)
					return { label: String(label ?? ''), value }
				})
			} catch {
				this.fetchedOptions = []
			} finally {
				this.optionsLoading = false
			}
		},
	},
}
</script>

<style scoped>
.cn-settings-field {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.cn-settings-field__hint,
.cn-settings-field__error {
	margin: 0;
	font-size: 13px;
	line-height: 1.4;
}

.cn-settings-field__image {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-settings-field__image-label {
	font-weight: 600;
}

.cn-settings-field__image-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12px;
}

.cn-settings-field__image-tile {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 64px;
	height: 64px;
	overflow: hidden;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	background: var(--color-primary-element-light);
}

.cn-settings-field__image-tile img {
	max-width: 100%;
	max-height: 100%;
	object-fit: contain;
}

.cn-settings-field__image-initials {
	font-size: 20px;
	font-weight: 700;
	color: var(--color-primary-element-light-text, var(--color-primary-element));
}

.cn-settings-field__hint {
	color: var(--color-text-maxcontrast);
}

.cn-settings-field__error {
	color: var(--color-error-text, var(--color-error));
}
</style>
