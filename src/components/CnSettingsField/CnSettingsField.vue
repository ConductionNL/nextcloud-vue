<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<div class="cn-settings-field" :class="`cn-settings-field--${kind}`" :data-testid="`cn-settings-field-${field.key}`">
		<h3 v-if="kind === 'heading'" class="cn-settings-field__heading">
			{{ label }}
		</h3>
		<NcNoteCard
			v-else-if="kind === 'status'"
			:type="statusTone"
			:role="statusTone === 'error' || statusTone === 'warning' ? 'alert' : 'status'"
			:data-testid="`cn-settings-field-status-${field.key}`">
			{{ field.text }}
		</NcNoteCard>
		<div v-else-if="kind === 'note'" class="cn-settings-field__note">
			<span class="cn-settings-field__note-label">{{ label }}</span>
			<p class="cn-settings-field__note-text" :data-testid="`cn-settings-field-note-${field.key}`">
				{{ field.text }}
			</p>
		</div>
		<div v-else-if="kind === 'action'" class="cn-settings-field__action">
			<div class="cn-settings-field__action-row">
				<NcButton v-if="field.href"
					:href="actionHref"
					:target="field.target || undefined"
					:rel="field.target === '_blank' ? 'noopener noreferrer' : undefined"
					:aria-describedby="describedBy"
					:data-testid="`cn-settings-field-action-${field.key}`">
					{{ label }}
				</NcButton>
				<NcButton v-else
					:disabled="field.readOnly || field.actionBusy"
					:aria-describedby="describedBy"
					:data-testid="`cn-settings-field-action-${field.key}`"
					@click="runAction">
					<template v-if="field.actionBusy" #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ label }}
				</NcButton>
			</div>
			<NcNoteCard v-if="field.actionResult"
				:type="field.actionResult.type"
				:role="field.actionResult.type === 'error' ? 'alert' : 'status'"
				:data-testid="`cn-settings-field-action-result-${field.key}`">
				{{ field.actionResult.text }}
			</NcNoteCard>
		</div>
		<fieldset v-else-if="kind === 'radio'"
			class="cn-settings-field__radio"
			:disabled="field.readOnly"
			:aria-describedby="describedBy">
			<legend class="cn-settings-field__radio-legend" :class="{ 'hidden-visually': field.hideLabel === true }">
				{{ label }}
			</legend>
			<template v-for="option in normalizedOptions" :key="String(option.value)">
				<NcCheckboxRadioSwitch
					type="radio"
					:name="inputId"
					:value="String(option.value)"
					:modelValue="modelValue === null || modelValue === undefined ? '' : String(modelValue)"
					:data-testid="`cn-settings-field-option-${field.key}-${option.value}`"
					@update:modelValue="emitValue(option.value)">
					{{ option.label }}
				</NcCheckboxRadioSwitch>
				<p v-if="option.description" class="cn-settings-field__option-description">
					{{ option.description }}
				</p>
			</template>
		</fieldset>
		<fieldset v-else-if="kind === 'checkboxes'"
			class="cn-settings-field__radio"
			:disabled="field.readOnly"
			:aria-describedby="describedBy">
			<legend class="cn-settings-field__radio-legend" :class="{ 'hidden-visually': field.hideLabel === true }">
				{{ label }}
			</legend>
			<template v-for="option in normalizedOptions" :key="String(option.value)">
				<NcCheckboxRadioSwitch
					type="checkbox"
					:modelValue="listValue.some((entry) => String(entry) === String(option.value))"
					:data-testid="`cn-settings-field-option-${field.key}-${option.value}`"
					@update:modelValue="toggleOption(option.value, $event)">
					{{ option.label }}
				</NcCheckboxRadioSwitch>
				<p v-if="option.description" class="cn-settings-field__option-description">
					{{ option.description }}
				</p>
			</template>
		</fieldset>
		<fieldset v-else-if="kind === 'pairs'"
			class="cn-settings-field__pairs"
			:disabled="field.readOnly"
			:aria-describedby="describedBy">
			<legend class="cn-settings-field__radio-legend" :class="{ 'hidden-visually': field.hideLabel === true }">
				{{ label }}
			</legend>
			<div v-for="(row, index) in pairRows"
				:key="index"
				class="cn-settings-field__pair"
				:data-testid="`cn-settings-field-pair-${field.key}`">
				<NcTextField
					:label="pairKeyLabel"
					:modelValue="row.key"
					:maxlength="field.keyMaxLength"
					@update:modelValue="setPair(index, 'key', $event)" />
				<NcSelect v-if="field.valueSource"
					:modelValue="sourceOption(row.value)"
					:options="sourceOptions"
					:inputLabel="pairValueLabel"
					:loading="sourceLoading"
					label="label"
					@update:modelValue="setPair(index, 'value', $event ? $event.value : '')" />
				<NcTextField v-else
					:label="pairValueLabel"
					:type="field.valueType === 'number' ? 'number' : 'text'"
					:modelValue="row.value === null || row.value === undefined ? '' : String(row.value)"
					@update:modelValue="setPair(index, 'value', $event)" />
				<NcButton
					variant="tertiary"
					:ariaLabel="t('nextcloud-vue', 'Remove {name}', { name: row.key || pairKeyLabel })"
					:data-testid="`cn-settings-field-pair-remove-${field.key}`"
					@click="removePair(index)">
					<template #icon>
						<Close :size="20" />
					</template>
				</NcButton>
			</div>
			<p v-if="sourceTruncated"
				class="cn-settings-field__hint"
				:data-testid="`cn-settings-field-pairs-truncated-${field.key}`">
				{{ t('nextcloud-vue', 'Only the first {count} choices are listed.', { count: sourceOptions.length }) }}
			</p>
			<NcButton
				:data-testid="`cn-settings-field-pair-add-${field.key}`"
				@click="addPair">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ field.addLabel || t('nextcloud-vue', 'Add a row') }}
			</NcButton>
		</fieldset>
		<NcCheckboxRadioSwitch
			v-else-if="kind === 'switch' || kind === 'boolean'"
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
			:modelValue="field.multiple ? selectedOptions : selectedOption"
			:options="normalizedOptions"
			:multiple="!!field.multiple"
			:inputLabel="label"
			:placeholder="field.placeholder || ''"
			:loading="optionsLoading"
			:disabled="field.readOnly"
			:clearable="!field.required"
			label="label"
			:aria-describedby="describedBy"
			@update:modelValue="emitValue(field.multiple ? optionValues($event) : optionValue($event))" />
		<NcTextArea
			v-else-if="kind === 'textarea' || kind === 'lines'"
			:id="inputId"
			:label="label"
			:modelValue="stringValue"
			:rows="field.rows || 4"
			:placeholder="field.placeholder || ''"
			:readonly="field.readOnly"
			:error="!!error"
			:aria-describedby="describedBy"
			@update:modelValue="emitValue($event)" />
		<div v-else-if="kind === 'secret'" class="cn-settings-field__secret">
			<NcTextField
				:id="inputId"
				:label="label"
				type="password"
				autocomplete="new-password"
				:modelValue="stringValue"
				:placeholder="field.secretSet ? secretSetPlaceholder : (field.placeholder || '')"
				:readonly="field.readOnly"
				:disabled="field.clearing === true"
				:error="!!error"
				:aria-describedby="describedBy"
				@update:modelValue="emitValue($event)" />
			<NcCheckboxRadioSwitch v-if="field.clearable && field.secretSet"
				type="switch"
				:modelValue="field.clearing === true"
				:disabled="field.readOnly"
				:data-testid="`cn-settings-field-clear-${field.key}`"
				@update:modelValue="onClear">
				{{ field.clearLabel || t('nextcloud-vue', 'Remove the stored value') }}
			</NcCheckboxRadioSwitch>
		</div>
		<fieldset v-else-if="kind === 'week-hours'"
			class="cn-settings-field__week"
			:disabled="field.readOnly"
			:aria-describedby="describedBy">
			<legend class="cn-settings-field__radio-legend" :class="{ 'hidden-visually': field.hideLabel === true }">
				{{ label }}
			</legend>
			<div v-for="day in weekDays"
				:key="day.key"
				class="cn-settings-field__day"
				:data-testid="`cn-settings-field-day-${day.key}`">
				<NcCheckboxRadioSwitch
					type="switch"
					:modelValue="!!weekValue[day.key]"
					:aria-label="t('nextcloud-vue', 'Open on {day}', { day: day.label })"
					@update:modelValue="setDayOpen(day.key, $event)">
					{{ day.label }}
				</NcCheckboxRadioSwitch>
				<template v-if="weekValue[day.key]">
					<NcTextField
						type="time"
						:label="t('nextcloud-vue', 'Opens on {day}', { day: day.label })"
						:modelValue="weekValue[day.key].opens || ''"
						@update:modelValue="setDayTime(day.key, 'opens', $event)" />
					<NcTextField
						type="time"
						:label="t('nextcloud-vue', 'Closes on {day}', { day: day.label })"
						:modelValue="weekValue[day.key].closes || ''"
						@update:modelValue="setDayTime(day.key, 'closes', $event)" />
				</template>
				<span v-else class="cn-settings-field__hint">{{ t('nextcloud-vue', 'Closed') }}</span>
			</div>
		</fieldset>
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
			:type="inputType"
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
import { getDayNames, translate as t } from '@nextcloud/l10n'
import { NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcSelect, NcTextArea, NcTextField } from '@nextcloud/vue'
import Close from 'vue-material-design-icons/Close.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import { buildHeaders, prefixUrl } from '../../utils/headers.js'
import { readPath } from '../../utils/readPath.js'
import { serverErrorMessage } from '../../utils/serverErrorMessage.js'

let fieldUid = 0

/** Field types and the names CnSettingsPage's manifest uses for them. */
const KIND_ALIASES = { enum: 'select', string: 'text', datetime: 'datetime-local', 'date-time': 'datetime-local' }

/** The days of a week, Monday first: the keys a week-hours value uses. */
const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

/** The same keys in the order of getDayNames(), which starts on Sunday. */
const WEEK_DAYS_FROM_SUNDAY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/** The kinds drawn as a text field with their own input type. */
const INPUT_TYPES = ['password', 'date', 'datetime-local', 'email', 'url']

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
 * posts the file to `uploadUrl` at once and emits `uploaded`), `radio` (one
 * choice from `options`, each with an optional `description` under it),
 * `lines` (a textarea, one entry per line), `checkboxes` (several choices
 * from `options`, the value a list; `select` with `multiple` is the same as a
 * multi-select) and `pairs` (key-to-value rows with add and remove, the value
 * a list of `{ key, value }` rows). Three types hold no value of their
 * own: `heading` (a subheading between fields), `status` (a read-only note:
 * the host passes its `text` and `tone`) and `action` (a button that emits
 * `action`; the host passes `actionBusy` and the `actionResult` note).
 * `date`, `datetime-local` (also `datetime`, `date-time`), `email` and `url`
 * are text fields of that input type; the value stays the text the input holds.
 *
 * ```vue
 * <CnSettingsField
 *   :field="{ key: 'apiKey', label: 'API key', type: 'secret', secretSet: true }"
 *   v-model="form.apiKey" />
 * ```
 */
export default {
	name: 'CnSettingsField',

	components: { Close, NcButton, NcCheckboxRadioSwitch, NcLoadingIcon, NcNoteCard, NcSelect, NcTextArea, NcTextField, Plus },

	props: {
		/**
		 * The field: `{ key, label, type?, options?, optionsUrl?, optionsPath?,
		 * optionLabel?, optionValue?, optionDetail?, placeholder?, rows?, min?, max?, required?,
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

	emits: ['update:modelValue', 'uploaded', 'action', 'clear'],

	data() {
		fieldUid += 1
		return {
			uid: fieldUid,
			fetchedOptions: null,
			optionsLoading: false,
			sourceOptions: [],
			sourceLoading: false,
			sourceTruncated: false,
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

		/** @return {string} The input type of a text-like field. */
		inputType() {
			return INPUT_TYPES.includes(this.kind) ? this.kind : 'text'
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

		/** @return {string} A status note's tone: `info`, `success`, `warning` or `error`. */
		statusTone() {
			return ['info', 'success', 'warning', 'error'].includes(this.field.tone) ? this.field.tone : 'info'
		},

		/** @return {string} The value as text for a text control. */
		stringValue() {
			return this.modelValue === null || this.modelValue === undefined ? '' : String(this.modelValue)
		},

		/** @return {Array<{key: string, label: string}>} The days of a week-hours field, Monday first by default. */
		weekDays() {
			const names = getDayNames()
			const days = Array.isArray(this.field.days) && this.field.days.length > 0 ? this.field.days : WEEK_DAYS
			return days.map((key) => ({ key, label: names[WEEK_DAYS_FROM_SUNDAY.indexOf(key)] || key }))
		},

		/** @return {object} A week-hours field's value: day to `{ opens, closes }` or null. */
		weekValue() {
			return this.modelValue && typeof this.modelValue === 'object' && !Array.isArray(this.modelValue) ? this.modelValue : {}
		},

		/** @return {string} An action link's address, with the web root for an app path. */
		actionHref() {
			return prefixUrl(String(this.field.href || ''))
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

		/** @return {Array} The value as a list, for a multi-choice field. */
		listValue() {
			return Array.isArray(this.modelValue) ? this.modelValue : []
		},

		/** @return {Array<object>} The options a multi-select's value selects. */
		selectedOptions() {
			return this.listValue.map((value) => this.normalizedOptions.find((option) => String(option.value) === String(value))
				|| { label: String(value), value })
		},

		/** @return {Array<{key: string, value: unknown}>} A pairs field's rows. */
		pairRows() {
			return Array.isArray(this.modelValue) ? this.modelValue : []
		},

		/** @return {string} The label of a pair's key. */
		pairKeyLabel() {
			return String(this.field.keyLabel || t('nextcloud-vue', 'Key'))
		},

		/** @return {string} The label of a pair's value. */
		pairValueLabel() {
			return String(this.field.valueLabel || t('nextcloud-vue', 'Value'))
		},

		/** @return {object|null} The option the value selects, for NcSelect. */
		selectedOption() {
			if (this.modelValue === null || this.modelValue === undefined || this.modelValue === '') {
				return null
			}
			// A stored value is often text where the options carry numbers (an
			// app config holding an id), so the two are compared as text.
			return this.normalizedOptions.find((option) => option.value === this.modelValue)
				|| this.normalizedOptions.find((option) => String(option.value) === String(this.modelValue))
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

		'field.valueSource': {
			handler() {
				this.loadSourceOptions()
			},

			immediate: true,
		},
	},

	methods: {
		/**
		 * The "remove the stored value" switch of a secret changed.
		 *
		 * @param {boolean} on Whether the stored value is to be removed.
		 * @return {void}
		 */
		onClear(on) {
			/** @event clear The stored secret is to be removed (true) or kept (false). */
			this.$emit('clear', on === true)
		},

		t,

		/** Ask the host to run an `action` field's action. */
		runAction() {
			/** @event action The user pressed an `action` field's button. */
			this.$emit('action')
		},

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
		 * Check or uncheck one choice of a `checkboxes` field; the list keeps
		 * the order of the options.
		 *
		 * @param {string|number} value The option's value.
		 * @param {boolean} checked Whether it is now checked.
		 * @return {void}
		 */
		toggleOption(value, checked) {
			const chosen = new Set(this.listValue.map(String))
			if (checked) {
				chosen.add(String(value))
			} else {
				chosen.delete(String(value))
			}
			this.emitValue(this.normalizedOptions.filter((option) => chosen.has(String(option.value))).map((option) => option.value))
		},

		/**
		 * Change a pair's key or value.
		 *
		 * @param {number} index The row.
		 * @param {string} part `key` or `value`.
		 * @param {string} text What was typed.
		 * @return {void}
		 */
		setPair(index, part, text) {
			const rows = this.pairRows.map((row) => ({ ...row }))
			rows[index] = { ...rows[index], [part]: part === 'value' && this.field.valueType === 'number' && text !== '' ? Number(text) : text }
			this.emitValue(rows)
		},

		/** Add an empty pair. */
		addPair() {
			this.emitValue([...this.pairRows, { key: '', value: '' }])
		},

		/**
		 * Remove a pair.
		 *
		 * @param {number} index The row.
		 * @return {void}
		 */
		removePair(index) {
			this.emitValue(this.pairRows.filter((_row, at) => at !== index))
		},

		/**
		 * The storable values of what a multi-select emits.
		 *
		 * @param {Array|null} emitted The chosen options.
		 * @return {Array}
		 */
		optionValues(emitted) {
			return (Array.isArray(emitted) ? emitted : []).map((option) => this.optionValue(option))
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
		 * Open or close one day of a week-hours field; an opened day takes
		 * `defaultOpens`/`defaultCloses` (08:00 to 17:00).
		 *
		 * @param {string} day The day key.
		 * @param {boolean} open Whether it is open.
		 * @return {void}
		 */
		setDayOpen(day, open) {
			const hours = open ? { opens: this.field.defaultOpens || '08:00', closes: this.field.defaultCloses || '17:00' } : null
			this.emitValue({ ...this.weekValue, [day]: hours })
		},

		/**
		 * Change one time of an open day.
		 *
		 * @param {string} day The day key.
		 * @param {string} part `opens` or `closes`.
		 * @param {string} time The time, `HH:MM`.
		 * @return {void}
		 */
		setDayTime(day, part, time) {
			this.emitValue({ ...this.weekValue, [day]: { ...(this.weekValue[day] || {}), [part]: time } })
		},

		/**
		 * The option a pairs value selects; an id no object answers keeps its id as label.
		 *
		 * @param {unknown} value The stored id.
		 * @return {object|null}
		 */
		sourceOption(value) {
			if (value === null || value === undefined || value === '') {
				return null
			}
			return this.sourceOptions.find((option) => String(option.value) === String(value)) || { label: String(value), value }
		},

		/**
		 * Read the objects a pairs field's values are chosen from:
		 * `valueSource { register, schema, labelField?, valueField?, limit? }`.
		 *
		 * @return {Promise<void>}
		 */
		async loadSourceOptions() {
			const source = this.kind === 'pairs' ? this.field.valueSource : null
			if (!source || !source.register || !source.schema) {
				return
			}
			const limit = Number(source.limit) > 0 ? Number(source.limit) : 1000
			this.sourceLoading = true
			try {
				const url = `/apps/openregister/api/objects/${encodeURIComponent(source.register)}/${encodeURIComponent(source.schema)}?_limit=${limit}`
				const { data } = await axios.get(prefixUrl(url))
				const list = Array.isArray(data?.results) ? data.results : []
				this.sourceOptions = list.filter((item) => item && typeof item === 'object').map((item) => {
					const value = source.valueField ? readPath(item, source.valueField) : (item.id ?? item.uuid ?? item['@self']?.id)
					const label = source.labelField ? readPath(item, source.labelField) : (item.name ?? item.title)
					return { label: String(label || value || ''), value }
				})
				this.sourceTruncated = Number(data?.total) > list.length
			} catch {
				this.sourceOptions = []
				this.sourceTruncated = false
			} finally {
				this.sourceLoading = false
			}
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
					const detail = this.field.optionDetail ? readPath(item, this.field.optionDetail) : ''
					return { label: detail ? `${label ?? ''} (${detail})` : String(label ?? ''), value }
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

/* A note: the field's label, then a line of muted text where a control would
   stand (DqInstellingenAlgemeen "Toegestane websites (CORS)"). */
.cn-settings-field__note {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-settings-field__note-label {
	font-weight: 600;
}

.cn-settings-field__note-text {
	margin: 0;
	color: var(--color-text-maxcontrast);
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

.cn-settings-field__hint,
.cn-settings-field__option-description {
	color: var(--color-text-maxcontrast);
}

.cn-settings-field__heading {
	margin: 8px 0 0;
	font-size: 16px;
	font-weight: 600;
}

.cn-settings-field__radio {
	margin: 0;
	padding: 0;
	border: 0;
}

.cn-settings-field__week {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin: 0;
	padding: 0;
	border: 0;
}

.cn-settings-field__day {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 8px;
}

.cn-settings-field__day > :first-child {
	flex: 0 0 160px;
}

.cn-settings-field__pairs {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
	margin: 0;
	padding: 0;
	border: 0;
}

.cn-settings-field__pair {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: 8px;
	width: 100%;
}

.cn-settings-field__pair > :not(button) {
	flex: 1 1 140px;
	min-width: 0;
}

.cn-settings-field__radio-legend {
	font-weight: 600;
}

.cn-settings-field__option-description {
	margin: 0 0 8px calc(var(--default-grid-baseline, 4px) * 9);
	font-size: 13px;
	line-height: 1.4;
}

.cn-settings-field__action-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12px;
}

.cn-settings-field__error {
	color: var(--color-error-text, var(--color-error));
}
</style>
